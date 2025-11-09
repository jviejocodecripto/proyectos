# API Endpoints - Sistema de Gestión de Proyectos

## Convenciones Generales

### Formato de Response
```typescript
// Éxito
{
  success: true,
  data: { ... },
  message?: string
}

// Error
{
  success: false,
  error: string,
  code?: string
}
```

### Códigos de Estado HTTP
- `200` OK - Operación exitosa
- `201` Created - Recurso creado
- `400` Bad Request - Datos inválidos
- `401` Unauthorized - No autenticado
- `403` Forbidden - Sin permisos
- `404` Not Found - Recurso no encontrado
- `500` Internal Server Error - Error del servidor

### Headers Requeridos
```
Content-Type: application/json
Cookie: session=xxx (para endpoints protegidos)
```

---

## 1. Autenticación

### POST /api/auth/request-magic-link
Solicita un magic link para iniciar sesión.

**Acceso:** Público

**Request Body:**
```typescript
{
  email: string;  // Email del usuario
}
```

**Response 200:**
```typescript
{
  success: true,
  message: "Magic link enviado a tu email"
}
```

**Errores:**
- `400` - Email inválido
- `404` - Usuario no encontrado
- `403` - Usuario no activo

**Ejemplo:**
```bash
curl -X POST http://localhost:3000/api/auth/request-magic-link \
  -H "Content-Type: application/json" \
  -d '{"email": "alumno@example.com"}'
```

---

### GET /api/auth/verify
Verifica el token del magic link y crea la sesión.

**Acceso:** Público

**Query Params:**
- `token` (string, required) - Token del magic link

**Response 302:**
Redirect a dashboard según rol:
- Student → `/student`
- Teacher → `/teacher`
- Admin → `/admin`
- Pending → `/pending`

**Errores:**
- `400` - Token no proporcionado
- `401` - Token inválido o expirado
- `401` - Token ya usado

**Ejemplo:**
```bash
curl -X GET "http://localhost:3000/api/auth/verify?token=abc123..."
```

---

### POST /api/auth/logout
Cierra la sesión del usuario actual.

**Acceso:** Autenticado

**Response 200:**
```typescript
{
  success: true,
  message: "Sesión cerrada"
}
```

**Ejemplo:**
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  --cookie "session=xxx"
```

---

### GET /api/auth/me
Obtiene información del usuario actual.

**Acceso:** Autenticado

**Response 200:**
```typescript
{
  success: true,
  data: {
    email: string,
    role: "student" | "teacher" | "admin" | "pending",
    name: string,
    isActive: boolean,
    lastLogin: string
  }
}
```

**Errores:**
- `401` - No autenticado

**Ejemplo:**
```bash
curl -X GET http://localhost:3000/api/auth/me \
  --cookie "session=xxx"
```

---

## 2. Usuarios (Admin)

### GET /api/admin/users
Lista todos los usuarios del sistema.

**Acceso:** Admin

**Query Params:**
- `role` (string, optional) - Filtrar por rol: "student", "teacher", "admin", "pending"
- `search` (string, optional) - Buscar por email o nombre
- `page` (number, optional) - Número de página (default: 1)
- `limit` (number, optional) - Resultados por página (default: 20, max: 100)

**Response 200:**
```typescript
{
  success: true,
  data: {
    users: Array<{
      email: string,
      role: string,
      name: string,
      createdAt: string,
      lastLogin: string | null,
      isActive: boolean
    }>,
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number
    }
  }
}
```

**Errores:**
- `401` - No autenticado
- `403` - No es admin

**Ejemplo:**
```bash
curl -X GET "http://localhost:3000/api/admin/users?role=student&page=1&limit=20" \
  --cookie "session=xxx"
