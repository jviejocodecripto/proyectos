// MongoDB Database Seed Script
// Run with: mongosh < scripts/seed-db.js

use proyectos;

print("=== Seeding Proyectos Database ===\n");

// ============================================================================
// Insert Admin User
// ============================================================================

print("Inserting admin user...");

try {
  db.users.insertOne({
    email: "admin@example.com",
    role: "admin",
    name: "Administrador",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: null,
    isActive: true
  });
  print("✓ Admin user created: admin@example.com\n");
} catch (error) {
  if (error.code === 11000) {
    print("⚠ Admin user already exists\n");
  } else {
    print("✗ Error creating admin user:", error.message, "\n");
  }
}

// ============================================================================
// Insert Sample Teacher
// ============================================================================

print("Inserting sample teacher...");

try {
  db.users.insertOne({
    email: "profesor@example.com",
    role: "teacher",
    name: "Profesor Demo",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: null,
    isActive: true
  });
  print("✓ Teacher user created: profesor@example.com\n");
} catch (error) {
  if (error.code === 11000) {
    print("⚠ Teacher user already exists\n");
  } else {
    print("✗ Error creating teacher user:", error.message, "\n");
  }
}

// ============================================================================
// Insert Sample Student
// ============================================================================

print("Inserting sample student...");

try {
  db.users.insertOne({
    email: "alumno@example.com",
    role: "student",
    name: "Alumno Demo",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: null,
    isActive: true
  });
  print("✓ Student user created: alumno@example.com\n");
} catch (error) {
  if (error.code === 11000) {
    print("⚠ Student user already exists\n");
  } else {
    print("✗ Error creating student user:", error.message, "\n");
  }
}

// ============================================================================
// Insert Default AI Prompt
// ============================================================================

print("Inserting default AI prompt...");

const defaultPrompt = `Analiza el siguiente repositorio de proyecto académico:

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
- Comentarios constructivos para el estudiante

Formato de respuesta:
## Puntuación Sugerida: X/10

## Análisis Detallado:
[Tu análisis aquí]

## Puntos Fuertes:
- [Punto 1]
- [Punto 2]

## Áreas de Mejora:
- [Punto 1]
- [Punto 2]

## Comentarios para el Estudiante:
[Comentarios constructivos]`;

try {
  db.aiPrompts.insertOne({
    name: "Evaluación Estándar de Proyecto",
    prompt: defaultPrompt,
    isActive: true,
    createdBy: "admin@example.com",
    createdAt: new Date(),
    updatedAt: new Date()
  });
  print("✓ Default AI prompt created\n");
} catch (error) {
  print("✗ Error creating AI prompt:", error.message, "\n");
}

// ============================================================================
// Insert Sample Project (Optional)
// ============================================================================

print("Inserting sample project...");

try {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30); // 30 days from now

  db.projects.insertOne({
    name: "Sistema de Gestión de Biblioteca",
    studentEmail: "alumno@example.com",
    repositoryUrl: "https://github.com/ejemplo/biblioteca-sistema",
    submissionDate: futureDate,
    status: "submitted",
    createdAt: new Date(),
    updatedAt: new Date()
  });
  print("✓ Sample project created\n");
} catch (error) {
  print("✗ Error creating sample project:", error.message, "\n");
}

// ============================================================================
// Summary
// ============================================================================

print("=== Database Seeding Complete ===\n");

const userCount = db.users.countDocuments();
const projectCount = db.projects.countDocuments();
const promptCount = db.aiPrompts.countDocuments();

print("Database: proyectos");
print("Users:", userCount);
print("Projects:", projectCount);
print("AI Prompts:", promptCount);

print("\n=== Login Credentials ===");
print("Admin: admin@example.com");
print("Teacher: profesor@example.com");
print("Student: alumno@example.com");
print("\nUse the magic link authentication to login.");
print("Check MailHog at http://localhost:8025 for magic links.\n");
