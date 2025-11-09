# Esquemas de Base de Datos MongoDB

## Configuración de Base de Datos

**Base de datos:** `proyectos`
**Host:** `localhost:27017`

## Collections

### 1. users

Almacena información de todos los usuarios del sistema (students, teachers, admins).

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  email: "alumno@example.com",
  role: "student",                    // "pending" | "student" | "teacher" | "admin"
  name: "Juan Pérez",
  createdAt: ISODate("2025-01-15T10:00:00Z"),
  updatedAt: ISODate("2025-01-15T10:00:00Z"),
  lastLogin: ISODate("2025-01-15T10:30:00Z"),
  isActive: true
}
```

**Índices:**
```javascript
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ role: 1 })
db.users.createIndex({ isActive: 1 })
```

**Validación:**
```javascript
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "role", "name", "createdAt", "isActive"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          description: "Email válido requerido"
        },
        role: {
          enum: ["pending", "student", "teacher", "admin"],
          description: "Rol debe ser uno de los valores permitidos"
        },
        name: {
          bsonType: "string",
          minLength: 2,
          description: "Nombre es requerido"
        },
        createdAt: {
          bsonType: "date"
        },
        updatedAt: {
          bsonType: "date"
        },
        lastLogin: {
          bsonType: "date"
        },
        isActive: {
          bsonType: "bool"
        }
      }
    }
  }
})
```

---

### 2. projects

Almacena los proyectos enviados por los estudiantes.

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439012"),
  name: "Sistema de Gestión de Biblioteca",
  studentEmail: "alumno@example.com",
  repositoryUrl: "https://github.com/alumno/biblioteca-sistema",
  submissionDate: ISODate("2025-02-01T23:59:59Z"),
  createdAt: ISODate("2025-01-15T11:00:00Z"),
  updatedAt: ISODate("2025-01-20T15:30:00Z"),

  evaluations: {
    videoDemo: {
      score: 8.5,
      comments: "Buena presentación del proyecto. La demo muestra todas las funcionalidades principales. Se podría mejorar explicando mejor la arquitectura.",
      evaluatedBy: "profesor@example.com",
      evaluatedAt: ISODate("2025-02-02T10:00:00Z")
    },
    repository: {
      score: 9.0,
      comments: "Código bien estructurado con buenas prácticas. Documentación completa. Tests unitarios presentes. Sugerencia: añadir más comentarios en funciones complejas.",
      aiPromptUsed: "default-evaluation-v1",
      aiAnalysis: "...",              // Análisis completo de la IA
      evaluatedBy: "profesor@example.com",
      evaluatedAt: ISODate("2025-02-02T10:15:00Z")
    }
  },

  status: "evaluated"                 // "pending" | "submitted" | "evaluated"
}
```

**Índices:**
```javascript
db.projects.createIndex({ studentEmail: 1 })
db.projects.createIndex({ status: 1 })
db.projects.createIndex({ submissionDate: 1 })
db.projects.createIndex({ "evaluations.videoDemo.evaluatedBy": 1 })
db.projects.createIndex({ "evaluations.repository.evaluatedBy": 1 })
```

**Validación:**
```javascript
db.createCollection("projects", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "studentEmail", "repositoryUrl", "submissionDate", "createdAt", "status"],
      properties: {
        name: {
          bsonType: "string",
          minLength: 3,
          description: "Nombre del proyecto requerido"
        },
        studentEmail: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
        },
        repositoryUrl: {
          bsonType: "string",
          pattern: "^https://github\\.com/[a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+$",
          description: "URL de GitHub válida"
        },
        submissionDate: {
          bsonType: "date"
        },
        createdAt: {
          bsonType: "date"
        },
        updatedAt: {
          bsonType: "date"
        },
        status: {
          enum: ["pending", "submitted", "evaluated"],
          description: "Estado del proyecto"
        },
        evaluations: {
          bsonType: "object",
          properties: {
            videoDemo: {
              bsonType: "object",
              properties: {
                score: {
                  bsonType: "double",
                  minimum: 0,
                  maximum: 10
                },
                comments: { bsonType: "string" },
                evaluatedBy: { bsonType: "string" },
                evaluatedAt: { bsonType: "date" }
              }
            },
            repository: {
              bsonType: "object",
              properties: {
                score: {
                  bsonType: "double",
                  minimum: 0,
                  maximum: 10
                },
                comments: { bsonType: "string" },
                aiPromptUsed: { bsonType: "string" },
                aiAnalysis: { bsonType: "string" },
                evaluatedBy: { bsonType: "string" },
                evaluatedAt: { bsonType: "date" }
              }
            }
          }
        }
      }
    }
  }
})
```