```

---

### PATCH /api/admin/users/[email]/role
Asigna o cambia el rol de un usuario.

**Acceso:** Admin

**Path Params:**
- `email` - Email del usuario

**Request Body:**
```typescript
{
  role: "student" | "teacher" | "admin";
}
```

**Response 200:**
```typescript
{
  success: true,
  data: {
    email: string,
    role: string,
    name: string,
    updatedAt: string
  },
  message: "Rol actualizado correctamente"
}
```

**Errores:**
- `400` - Rol inválido
- `401` - No autenticado
- `403` - No es admin
- `404` - Usuario no encontrado

**Ejemplo:**
```bash
curl -X PATCH http://localhost:3000/api/admin/users/alumno@example.com/role \
  -H "Content-Type: application/json" \
  --cookie "session=xxx" \
  -d '{"role": "student"}'
```

---

### PATCH /api/admin/users/[email]/status
Activa o desactiva un usuario.

**Acceso:** Admin

**Path Params:**
- `email` - Email del usuario

**Request Body:**
```typescript
{
  isActive: boolean;
}
```

**Response 200:**
```typescript
{
  success: true,
  data: {
    email: string,
    isActive: boolean
  },
  message: "Estado actualizado correctamente"
}
```

**Errores:**
- `400` - Estado inválido
- `401` - No autenticado
- `403` - No es admin
- `404` - Usuario no encontrado

**Ejemplo:**
```bash
curl -X PATCH http://localhost:3000/api/admin/users/alumno@example.com/status \
  -H "Content-Type: application/json" \
  --cookie "session=xxx" \
  -d '{"isActive": false}'
```

---

## 3. Proyectos

### GET /api/projects
Lista proyectos según el rol del usuario.

**Acceso:** Autenticado (student, teacher, admin)

**Permisos:**
- Student: Solo sus propios proyectos
- Teacher: Todos los proyectos
- Admin: Todos los proyectos

**Query Params:**
- `studentEmail` (string, optional) - Filtrar por email del estudiante (teacher/admin)
- `status` (string, optional) - Filtrar por estado: "pending", "submitted", "evaluated"
- `page` (number, optional) - Número de página (default: 1)
- `limit` (number, optional) - Resultados por página (default: 20)

**Response 200:**
```typescript
{
  success: true,
  data: {
    projects: Array<{
      _id: string,
      name: string,
      studentEmail: string,
      repositoryUrl: string,
      submissionDate: string,
      status: string,
      createdAt: string,
      evaluations?: {
        videoDemo?: {
          score: number,
          evaluatedAt: string
        },
        repository?: {
          score: number,
          evaluatedAt: string
        }
      }
    }>,
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number
    }
  }
}
```

**Errores:**
- `401` - No autenticado

**Ejemplo:**
```bash
curl -X GET "http://localhost:3000/api/projects?status=submitted" \
  --cookie "session=xxx"
```

---

### POST /api/projects
Crea un nuevo proyecto.

**Acceso:** Student

**Request Body:**
```typescript
{
  name: string;              // Nombre del proyecto (min 3 caracteres)
  repositoryUrl: string;     // URL del repo GitHub
  submissionDate: string;    // ISO date string
}
```

**Response 201:**
```typescript
{
  success: true,
  data: {
    _id: string,
    name: string,
    studentEmail: string,
    repositoryUrl: string,
    submissionDate: string,
    status: "submitted",
    createdAt: string
  },
  message: "Proyecto creado correctamente"
}
```

**Validaciones:**
- `name`: 3-200 caracteres
- `repositoryUrl`: URL válida de GitHub (formato: https://github.com/user/repo)
- `submissionDate`: Fecha válida en el futuro

**Errores:**
- `400` - Datos inválidos
- `401` - No autenticado
- `403` - No es student

**Ejemplo:**
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  --cookie "session=xxx" \
  -d '{
    "name": "Sistema de Gestión de Biblioteca",
    "repositoryUrl": "https://github.com/alumno/biblioteca",
    "submissionDate": "2025-02-01T23:59:59Z"
  }'
```

---

### GET /api/projects/[id]
Obtiene detalles de un proyecto específico.

