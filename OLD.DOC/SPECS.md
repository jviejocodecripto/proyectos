# Especificaciones Sistema de Gestión de Proyectos

## 1. Descripción General
Sistema web para gestionar proyectos de alumnos basados en repositorios de GitHub, con sistema de valoraciones por profesores y administración de usuarios.

## 2. Stack Tecnológico
- **Frontend/Backend**: Next.js 16 (App Router) con TypeScript
- **Estilos**: Tailwind CSS
- **Base de datos**: MongoDB (driver nativo, sin Mongoose)
- **Autenticación**: Magic Link (email sin contraseña)
- **Email**: MailHog (desarrollo local)
- **Base de datos**: `proyectos` en localhost

## 3. Roles y Permisos

### 3.1 Student (Alumno)
- Registrarse en el sistema
- Ver sus propios proyectos
- Crear nuevos proyectos
- Editar proyectos antes de la fecha de entrega
- Ver valoraciones de sus proyectos

### 3.2 Teacher (Profesor)
- Ver lista de proyectos asignados
- Valorar proyectos:
  - Valoración de video demo (nota + comentarios)
  - Valoración de repositorio (nota + comentarios usando IA)
- Ver estadísticas de proyectos

### 3.3 Admin (Administrador)
- Ver todos los usuarios registrados
- Asignar/modificar roles (student, teacher, admin)
- Ver todos los proyectos
- Gestionar configuración del sistema
- Ver estadísticas generales

## 4. Modelos de Datos (MongoDB)

### 4.1 Collection: `users`
```javascript
{
  _id: ObjectId,
  email: String,              // Identificador único del usuario
  role: String,               // "student" | "teacher" | "admin" | "pending"
  name: String,               // Nombre completo
  createdAt: Date,
  updatedAt: Date,
  lastLogin: Date,
  isActive: Boolean
}
```
**Índices**:
- `email` (unique)
- `role`

### 4.2 Collection: `projects`
```javascript
{
  _id: ObjectId,
  name: String,               // Nombre del proyecto
  studentEmail: String,       // Email del alumno (referencia a users)
  repositoryUrl: String,      // URL del repositorio GitHub
  submissionDate: Date,       // Fecha de entrega
  createdAt: Date,
  updatedAt: Date,

  // Valoraciones
  evaluations: {
    videoDemo: {
      score: Number,          // 0-10
      comments: String,
      evaluatedBy: String,    // Email del teacher
      evaluatedAt: Date
    },
    repository: {
      score: Number,          // 0-10
      comments: String,       // Generado por IA
      aiPromptUsed: String,   // Prompt usado para la IA
      evaluatedBy: String,    // Email del teacher
      evaluatedAt: Date
    }
  },

  status: String              // "pending" | "submitted" | "evaluated"
}
```
**Índices**:
- `studentEmail`
- `status`
- `submissionDate`

### 4.3 Collection: `magiclinks`
```javascript
{
  _id: ObjectId,
  email: String,
  token: String,              // Token único para el magic link
  createdAt: Date,
  expiresAt: Date,            // 15 minutos de validez
  used: Boolean
}
```
**Índices**:
- `token` (unique)
- `email`
- `expiresAt` (TTL index para auto-delete)

### 4.4 Collection: `aiPrompts`
```javascript
{
  _id: ObjectId,
  name: String,               // Nombre descriptivo del prompt
  prompt: String,             // Template del prompt para evaluación
  isActive: Boolean,          // Prompt activo por defecto
  createdBy: String,          // Email del admin
  createdAt: Date,
  updatedAt: Date
}
```

## 5. API Endpoints

### 5.1 Autenticación
- `POST /api/auth/request-magic-link` - Solicitar magic link
  - Body: `{ email: string }`
  - Response: `{ success: boolean, message: string }`

- `GET /api/auth/verify?token=xxx` - Verificar magic link
  - Query: `token`
  - Response: Redirect a dashboard con cookie/session

- `POST /api/auth/logout` - Cerrar sesión
  - Response: `{ success: boolean }`

- `GET /api/auth/me` - Obtener usuario actual
  - Response: `{ user: User }`

### 5.2 Usuarios (Admin)
- `GET /api/admin/users` - Listar todos los usuarios
  - Query params: `?role=xxx&page=1&limit=20`
  - Response: `{ users: User[], total: number }`

- `PATCH /api/admin/users/:email/role` - Asignar rol
  - Body: `{ role: "student" | "teacher" | "admin" }`
  - Response: `{ success: boolean, user: User }`

- `PATCH /api/admin/users/:email/status` - Activar/desactivar usuario
  - Body: `{ isActive: boolean }`
  - Response: `{ success: boolean }`

### 5.3 Proyectos
- `GET /api/projects` - Listar proyectos
  - Query params: `?studentEmail=xxx&status=xxx`
  - Permissions: Student ve solo los suyos, Teacher y Admin ven todos
  - Response: `{ projects: Project[] }`