---

### 3. magiclinks

Almacena tokens temporales para autenticación sin contraseña.

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439013"),
  email: "alumno@example.com",
  token: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  createdAt: ISODate("2025-01-15T10:00:00Z"),
  expiresAt: ISODate("2025-01-15T10:15:00Z"),   // 15 minutos después
  used: false
}
```

**Índices:**
```javascript
db.magiclinks.createIndex({ token: 1 }, { unique: true })
db.magiclinks.createIndex({ email: 1 })
db.magiclinks.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })  // TTL index
db.magiclinks.createIndex({ used: 1 })
```

**Validación:**
```javascript
db.createCollection("magiclinks", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "token", "createdAt", "expiresAt", "used"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
        },
        token: {
          bsonType: "string",
          minLength: 32,
          description: "Token único de 32+ caracteres"
        },
        createdAt: {
          bsonType: "date"
        },
        expiresAt: {
          bsonType: "date"
        },
        used: {
          bsonType: "bool"
        }
      }
    }
  }
})
```

**Nota:** El índice TTL eliminará automáticamente los documentos cuando `expiresAt` pase.

---

### 4. aiPrompts

Almacena templates de prompts para evaluación con IA.

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439014"),
  name: "Evaluación Estándar de Proyecto",
  prompt: `Analiza el siguiente repositorio de proyecto académico:

**Nombre del proyecto:** {{projectName}}
**Fecha de entrega:** {{submissionDate}}

**README:**
{{readme}}

**Estructura de archivos:**
{{fileStructure}}

**Código principal:**
{{mainCode}}

**Commits recientes:**
{{recentCommits}}

Evalúa los siguientes aspectos:

1. **Calidad del Código** (0-10):
   - Estructura y organización
   - Legibilidad y estilo
   - Buenas prácticas de programación
   - Manejo de errores

2. **Documentación** (0-10):
   - README completo y claro
   - Comentarios en el código
   - Instrucciones de instalación y uso

3. **Funcionalidad** (0-10):
   - Completitud del proyecto
   - Cumplimiento de requisitos
   - Features implementadas

4. **Gestión de Proyecto** (0-10):
   - Historial de commits
   - Uso de Git (ramas, mensajes)
   - Organización del repositorio

Proporciona:
- Puntuación general sugerida (0-10)
- Puntos fuertes del proyecto
- Áreas de mejora
- Comentarios constructivos para el estudiante`,

  isActive: true,
  createdBy: "admin@example.com",
  createdAt: ISODate("2025-01-10T09:00:00Z"),
  updatedAt: ISODate("2025-01-10T09:00:00Z")
}
```

**Índices:**
```javascript
db.aiPrompts.createIndex({ isActive: 1 })
db.aiPrompts.createIndex({ createdBy: 1 })
db.aiPrompts.createIndex({ name: 1 })
```

**Validación:**
```javascript
db.createCollection("aiPrompts", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "prompt", "isActive", "createdBy", "createdAt"],
      properties: {
        name: {
          bsonType: "string",
          minLength: 3,
          description: "Nombre descriptivo del prompt"
        },
        prompt: {
          bsonType: "string",
          minLength: 50,
          description: "Template del prompt"
        },
        isActive: {
          bsonType: "bool"
        },
        createdBy: {
          bsonType: "string"
        },
        createdAt: {
          bsonType: "date"
        },
        updatedAt: {
          bsonType: "date"
        }
      }
    }
  }
})
```

---

## Scripts de Inicialización

### setup.js

Script para crear la base de datos, collections e índices:

```javascript
// Conectar a MongoDB
use proyectos;

// Crear collections con validación
db.createCollection("users", {
  validator: { /* ... */ }
});

db.createCollection("projects", {
  validator: { /* ... */ }
});

db.createCollection("magiclinks", {
  validator: { /* ... */ }
});

db.createCollection("aiPrompts", {
  validator: { /* ... */ }
});

// Crear índices
// users
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ isActive: 1 });

// projects
db.projects.createIndex({ studentEmail: 1 });
db.projects.createIndex({ status: 1 });
db.projects.createIndex({ submissionDate: 1 });
db.projects.createIndex({ "evaluations.videoDemo.evaluatedBy": 1 });
db.projects.createIndex({ "evaluations.repository.evaluatedBy": 1 });

// magiclinks
db.magiclinks.createIndex({ token: 1 }, { unique: true });
db.magiclinks.createIndex({ email: 1 });
db.magiclinks.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
db.magiclinks.createIndex({ used: 1 });

// aiPrompts
db.aiPrompts.createIndex({ isActive: 1 });
db.aiPrompts.createIndex({ createdBy: 1 });
db.aiPrompts.createIndex({ name: 1 });

print("Base de datos 'proyectos' configurada exitosamente!");
```

### seed.js

Script para insertar datos iniciales:

```javascript
use proyectos;

// Insertar admin inicial
db.users.insertOne({
  email: "admin@example.com",
  role: "admin",
  name: "Administrador",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLogin: null,
  isActive: true
});

// Insertar prompt por defecto
db.aiPrompts.insertOne({
  name: "Evaluación Estándar de Proyecto",
  prompt: `Analiza el siguiente repositorio de proyecto académico...`,
  isActive: true,
  createdBy: "admin@example.com",
  createdAt: new Date(),
  updatedAt: new Date()
});

print("Datos iniciales insertados!");
print("Admin email: admin@example.com");
```

---

## Queries Comunes

### Usuarios

```javascript
// Obtener usuario por email
db.users.findOne({ email: "alumno@example.com" });

// Listar todos los estudiantes activos
db.users.find({ role: "student", isActive: true });

// Contar usuarios por rol
db.users.aggregate([
  { $group: { _id: "$role", count: { $sum: 1 } } }
]);

// Usuarios pendientes de asignación de rol
db.users.find({ role: "pending" });
```

### Proyectos

```javascript
// Proyectos de un estudiante
db.projects.find({ studentEmail: "alumno@example.com" });

// Proyectos sin evaluar
db.projects.find({ status: "submitted" });

// Proyectos evaluados por un profesor
db.projects.find({
  $or: [
    { "evaluations.videoDemo.evaluatedBy": "profesor@example.com" },
    { "evaluations.repository.evaluatedBy": "profesor@example.com" }
  ]
});

// Proyectos con fecha de entrega vencida
db.projects.find({
  submissionDate: { $lt: new Date() },
  status: "pending"
});

// Promedio de notas de un estudiante
db.projects.aggregate([
  { $match: { studentEmail: "alumno@example.com" } },
  {
    $project: {
      avgScore: {
        $avg: [
          "$evaluations.videoDemo.score",
          "$evaluations.repository.score"
        ]
      }
    }
  }
]);
```

### Magic Links

```javascript
// Validar token
db.magiclinks.findOne({
  token: "a1b2c3d4...",
  used: false,
  expiresAt: { $gt: new Date() }
});

// Marcar token como usado
db.magiclinks.updateOne(
  { token: "a1b2c3d4..." },
  { $set: { used: true } }
);

// Limpiar tokens usados (opcional, TTL lo hace automáticamente)
db.magiclinks.deleteMany({ used: true });
```

### AI Prompts

```javascript
// Obtener prompt activo por defecto
db.aiPrompts.findOne({ isActive: true });

// Listar todos los prompts
db.aiPrompts.find().sort({ createdAt: -1 });
```

---

## Backup y Restore

### Backup
```bash
mongodump --db=proyectos --out=/backup/proyectos-$(date +%Y%m%d)
```

### Restore
```bash
mongorestore --db=proyectos /backup/proyectos-20250115/proyectos
```

---

## Mantenimiento

### Limpiar tokens expirados manualmente
```javascript
db.magiclinks.deleteMany({
  expiresAt: { $lt: new Date() }
});
```

### Estadísticas de la base de datos
```javascript
db.stats();
db.users.stats();
db.projects.stats();
```

### Verificar índices
```javascript
db.users.getIndexes();
db.projects.getIndexes();
db.magiclinks.getIndexes();
db.aiPrompts.getIndexes();
```