**Acceso:** Autenticado

**Permisos:**
- Student: Solo sus propios proyectos
- Teacher: Todos los proyectos
- Admin: Todos los proyectos

**Path Params:**
- `id` - ID del proyecto

**Response 200:**
```typescript
{
  success: true,
  data: {
    _id: string,
    name: string,
    studentEmail: string,
    repositoryUrl: string,
    submissionDate: string,
    status: string,
    createdAt: string,
    updatedAt: string,
    evaluations?: {
      videoDemo?: {
        score: number,
        comments: string,
        evaluatedBy: string,
        evaluatedAt: string
      },
      repository?: {
        score: number,
        comments: string,
        aiAnalysis?: string,
        evaluatedBy: string,
        evaluatedAt: string
      }
    }
  }
}
```

**Errores:**
- `401` - No autenticado
- `403` - Sin permisos para ver este proyecto
- `404` - Proyecto no encontrado

**Ejemplo:**
```bash
curl -X GET http://localhost:3000/api/projects/507f1f77bcf86cd799439012 \
  --cookie "session=xxx"
```

---

### PATCH /api/projects/[id]
Actualiza un proyecto.

**Acceso:** Student (solo sus proyectos y antes de submissionDate)

**Path Params:**
- `id` - ID del proyecto

**Request Body:**
```typescript
{
  name?: string;
  repositoryUrl?: string;
  submissionDate?: string;
}
```

**Response 200:**
```typescript
{
  success: true,
  data: {
    _id: string,
    name: string,
    repositoryUrl: string,
    submissionDate: string,
    updatedAt: string
  },
  message: "Proyecto actualizado correctamente"
}
```

**Errores:**
- `400` - Datos inválidos
- `401` - No autenticado
- `403` - No es el dueño del proyecto o fecha vencida
- `404` - Proyecto no encontrado

**Ejemplo:**
```bash
curl -X PATCH http://localhost:3000/api/projects/507f1f77bcf86cd799439012 \
  -H "Content-Type: application/json" \
  --cookie "session=xxx" \
  -d '{"name": "Biblioteca Sistema v2"}'
```

---

### DELETE /api/projects/[id]
Elimina un proyecto.

**Acceso:** Student (solo sus proyectos) o Admin

**Path Params:**
- `id` - ID del proyecto

**Response 200:**
```typescript
{
  success: true,
  message: "Proyecto eliminado correctamente"
}
```

**Errores:**
- `401` - No autenticado
- `403` - Sin permisos
- `404` - Proyecto no encontrado

**Ejemplo:**
```bash
curl -X DELETE http://localhost:3000/api/projects/507f1f77bcf86cd799439012 \
  --cookie "session=xxx"
```

---

## 4. Evaluaciones (Teacher)

### POST /api/projects/[id]/evaluate/video
Evalúa el video demo de un proyecto.

**Acceso:** Teacher

**Path Params:**
- `id` - ID del proyecto

**Request Body:**
```typescript
{
  score: number;      // 0-10, con decimales permitidos
  comments: string;   // Comentarios del profesor
}
```

**Response 200:**
```typescript
{
  success: true,
  data: {
    projectId: string,
    evaluation: {
      score: number,
      comments: string,
      evaluatedBy: string,
      evaluatedAt: string
    }
  },
  message: "Video demo evaluado correctamente"
}
```

**Validaciones:**
- `score`: 0 ≤ score ≤ 10
- `comments`: Min 10 caracteres

**Errores:**
- `400` - Datos inválidos
- `401` - No autenticado
- `403` - No es teacher
- `404` - Proyecto no encontrado

**Ejemplo:**
```bash
curl -X POST http://localhost:3000/api/projects/507f1f77bcf86cd799439012/evaluate/video \
  -H "Content-Type: application/json" \
  --cookie "session=xxx" \
  -d '{
    "score": 8.5,
    "comments": "Buena presentación. Se explican bien las funcionalidades."
  }'
```

