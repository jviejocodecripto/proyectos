# Sistema de Gestión de Proyectos

Sistema web completo para gestionar proyectos de estudiantes basados en repositorios de GitHub, con sistema de valoraciones por profesores, administración de usuarios, gestión de variables de entorno y análisis de código con IA.

## 📋 Tabla de Contenidos

- [Descripción](#descripción)
- [Stack Tecnológico](#stack-tecnológico)
- [Características Principales](#características-principales)
- [Arquitectura](#arquitectura)
- [Instalación y Configuración](#instalación-y-configuración)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Base de Datos](#base-de-datos)
- [Autenticación](#autenticación)
- [API Endpoints](#api-endpoints)
- [Roles y Permisos](#roles-y-permisos)
- [Variables de Entorno](#variables-de-entorno)
- [Scripts Disponibles](#scripts-disponibles)
- [Desarrollo](#desarrollo)

## 🎯 Descripción

Sistema de gestión académica que permite a estudiantes subir proyectos (repositorios de GitHub y videos de demostración), profesores evaluarlos con criterios específicos, y administradores gestionar usuarios, configuraciones globales y prompts de IA para análisis automático de código.

### Funcionalidades Clave

- **Gestión de Proyectos**: Los estudiantes pueden crear, editar y ver sus proyectos
- **Sistema de Evaluación**: Los profesores pueden evaluar proyectos con criterios específicos (video demo y repositorio)
- **Análisis con IA**: Análisis automático de código usando prompts configurables
- **Variables de Entorno**: Gestión de variables de entorno por proyecto, estudiante o globales
- **Autenticación Flexible**: Magic links, JWT tokens y sesiones
- **Gestión de Usuarios**: CRUD completo de usuarios con roles y permisos

## 🛠 Stack Tecnológico

### Frontend/Backend
- **Next.js 16** (App Router) con TypeScript
- **React 19** con componentes compatibles
- **Tailwind CSS 4** para estilos
- **Zod** para validación de datos

### Base de Datos
- **MongoDB** (driver nativo, sin Mongoose)
- **GridFS** para almacenar contenido markdown grande (comentarios de evaluación, análisis de IA)

### Autenticación
- **iron-session** para sesiones
- **jose** para JWT tokens
- **Magic Links** por email

### Servicios Externos
- **GitHub API** (@octokit/rest) para análisis de repositorios
- **Anthropic AI** (@anthropic-ai/sdk) para análisis de código
- **Nodemailer/Resend** para envío de emails

### Herramientas de Desarrollo
- **TypeScript 5**
- **ESLint**
- **tsx** para ejecutar scripts TypeScript

## ✨ Características Principales

### Para Estudiantes
- Crear y gestionar proyectos propios
- Ver evaluaciones de sus proyectos
- Gestionar variables de entorno por proyecto o globales
- Autenticación con magic link o JWT token

### Para Profesores
- Ver todos los proyectos asignados
- Evaluar proyectos con criterios específicos:
  - **Video Demo**: Presentación, Funcionalidades, Calidad Técnica, Explicación
  - **Repositorio**: Calidad de Código, Documentación, Funcionalidad, Uso de Git
- Análisis automático de código con IA
- Crear proyectos para estudiantes

### Para Administradores
- Gestión completa de usuarios (crear, editar, eliminar, cambiar roles)
- Gestión de prompts de IA para análisis de código
- Variables de entorno globales (aplican a todos los proyectos)
- Ver todos los proyectos y usuarios
- Crear estudiantes y proyectos vía API REST

## 🏗 Arquitectura

### Estructura de Carpetas

```
web/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Rutas de autenticación
│   ├── (dashboard)/       # Dashboards por rol
│   │   ├── admin/         # Panel de administración
│   │   ├── student/       # Panel de estudiante
│   │   ├── teacher/       # Panel de profesor
│   │   └── pending/       # Panel para usuarios pendientes
│   └── api/               # API Routes
│       ├── admin/         # Endpoints de administración
│       ├── auth/          # Autenticación
│       ├── projects/      # Gestión de proyectos
│       ├── student/       # Endpoints de estudiante
│       ├── students/      # Gestión de estudiantes
│       └── tokens/        # Generación de tokens JWT
├── components/            # Componentes React
│   ├── admin/            # Componentes de administración
│   ├── common/            # Componentes compartidos
│   ├── layout/            # Componentes de layout
│   ├── projects/          # Componentes de proyectos
│   └── teacher/          # Componentes de evaluación
├── lib/                   # Librerías y utilidades
│   ├── ai/               # Análisis con IA
│   ├── auth/             # Autenticación (JWT, sesiones)
│   ├── db/               # Acceso a base de datos
│   ├── email/            # Envío de emails
│   ├── github/           # Cliente de GitHub
│   └── utils/            # Utilidades
├── types/                 # Definiciones TypeScript
├── scripts/               # Scripts de utilidad
└── public/                # Archivos estáticos
```

### Flujo de Autenticación

1. **Magic Link**: Usuario solicita acceso → recibe email → hace clic en link → sesión creada
2. **JWT Token**: Usuario genera código de 6 dígitos → valida código → recibe JWT token
3. **Sesión**: Autenticación persistente usando cookies con iron-session

### Middleware de Autenticación

El archivo `proxy.ts` actúa como middleware que:
- Permite rutas públicas (login, auth, tokens)
- Verifica autenticación para rutas protegidas
- Valida permisos basados en roles
- Maneja redirecciones según el rol del usuario

## 🚀 Instalación y Configuración

### Prerrequisitos

- Node.js 20+
- MongoDB (local o remoto)
- Git

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd PROYECTOS
```

2. **Instalar dependencias**
```bash
cd web
npm install
```

3. **Configurar variables de entorno**

Crear archivo `.env.local` en la carpeta `web/`:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=proyectos

# JWT Secret (generar una cadena aleatoria segura)
JWT_SECRET=tu-secret-key-super-segura-aqui

# Email (desarrollo local con MailHog)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@proyectos.local

# O usar Resend para producción
RESEND_API_KEY=re_xxxxx

# GitHub (opcional, para análisis de repositorios)
GITHUB_TOKEN=ghp_xxxxx

# Anthropic AI (opcional, para análisis de código)
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3006
```

4. **Configurar base de datos**

```bash
# Inicializar esquema y datos de ejemplo
npm run db:init
```

5. **Iniciar servidor de desarrollo**

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3006`

## 📁 Estructura del Proyecto

### Componentes Principales

#### `app/api/` - API Routes

- **`/api/auth/`**: Autenticación (magic links, sesiones, logout)
- **`/api/projects/`**: CRUD de proyectos, evaluaciones, análisis IA
- **`/api/admin/`**: Gestión de usuarios, prompts de IA, variables globales
- **`/api/student/`**: Variables de entorno de estudiantes
- **`/api/students/`**: Crear estudiantes (REST)
- **`/api/tokens/`**: Generar códigos de 6 dígitos y validar para JWT

#### `lib/db/` - Acceso a Base de Datos

- **`mongodb.ts`**: Conexión a MongoDB
- **`users.ts`**: Gestión de usuarios
- **`projects.ts`**: Gestión de proyectos
- **`envconfigs.ts`**: Variables de entorno
- **`tokens.ts`**: Tokens de 6 dígitos
- **`magiclinks.ts`**: Magic links de autenticación
- **`prompts.ts`**: Prompts de IA
- **`gridfs.ts`**: Almacenamiento de archivos grandes (markdown)

#### `lib/auth/` - Autenticación

- **`session.ts`**: Gestión de sesiones con iron-session
- **`jwt.ts`**: Generación y verificación de JWT tokens

## 🗄 Base de Datos

### Colecciones MongoDB

#### `users`
Almacena información de usuarios (estudiantes, profesores, administradores).

```typescript
{
  _id: ObjectId,
  email: string,              // Único
  roles: UserRole[],          // ['student', 'teacher', 'admin']
  name: string,
  createdAt: Date,
  updatedAt: Date,
  lastLogin: Date | null,
  isActive: boolean
}
```

#### `projects`
Almacena proyectos de estudiantes.

```typescript
{
  _id: ObjectId,
  name: string,
  studentEmail: string,
  repositoryUrl: string,
  videoUrl?: string,
  course: string,
  edition: string,
  submissionDate: Date,
  status: 'pending' | 'submitted' | 'evaluated',
  evaluations?: {
    videoDemo?: VideoEvaluation,
    repository?: RepositoryEvaluation
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### `envconfigs`
Variables de entorno por proyecto, estudiante o globales.

```typescript
{
  _id: ObjectId,
  projectId: string | 'global',
  studentEmail?: string,      // Para globales de estudiante
  environment: 'dev' | 'pro' | 'all',
  scope: 'client' | 'server',
  key: string,
  value: string,
  createdAt: Date,
  updatedAt: Date
}
```

#### `tokens`
Códigos de 6 dígitos para generar JWT tokens.

```typescript
{
  _id: ObjectId,
  code: string,              // 6 dígitos
  email?: string,            // Asignado al validar
  jwt?: string,              // JWT generado
  expiresAt?: Date,          // Expiración del JWT
  createdAt: Date,
  used: boolean
}
```

#### `magiclinks`
Tokens para autenticación por magic link.

```typescript
{
  _id: ObjectId,
  email: string,
  token: string,
  createdAt: Date,
  expiresAt: Date,
  used: boolean,
  redirect?: string
}
```

#### `aiPrompts`
Prompts configurables para análisis de código con IA.

```typescript
{
  _id: ObjectId,
  name: string,
  prompt: string,
  isActive: boolean,
  createdBy: string,
  createdAt: Date,
  updatedAt: Date
}
```

### GridFS

Se usa GridFS para almacenar contenido markdown grande:
- Comentarios de evaluación extensos
- Análisis de IA completos

## 🔐 Autenticación

### Magic Links

1. Usuario solicita acceso con su email
2. Sistema genera token único y lo envía por email
3. Usuario hace clic en el link del email
4. Sistema valida el token y crea sesión

### JWT Tokens

1. **Generar código**: `POST /api/tokens` → devuelve código de 6 dígitos
2. **Validar código**: `POST /api/tokens/validate` con `{ code, email }` → devuelve JWT token
3. **Usar token**: Incluir en header `Authorization: Bearer <token>`

Los JWT tokens tienen:
- **Payload**: `{ email, exp, iat }`
- **Expiración**: 12 meses por defecto
- **Algoritmo**: HS256

### Sesiones

Las sesiones se almacenan en cookies usando iron-session y contienen:
- Email del usuario
- Roles del usuario
- Estado de autenticación

## 📡 API Endpoints

### Autenticación

- `POST /api/auth/request-magic-link` - Solicitar magic link
- `GET /api/auth/verify?token=...` - Verificar magic link
- `GET /api/auth/me` - Obtener usuario actual
- `POST /api/auth/logout` - Cerrar sesión

### Tokens (Públicos)

- `POST /api/tokens` - Generar código de 6 dígitos
- `POST /api/tokens/validate` - Validar código y generar JWT
- `GET /api/tokens/[id]` - Obtener token por ID

### Proyectos

- `GET /api/projects` - Listar proyectos (filtrado por rol)
- `POST /api/projects` - Crear proyecto
- `GET /api/projects/[id]` - Obtener proyecto
- `PATCH /api/projects/[id]` - Actualizar proyecto
- `POST /api/projects/[id]/evaluate/video` - Evaluar video demo
- `POST /api/projects/[id]/evaluate/repository` - Evaluar repositorio
- `GET /api/projects/[id]/env-configs?environment=dev|pro` - Variables de entorno del proyecto

### Estudiantes

- `GET /api/students` - Listar estudiantes (teacher/admin)
- `POST /api/students` - Crear estudiante (admin)

### Variables de Entorno (Estudiantes)

- `GET /api/student/env-configs` - Listar variables del estudiante
- `POST /api/student/env-configs` - Crear variable
- `PATCH /api/student/env-configs/[id]` - Actualizar variable
- `DELETE /api/student/env-configs/[id]` - Eliminar variable
- `POST /api/student/env-configs/batch` - Crear múltiples variables
- `GET /api/student/env-configs/global?environment=dev|pro` - Variables globales del estudiante

### Administración

- `GET /api/admin/users` - Listar usuarios
- `POST /api/admin/users` - Crear usuario
- `PATCH /api/admin/users/[email]` - Actualizar usuario
- `DELETE /api/admin/users/[email]` - Eliminar usuario
- `POST /api/admin/users/bulk` - Crear usuarios en lote
- `GET /api/admin/env-configs` - Variables globales de admin
- `POST /api/admin/env-configs` - Crear variable global
- `GET /api/admin/prompts` - Listar prompts de IA
- `POST /api/admin/prompts` - Crear prompt

### Ejemplos de Uso

Ver archivo `test.http` para ejemplos completos de todas las llamadas API.

## 👥 Roles y Permisos

### Student (Estudiante)

**Permisos:**
- Ver y gestionar sus propios proyectos
- Crear nuevos proyectos
- Editar proyectos antes de la fecha de entrega
- Ver evaluaciones de sus proyectos
- Gestionar variables de entorno (propias y globales)
- Generar JWT tokens para uso en aplicaciones externas

**Rutas:**
- `/student` - Dashboard
- `/student/projects` - Lista de proyectos
- `/student/projects/new` - Crear proyecto
- `/student/projects/[id]` - Ver proyecto
- `/student/projects/[id]/edit` - Editar proyecto
- `/student/env-configs` - Variables de entorno

### Teacher (Profesor)

**Permisos:**
- Ver todos los proyectos
- Crear proyectos para estudiantes
- Evaluar proyectos (video demo y repositorio)
- Ver lista de estudiantes
- Usar análisis de IA para evaluar código

**Rutas:**
- `/teacher` - Dashboard
- `/teacher/projects` - Lista de proyectos
- `/teacher/projects/[id]` - Ver proyecto
- `/teacher/projects/[id]/evaluate` - Evaluar proyecto
- `/teacher/projects/new` - Crear proyecto para estudiante

### Admin (Administrador)

**Permisos:**
- Todos los permisos de Teacher
- Gestión completa de usuarios (crear, editar, eliminar, cambiar roles)
- Gestión de prompts de IA
- Variables de entorno globales (aplican a todos)
- Ver estadísticas generales

**Rutas:**
- `/admin` - Dashboard
- `/admin/users` - Gestión de usuarios
- `/admin/prompts` - Gestión de prompts de IA
- `/admin/env-configs` - Variables globales
- Todas las rutas de Teacher

### Pending (Pendiente)

**Permisos:**
- Solo ver página de espera
- No puede acceder a funcionalidades hasta que un admin le asigne un rol

**Rutas:**
- `/pending` - Página de espera

## 🔧 Variables de Entorno

El sistema permite gestionar variables de entorno en tres niveles:

### 1. Por Proyecto
Variables específicas de un proyecto. Se obtienen con:
```
GET /api/projects/[id]/env-configs?environment=dev|pro
```

### 2. Globales de Estudiante
Variables globales que aplican a todos los proyectos de un estudiante. Se obtienen con:
```
GET /api/student/env-configs/global?environment=dev|pro
```

### 3. Globales de Administrador
Variables globales que aplican a todos los proyectos de todos los estudiantes. Solo accesibles desde el panel de admin.

### Características

- **Environment**: `dev`, `pro`, o `all` (aplica a ambos)
- **Scope**: `client` (NEXT_PUBLIC_) o `server` (solo servidor)
- **Batch Creation**: Crear múltiples variables desde un textarea con formato `KEY=VALUE`

## 📜 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Iniciar servidor de desarrollo
npm run build            # Compilar para producción
npm run start            # Iniciar servidor de producción
npm run lint             # Ejecutar linter

# Base de datos
npm run db:setup         # Configurar esquema de base de datos
npm run db:seed          # Poblar con datos de ejemplo
npm run db:init          # Setup + Seed

# Utilidades
npm run test:email       # Probar envío de emails
npm run download:projects # Descargar todos los proyectos
```

## 💻 Desarrollo

### Estructura de Componentes

Los componentes están organizados por funcionalidad:

- **`components/admin/`**: Gestión de usuarios, prompts, variables globales
- **`components/projects/`**: Formularios y tarjetas de proyectos
- **`components/teacher/`**: Formularios de evaluación
- **`components/common/`**: Componentes compartidos (Markdown, etc.)

### Validación

Se usa **Zod** para validación de datos en:
- Esquemas de API endpoints
- Formularios del frontend
- Validación de tipos TypeScript

### Manejo de Errores

Todos los endpoints API devuelven un formato consistente:

```typescript
{
  success: boolean,
  data?: T,
  error?: string,
  code?: string,
  message?: string
}
```

### Testing

El archivo `test.http` contiene ejemplos de todas las llamadas API para probar con herramientas como REST Client de VS Code.

### Contribuir

1. Crear una rama para la nueva funcionalidad
2. Hacer cambios y commits descriptivos
3. Ejecutar `npm run build` para verificar que no hay errores
4. Crear Pull Request

## 📝 Notas Adicionales

### Especial: Acceso Directo

El email `andresleon@outlook.com` tiene acceso directo sin magic link (para desarrollo/testing).

### GridFS para Markdown

Los comentarios de evaluación y análisis de IA se almacenan en GridFS cuando superan 1KB para optimizar el rendimiento de la base de datos.

### Análisis de Código con IA

Los profesores pueden usar análisis automático de código que:
1. Descarga el repositorio de GitHub
2. Analiza la estructura y código
3. Genera un reporte usando prompts configurables
4. Almacena el análisis en GridFS si es muy extenso

## 📄 Licencia

[Especificar licencia si aplica]

## 👤 Autor

[Información del autor]

---

**Última actualización**: Enero 2025