- `POST /api/projects` - Crear proyecto
  - Body: `{ name: string, repositoryUrl: string, submissionDate: string }`
  - Permissions: Student
  - Response: `{ success: boolean, project: Project }`

- `GET /api/projects/:id` - Ver proyecto específico
  - Response: `{ project: Project }`

- `PATCH /api/projects/:id` - Actualizar proyecto
  - Body: Campos editables
  - Permissions: Student (solo sus proyectos y antes de submissionDate)
  - Response: `{ success: boolean, project: Project }`

- `DELETE /api/projects/:id` - Eliminar proyecto
  - Permissions: Student (solo sus proyectos) o Admin
  - Response: `{ success: boolean }`

### 5.4 Evaluaciones (Teacher)
- `POST /api/projects/:id/evaluate/video` - Evaluar video demo
  - Body: `{ score: number, comments: string }`
  - Permissions: Teacher
  - Response: `{ success: boolean, evaluation: object }`

- `POST /api/projects/:id/evaluate/repository` - Evaluar repositorio con IA
  - Body: `{ score: number, promptId?: string }`
  - Permissions: Teacher
  - Response: `{ success: boolean, evaluation: object, aiComments: string }`

- `GET /api/projects/:id/ai-analysis` - Obtener análisis IA del repositorio
  - Permissions: Teacher
  - Response: `{ analysis: string }`

### 5.5 AI Prompts (Admin)
- `GET /api/admin/prompts` - Listar prompts
  - Response: `{ prompts: AIPrompt[] }`

- `POST /api/admin/prompts` - Crear prompt
  - Body: `{ name: string, prompt: string, isActive: boolean }`
  - Response: `{ success: boolean, prompt: AIPrompt }`

- `PATCH /api/admin/prompts/:id` - Actualizar prompt
  - Body: Campos editables
  - Response: `{ success: boolean, prompt: AIPrompt }`

## 6. Flujos de Usuario

### 6.1 Registro y Asignación de Rol
1. Usuario ingresa su email en la página de registro
2. Sistema crea usuario con role="pending"
3. Admin recibe notificación (opcional)
4. Admin asigna el rol correspondiente
5. Usuario recibe email de bienvenida con su rol asignado

### 6.2 Login (Magic Link)
1. Usuario ingresa su email
2. Sistema genera token único y lo guarda en `magiclinks`
3. Se envía email con link: `http://localhost:3000/api/auth/verify?token=xxx`
4. Usuario hace clic en el link
5. Sistema verifica token, crea sesión y redirige al dashboard

### 6.3 Envío de Proyecto (Student)
1. Student accede a "Mis Proyectos"
2. Hace clic en "Nuevo Proyecto"
3. Completa formulario:
   - Nombre del proyecto
   - URL del repositorio de GitHub
   - Fecha de entrega
4. Sistema valida que la URL sea válida
5. Proyecto se guarda con status="submitted"

### 6.4 Evaluación de Proyecto (Teacher)
1. Teacher accede a lista de proyectos
2. Selecciona un proyecto para evaluar
3. Ve detalles del proyecto y repositorio
4. **Evaluación Video Demo:**
   - Ingresa nota (0-10)
   - Escribe comentarios
   - Guarda evaluación
5. **Evaluación Repositorio:**
   - Sistema muestra análisis automático del repo usando IA
   - Teacher revisa el análisis
   - Ajusta nota si es necesario
   - Añade comentarios adicionales
   - Guarda evaluación
6. Student puede ver las evaluaciones

## 7. Integración con IA

### 7.1 Análisis de Repositorio
Cuando el teacher va a evaluar un repositorio:
1. Sistema clona/accede al repositorio de GitHub
2. Extrae información relevante:
   - README.md
   - Estructura de archivos
   - Código principal
   - Commits recientes
3. Construye prompt usando template de `aiPrompts` collection
4. Envía a API de IA (Claude, GPT, etc.)
5. Recibe análisis con:
   - Calidad del código
   - Documentación
   - Buenas prácticas
   - Completitud
   - Sugerencias de mejora

### 7.2 Template de Prompt
```
Analiza el siguiente repositorio de proyecto académico:

**Nombre del proyecto:** {projectName}
**Fecha de entrega:** {submissionDate}

**README:**
{readme}

**Estructura de archivos:**
{fileStructure}

**Código principal:**
{mainCode}

Evalúa:
1. Calidad del código (estructura, legibilidad, buenas prácticas)
2. Documentación (README, comentarios)
3. Completitud del proyecto
4. Funcionalidad implementada
5. Áreas de mejora

Proporciona una evaluación constructiva y educativa.
```

## 8. Configuración del Proyecto