---

### POST /api/projects/[id]/evaluate/repository
Evalúa el repositorio de un proyecto con ayuda de IA.

**Acceso:** Teacher

**Path Params:**
- `id` - ID del proyecto

**Request Body:**
```typescript
{
  score: number;          // 0-10, puede ser ajustado por el teacher
  comments?: string;      // Comentarios adicionales del profesor
  promptId?: string;      // ID del prompt a usar (optional, usa el activo por defecto)
}
```

**Response 200:**
```typescript
{
  success: true,
  data: {
    projectId: string,
    evaluation: {
      score: number,
      comments: string,           // Comentarios del profesor + IA
      aiAnalysis: string,          // Análisis completo de la IA
      aiPromptUsed: string,
      evaluatedBy: string,
      evaluatedAt: string
    }
  },
  message: "Repositorio evaluado correctamente"
}
```

**Proceso:**
1. Sistema accede al repositorio de GitHub
2. Extrae información relevante (README, estructura, código)
3. Genera análisis con IA usando el prompt especificado
4. Teacher puede revisar y ajustar la nota
5. Se guarda la evaluación con análisis IA

**Errores:**
- `400` - Datos inválidos
- `401` - No autenticado
- `403` - No es teacher
- `404` - Proyecto no encontrado
- `500` - Error al acceder al repositorio o IA

**Ejemplo:**
```bash
curl -X POST http://localhost:3000/api/projects/507f1f77bcf86cd799439012/evaluate/repository \
  -H "Content-Type: application/json" \
  --cookie "session=xxx" \
  -d '{
    "score": 9.0,
    "comments": "Excelente implementación."
  }'
```

---

### GET /api/projects/[id]/ai-analysis
Obtiene un análisis preliminar del repositorio usando IA (sin guardar evaluación).

**Acceso:** Teacher

**Path Params:**
- `id` - ID del proyecto

**Query Params:**
- `promptId` (string, optional) - ID del prompt a usar

**Response 200:**
```typescript
{
  success: true,
  data: {
    projectId: string,
    projectName: string,
    repositoryUrl: string,
    analysis: {
      summary: string,
      codeQuality: number,        // 0-10
      documentation: number,       // 0-10
      functionality: number,       // 0-10
      gitUsage: number,            // 0-10
      suggestedScore: number,      // 0-10 promedio
      strengths: string[],
      improvements: string[],
      detailedComments: string
    }
  }
}
```

**Errores:**
- `401` - No autenticado
- `403` - No es teacher
- `404` - Proyecto no encontrado
- `500` - Error al analizar repositorio

**Ejemplo:**
```bash
curl -X GET http://localhost:3000/api/projects/507f1f77bcf86cd799439012/ai-analysis \
  --cookie "session=xxx"
```

---

## 5. AI Prompts (Admin)

### GET /api/admin/prompts
Lista todos los prompts de IA.

**Acceso:** Admin

**Response 200:**
```typescript
{
  success: true,
  data: {
    prompts: Array<{
      _id: string,
      name: string,
      prompt: string,
      isActive: boolean,
      createdBy: string,
      createdAt: string,
      updatedAt: string
    }>
  }
}
```

**Ejemplo:**
```bash
curl -X GET http://localhost:3000/api/admin/prompts \
  --cookie "session=xxx"
```

---

### POST /api/admin/prompts
Crea un nuevo prompt de IA.

**Acceso:** Admin

**Request Body:**
```typescript
{
  name: string;         // Nombre descriptivo
  prompt: string;       // Template del prompt con variables {{var}}
  isActive: boolean;    // Si es el prompt activo por defecto
}
```

**Variables disponibles:**
- `{{projectName}}`
- `{{submissionDate}}`
- `{{readme}}`
- `{{fileStructure}}`
- `{{mainCode}}`
- `{{recentCommits}}`

**Response 201:**
```typescript
{
  success: true,
  data: {
    _id: string,
    name: string,
    prompt: string,
    isActive: boolean,
    createdBy: string,
    createdAt: string
  },
  message: "Prompt creado correctamente"
}
```

**Errores:**
- `400` - Datos inválidos
- `401` - No autenticado
- `403` - No es admin

**Ejemplo:**
```bash
curl -X POST http://localhost:3000/api/admin/prompts \
  -H "Content-Type: application/json" \
  --cookie "session=xxx" \
  -d '{
    "name": "Evaluación Detallada",
    "prompt": "Analiza...",
    "isActive": true
  }'
```

---

### PATCH /api/admin/prompts/[id]
Actualiza un prompt existente.

**Acceso:** Admin

**Path Params:**
- `id` - ID del prompt

**Request Body:**
```typescript
{
  name?: string;
  prompt?: string;
  isActive?: boolean;
}
```

**Response 200:**
```typescript
{
  success: true,
  data: {
    _id: string,
    name: string,
    prompt: string,
    isActive: boolean,
    updatedAt: string
  },
  message: "Prompt actualizado correctamente"
}
```

**Nota:** Si se establece `isActive: true`, todos los demás prompts se marcarán como `isActive: false`.

**Ejemplo:**
```bash
curl -X PATCH http://localhost:3000/api/admin/prompts/507f1f77bcf86cd799439014 \
  -H "Content-Type: application/json" \
  --cookie "session=xxx" \
  -d '{"isActive": true}'
```

---

### DELETE /api/admin/prompts/[id]
Elimina un prompt.

**Acceso:** Admin

**Path Params:**
- `id` - ID del prompt

**Response 200:**
```typescript
{
  success: true,
  message: "Prompt eliminado correctamente"
}
```

**Errores:**
- `400` - No se puede eliminar el único prompt activo
- `401` - No autenticado
- `403` - No es admin
- `404` - Prompt no encontrado

**Ejemplo:**
```bash
curl -X DELETE http://localhost:3000/api/admin/prompts/507f1f77bcf86cd799439014 \
  --cookie "session=xxx"
```

---

## 6. Estadísticas (Futuro)

### GET /api/stats/student
Estadísticas del estudiante actual.

**Acceso:** Student

**Response 200:**
```typescript
{
  success: true,
  data: {
    totalProjects: number,
    averageScore: number,
    evaluatedProjects: number,
    pendingProjects: number
  }
}
```

---

### GET /api/stats/teacher
Estadísticas del profesor.

**Acceso:** Teacher

**Response 200:**
```typescript
{
  success: true,
  data: {
    totalEvaluated: number,
    pendingEvaluations: number,
    averageScoreGiven: number
  }
}
```

---

### GET /api/stats/admin
Estadísticas generales del sistema.

**Acceso:** Admin

**Response 200:**
```typescript
{
  success: true,
  data: {
    totalUsers: number,
    totalProjects: number,
    evaluatedProjects: number,
    usersByRole: {
      student: number,
      teacher: number,
      admin: number,
      pending: number
    }
  }
}
```

---

## Notas de Implementación

### Middleware de Autenticación
Todos los endpoints protegidos deben verificar:
1. Existencia de sesión válida
2. Usuario activo (`isActive: true`)
3. Rol apropiado para el endpoint

### Validación de Datos
Usar Zod para validar todos los inputs:
```typescript
import { z } from 'zod';

const projectSchema = z.object({
  name: z.string().min(3).max(200),
  repositoryUrl: z.string().url().regex(/^https:\/\/github\.com\/.+\/.+$/),
  submissionDate: z.string().datetime()
});
```

### Rate Limiting
Considerar implementar rate limiting especialmente en:
- `/api/auth/request-magic-link` (max 3 por 15 min)
- `/api/projects/[id]/ai-analysis` (max 5 por hora)

### Logs
Registrar todas las operaciones importantes:
- Creación/modificación de usuarios
- Evaluaciones realizadas
- Accesos denegados