### 8.1 Variables de Entorno (.env.local)
```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=proyectos

# Email (MailHog)
SMTP_HOST=localhost
SMTP_PORT=1025
EMAIL_FROM=noreply@proyectos.local

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
SESSION_SECRET=your-secret-key-here

# AI API (opcional)
OPENAI_API_KEY=xxx
# o
ANTHROPIC_API_KEY=xxx
```

### 8.2 Dependencias Necesarias
```bash
# MongoDB driver
npm install mongodb

# Autenticación/Sesión
npm install iron-session

# Email
npm install nodemailer

# GitHub API
npm install @octokit/rest

# IA
npm install openai
# o
npm install @anthropic-ai/sdk

# Utilidades
npm install zod # Validación
npm install date-fns # Manejo de fechas
```

## 9. Seguridad

### 9.1 Autenticación
- Magic links con expiración de 15 minutos
- Tokens únicos y de un solo uso
- Sesiones con iron-session (encriptadas)

### 9.2 Autorización
- Middleware de verificación de roles en cada endpoint
- Validación de permisos antes de operaciones sensibles
- Students solo pueden modificar sus propios proyectos

### 9.3 Validación
- Validación de datos con Zod
- Sanitización de URLs de repositorio
- Validación de fechas
- Prevención de inyección NoSQL

## 10. Estructura de Carpetas Propuesta

```
web/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── verify/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── student/
│   │   │   ├── projects/
│   │   │   └── page.tsx
│   │   ├── teacher/
│   │   │   ├── projects/
│   │   │   └── page.tsx
│   │   └── admin/
│   │       ├── users/
│   │       ├── prompts/
│   │       └── page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   ├── request-magic-link/
│   │   │   ├── verify/
│   │   │   ├── logout/
│   │   │   └── me/
│   │   ├── projects/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       └── evaluate/
│   │   └── admin/
│   │       ├── users/
│   │       └── prompts/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── db/
│   │   ├── mongodb.ts          # Conexión MongoDB
│   │   ├── users.ts            # Queries de usuarios
│   │   ├── projects.ts         # Queries de proyectos
│   │   └── magiclinks.ts       # Queries de magic links
│   ├── auth/
│   │   ├── session.ts          # Gestión de sesiones
│   │   └── middleware.ts       # Middlewares de auth
│   ├── email/
│   │   └── mailer.ts           # Envío de emails
│   ├── ai/
│   │   ├── analyzer.ts         # Análisis de repos con IA
│   │   └── prompts.ts          # Gestión de prompts
│   ├── github/
│   │   └── client.ts           # Cliente de GitHub API
│   └── utils/
│       ├── validation.ts       # Esquemas Zod
│       └── helpers.ts          # Utilidades
├── components/
│   ├── ui/                     # Componentes UI reutilizables
│   ├── auth/
│   ├── projects/
│   └── admin/
├── types/
│   └── index.ts                # Tipos TypeScript
├── middleware.ts               # Middleware global Next.js
└── package.json
```

## 11. Fases de Implementación

### Fase 1: Base y Autenticación
1. Configurar conexión a MongoDB
2. Implementar modelo de usuarios
3. Implementar Magic Link authentication
4. Crear sistema de sesiones
5. Middleware de protección de rutas

### Fase 2: Gestión de Usuarios (Admin)
1. Dashboard de admin
2. Lista de usuarios
3. Asignación de roles
4. Activación/desactivación de usuarios

### Fase 3: Gestión de Proyectos (Student)
1. Dashboard de estudiante
2. Crear proyectos
3. Listar proyectos propios
4. Editar proyectos
5. Ver evaluaciones

### Fase 4: Evaluación de Proyectos (Teacher)
1. Dashboard de profesor
2. Lista de proyectos a evaluar
3. Vista detalle de proyecto
4. Evaluación de video demo
5. Integración con GitHub API

### Fase 5: Integración IA
1. Configurar API de IA
2. Crear sistema de prompts
3. Análisis automático de repositorios
4. Evaluación de repositorio con IA
5. Gestión de prompts (Admin)

### Fase 6: Mejoras y Optimización
1. Estadísticas y dashboards
2. Notificaciones por email
3. Filtros y búsquedas avanzadas
4. Exportación de datos
5. Tests

## 12. Consideraciones Adicionales

### 12.1 MailHog
- Desarrollo: http://localhost:8025 (interfaz web)
- SMTP: localhost:1025
- Todos los emails enviados se capturan localmente

### 12.2 MongoDB sin Mongoose
- Usar el driver nativo de MongoDB
- Crear funciones helper para operaciones comunes
- Implementar validación en capa de aplicación

### 12.3 GitHub API
- Considerar rate limits
- Cachear información de repositorios
- Manejar repositorios privados (tokens)

### 12.4 UX/UI
- Diseño responsive con Tailwind
- Loading states durante evaluación IA
- Feedback claro de acciones
- Validación en tiempo real en formularios
