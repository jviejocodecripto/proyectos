# Plan de Implementación - Sistema de Gestión de Proyectos

## Resumen del Proyecto

Sistema web Next.js 16 para gestionar proyectos académicos de alumnos basados en repositorios de GitHub, con sistema de evaluación asistido por IA y administración de usuarios con roles.

---

## Fase 0: Setup y Configuración Inicial

### 0.1 Instalación de Dependencias
```bash
cd web
npm install mongodb iron-session nodemailer @octokit/rest zod date-fns
npm install @anthropic-ai/sdk  # o npm install openai
npm install --save-dev @types/nodemailer
```

### 0.2 Configuración de Variables de Entorno
Crear `web/.env.local`:
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=proyectos

# Email (MailHog)
SMTP_HOST=localhost
SMTP_PORT=1025
EMAIL_FROM=noreply@proyectos.local

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
SESSION_SECRET=generate-a-secure-random-string-here

# AI API
ANTHROPIC_API_KEY=your-api-key-here
```

### 0.3 Verificar MongoDB
```bash
# Verificar que MongoDB está corriendo
mongosh --eval "db.version()"

# Crear base de datos y colecciones
mongosh < scripts/setup-db.js
```

### 0.4 Verificar MailHog
```bash
# MailHog debe estar corriendo en:
# Web UI: http://localhost:8025
# SMTP: localhost:1025
```

**Tiempo estimado:** 30 minutos

---

## Fase 1: Infraestructura y Base de Datos

### 1.1 Conexión a MongoDB
**Archivo:** `lib/db/mongodb.ts`

```typescript
import { MongoClient, Db } from 'mongodb';

let client: MongoClient;
let db: Db;

export async function connectToDatabase() {
  if (db) return { client, db };

  const uri = process.env.MONGODB_URI!;
  const dbName = process.env.MONGODB_DB!;

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);

  return { client, db };
}

export async function getDatabase(): Promise<Db> {
  if (!db) {
    await connectToDatabase();
  }
  return db;
}
```

### 1.2 Scripts de Base de Datos
**Archivo:** `scripts/setup-db.js`

Crear collections con validación e índices (ver DATABASE_SCHEMA.md).

**Archivo:** `scripts/seed-db.js`

Insertar datos iniciales:
- Admin por defecto
- Prompt de IA por defecto

### 1.3 Funciones de Query para Usuarios
**Archivo:** `lib/db/users.ts`

```typescript
import { getDatabase } from './mongodb';
import type { User, UserRole } from '@/types';

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = await getDatabase();
  return db.collection<User>('users').findOne({ email });
}

export async function createUser(email: string, name: string): Promise<User> {
  const db = await getDatabase();
  const user: Omit<User, '_id'> = {
    email,
    name,
    role: 'pending',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: null
  };
  const result = await db.collection('users').insertOne(user);
  return { ...user, _id: result.insertedId };
}

export async function updateUserRole(email: string, role: UserRole) {
  const db = await getDatabase();
  return db.collection('users').updateOne(
    { email },
    { $set: { role, updatedAt: new Date() } }
  );
}

export async function updateLastLogin(email: string) {
  const db = await getDatabase();
  return db.collection('users').updateOne(
    { email },
    { $set: { lastLogin: new Date() } }
  );
}

// Más funciones...
```

### 1.4 Funciones de Query para Proyectos
**Archivo:** `lib/db/projects.ts`

Similar a users.ts, implementar funciones CRUD para proyectos.

### 1.5 Funciones de Query para Magic Links
**Archivo:** `lib/db/magiclinks.ts`

Funciones para crear, validar y marcar tokens como usados.

**Tiempo estimado:** 3-4 horas

---

## Fase 2: Autenticación con Magic Link

### 2.1 Configuración de Sesiones
**Archivo:** `lib/auth/session.ts`

```typescript
import { SessionOptions } from 'iron-session';

export interface SessionData {
  email: string;
  role: string;
  isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'proyectos_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7 // 7 días
  }
};

export async function getSession(req: Request): Promise<SessionData | null> {
  // Implementar usando iron-session
}

export async function setSession(email: string, role: string): Promise<void> {
  // Implementar
}
```

### 2.2 Servicio de Email
**Archivo:** `lib/email/mailer.ts`

```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false
});

export async function sendMagicLink(email: string, token: string) {
  const magicLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify?token=${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Tu Magic Link - Sistema de Proyectos',
    html: `
      <h1>Accede a tu cuenta</h1>
      <p>Haz clic en el siguiente enlace para iniciar sesión:</p>
      <a href="${magicLink}">${magicLink}</a>
      <p>Este enlace expirará en 15 minutos.</p>
    `
  });
}
```

### 2.3 API: Solicitar Magic Link
**Archivo:** `app/api/auth/request-magic-link/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { findUserByEmail } from '@/lib/db/users';
import { createMagicLink } from '@/lib/db/magiclinks';
import { sendMagicLink } from '@/lib/email/mailer';

const schema = z.object({
  email: z.string().email()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);

    // Verificar que el usuario existe
    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Usuario no activo' },
        { status: 403 }
      );
    }

    // Generar token
    const token = crypto.randomUUID().replace(/-/g, '');

    // Guardar en DB
    await createMagicLink(email, token);

    // Enviar email
    await sendMagicLink(email, token);

    return NextResponse.json({
      success: true,
      message: 'Magic link enviado a tu email'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Email inválido' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Error del servidor' },
      { status: 500 }
    );
  }
}
```

### 2.4 API: Verificar Token
**Archivo:** `app/api/auth/verify/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { validateMagicLink, markTokenAsUsed } from '@/lib/db/magiclinks';
import { findUserByEmail, updateLastLogin } from '@/lib/db/users';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/auth/session';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=token-missing', req.url));
  }

  // Validar token
  const magicLink = await validateMagicLink(token);
  if (!magicLink) {
    return NextResponse.redirect(new URL('/login?error=invalid-token', req.url));
  }

  // Obtener usuario
  const user = await findUserByEmail(magicLink.email);
  if (!user || !user.isActive) {
    return NextResponse.redirect(new URL('/login?error=user-not-found', req.url));
  }

  // Marcar token como usado
  await markTokenAsUsed(token);

  // Actualizar last login
  await updateLastLogin(user.email);

  // Crear sesión
  const session = await getIronSession(await cookies(), sessionOptions);
  session.email = user.email;
  session.role = user.role;
  session.isLoggedIn = true;
  await session.save();

  // Redirigir según rol
  const redirectMap = {
    admin: '/admin',
    teacher: '/teacher',
    student: '/student',
    pending: '/pending'
  };

  const redirectUrl = redirectMap[user.role] || '/';
  return NextResponse.redirect(new URL(redirectUrl, req.url));
}
```

### 2.5 API: Logout
**Archivo:** `app/api/auth/logout/route.ts`

### 2.6 API: Get Current User
**Archivo:** `app/api/auth/me/route.ts`

### 2.7 Middleware de Autenticación
**Archivo:** `middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/auth/session';

const publicRoutes = ['/login', '/api/auth/request-magic-link', '/api/auth/verify'];
const roleRoutes = {
  '/admin': ['admin'],
  '/teacher': ['teacher', 'admin'],
  '/student': ['student']
};

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Permitir rutas públicas
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Verificar sesión
  const session = await getIronSession(req, NextResponse.next(), sessionOptions);

  if (!session.isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Verificar permisos de rol
  for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
    if (pathname.startsWith(route)) {
      if (!allowedRoles.includes(session.role)) {
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 403 }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
```

### 2.8 Página de Login
**Archivo:** `app/(auth)/login/page.tsx`

Formulario simple con input de email y botón "Enviar Magic Link".

**Tiempo estimado:** 5-6 horas

---

## Fase 3: Gestión de Usuarios (Admin)

### 3.1 Layout de Admin
**Archivo:** `app/(dashboard)/admin/layout.tsx`

Sidebar con navegación a:
- Dashboard
- Usuarios
- Prompts de IA

### 3.2 API: Listar Usuarios
**Archivo:** `app/api/admin/users/route.ts`

Implementar GET con paginación y filtros.

### 3.3 API: Actualizar Rol de Usuario
**Archivo:** `app/api/admin/users/[email]/role/route.ts`

Implementar PATCH.

### 3.4 API: Activar/Desactivar Usuario
**Archivo:** `app/api/admin/users/[email]/status/route.ts`

Implementar PATCH.

### 3.5 Página de Gestión de Usuarios
**Archivo:** `app/(dashboard)/admin/users/page.tsx`

Tabla con:
- Lista de usuarios
- Filtros por rol
- Búsqueda
- Acciones: Cambiar rol, activar/desactivar

**Componentes:**
- `components/admin/UserTable.tsx`
- `components/admin/UserRoleSelect.tsx`
- `components/admin/UserFilters.tsx`

**Tiempo estimado:** 4-5 horas

---

## Fase 4: Gestión de Proyectos (Student)

### 4.1 Layout de Student
**Archivo:** `app/(dashboard)/student/layout.tsx`

Navbar con:
- Mis Proyectos
- Perfil
- Logout

### 4.2 API: CRUD de Proyectos
**Archivos:**
- `app/api/projects/route.ts` (GET, POST)
- `app/api/projects/[id]/route.ts` (GET, PATCH, DELETE)

### 4.3 Página: Lista de Proyectos
**Archivo:** `app/(dashboard)/student/projects/page.tsx`

- Lista de proyectos propios
- Botón "Nuevo Proyecto"
- Ver estado y evaluaciones

### 4.4 Página: Crear/Editar Proyecto
**Archivo:** `app/(dashboard)/student/projects/new/page.tsx`
**Archivo:** `app/(dashboard)/student/projects/[id]/edit/page.tsx`

Formulario con:
- Nombre del proyecto
- URL del repositorio GitHub
- Fecha de entrega
- Validación en tiempo real

**Componentes:**
- `components/projects/ProjectForm.tsx`
- `components/projects/RepositoryValidator.tsx` (valida URL de GitHub)

### 4.5 Página: Ver Proyecto y Evaluaciones
**Archivo:** `app/(dashboard)/student/projects/[id]/page.tsx`

Muestra:
- Detalles del proyecto
- Evaluación de video demo (si existe)
- Evaluación de repositorio (si existe)
- Comentarios del profesor

**Tiempo estimado:** 6-7 horas

---

## Fase 5: Evaluación de Proyectos (Teacher)

### 5.1 Layout de Teacher
**Archivo:** `app/(dashboard)/teacher/layout.tsx`

Similar al de student pero con acceso a todos los proyectos.

### 5.2 Página: Lista de Proyectos a Evaluar
**Archivo:** `app/(dashboard)/teacher/projects/page.tsx`

- Lista todos los proyectos
- Filtros por estado (pendiente, evaluado)
- Filtro por estudiante
- Indicador de qué evaluaciones faltan

### 5.3 Página: Evaluar Proyecto
**Archivo:** `app/(dashboard)/teacher/projects/[id]/evaluate/page.tsx`

Interfaz con dos secciones:

**Sección 1: Video Demo**
- Input de nota (0-10)
- Textarea para comentarios
- Botón "Guardar Evaluación Video"

**Sección 2: Repositorio**
- Botón "Analizar con IA" (muestra análisis preliminar)
- Resultado del análisis IA
- Input de nota (0-10, pre-rellenado con sugerencia de IA)
- Textarea para comentarios adicionales
- Botón "Guardar Evaluación Repositorio"

### 5.4 Cliente de GitHub API
**Archivo:** `lib/github/client.ts`

```typescript
import { Octokit } from '@octokit/rest';

export async function getRepositoryInfo(repoUrl: string) {
  // Parsear URL: https://github.com/user/repo
  const [, , , owner, repo] = new URL(repoUrl).pathname.split('/');

  const octokit = new Octokit();

  // Obtener README
  const readme = await octokit.repos.getReadme({ owner, repo });
  const readmeContent = Buffer.from(readme.data.content, 'base64').toString();

  // Obtener estructura de archivos
  const tree = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: 'HEAD',
    recursive: 'true'
  });

  // Obtener commits recientes
  const commits = await octokit.repos.listCommits({
    owner,
    repo,
    per_page: 10
  });

  // Obtener archivos principales (package.json, main files, etc.)
  // ...

  return {
    readme: readmeContent,
    fileStructure: tree.data.tree,
    recentCommits: commits.data,
    mainCode: '...' // contenido de archivos principales
  };
}
```

### 5.5 Servicio de Análisis con IA
**Archivo:** `lib/ai/analyzer.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { getRepositoryInfo } from '@/lib/github/client';
import { getActivePrompt } from '@/lib/db/prompts';

export async function analyzeRepository(
  projectName: string,
  repositoryUrl: string,
  submissionDate: Date,
  promptId?: string
) {
  // Obtener información del repositorio
  const repoInfo = await getRepositoryInfo(repositoryUrl);

  // Obtener prompt template
  const promptTemplate = await getActivePrompt(promptId);

  // Reemplazar variables en el template
  const prompt = promptTemplate
    .replace('{{projectName}}', projectName)
    .replace('{{submissionDate}}', submissionDate.toISOString())
    .replace('{{readme}}', repoInfo.readme)
    .replace('{{fileStructure}}', JSON.stringify(repoInfo.fileStructure, null, 2))
    .replace('{{mainCode}}', repoInfo.mainCode)
    .replace('{{recentCommits}}', JSON.stringify(repoInfo.recentCommits, null, 2));

  // Llamar a API de IA
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  // Parsear respuesta y extraer puntuaciones
  const analysisText = response.content[0].text;

  return {
    analysis: analysisText,
    suggestedScore: extractSuggestedScore(analysisText),
    codeQuality: extractScore(analysisText, 'Calidad del Código'),
    documentation: extractScore(analysisText, 'Documentación'),
    functionality: extractScore(analysisText, 'Funcionalidad'),
    gitUsage: extractScore(analysisText, 'Gestión de Proyecto')
  };
}

function extractSuggestedScore(text: string): number {
  // Implementar regex para extraer puntuación sugerida
  return 8.0;
}

function extractScore(text: string, category: string): number {
  // Implementar regex para extraer puntuación por categoría
  return 8.0;
}
```

### 5.6 API: Análisis Preliminar
**Archivo:** `app/api/projects/[id]/ai-analysis/route.ts`

### 5.7 API: Evaluar Video Demo
**Archivo:** `app/api/projects/[id]/evaluate/video/route.ts`

### 5.8 API: Evaluar Repositorio
**Archivo:** `app/api/projects/[id]/evaluate/repository/route.ts`

**Tiempo estimado:** 8-10 horas

---

## Fase 6: Gestión de Prompts de IA (Admin)

### 6.1 Funciones de Query para Prompts
**Archivo:** `lib/db/prompts.ts`

CRUD para prompts de IA.

### 6.2 API: CRUD de Prompts
**Archivos:**
- `app/api/admin/prompts/route.ts` (GET, POST)
- `app/api/admin/prompts/[id]/route.ts` (PATCH, DELETE)

### 6.3 Página: Gestión de Prompts
**Archivo:** `app/(dashboard)/admin/prompts/page.tsx`

- Lista de prompts
- Indicador de cuál está activo
- Crear nuevo prompt
- Editar/eliminar prompts
- Vista previa del template

**Componentes:**
- `components/admin/PromptList.tsx`
- `components/admin/PromptEditor.tsx`
- `components/admin/PromptPreview.tsx`

**Tiempo estimado:** 4-5 horas

---

## Fase 7: UI/UX y Componentes Compartidos

### 7.1 Componentes UI Base
**Archivos en `components/ui/`:**
- `Button.tsx`
- `Input.tsx`
- `Card.tsx`
- `Table.tsx`
- `Modal.tsx`
- `Badge.tsx`
- `Alert.tsx`
- `Spinner.tsx`

### 7.2 Componentes de Layout
- `components/layout/Navbar.tsx`
- `components/layout/Sidebar.tsx`
- `components/layout/Footer.tsx`

### 7.3 Hooks Personalizados
**Archivos en `lib/hooks/`:**
- `useAuth.ts` - Hook para obtener usuario actual
- `useProjects.ts` - Hook para gestionar proyectos
- `useUsers.ts` - Hook para gestionar usuarios (admin)

### 7.4 Estilos con Tailwind
Configurar tema personalizado en `tailwind.config.ts`:
- Colores del tema
- Tipografía
- Espaciados

### 7.5 Loading y Error States
- Skeleton loaders
- Mensajes de error consistentes
- Toast notifications

**Tiempo estimado:** 5-6 horas

---

## Fase 8: Validación y Seguridad

### 8.1 Esquemas Zod
**Archivo:** `lib/utils/validation.ts`

```typescript
import { z } from 'zod';

export const emailSchema = z.string().email();

export const projectSchema = z.object({
  name: z.string().min(3).max(200),
  repositoryUrl: z.string().url().regex(/^https:\/\/github\.com\/[\w-]+\/[\w-]+$/),
  submissionDate: z.string().datetime()
});

export const evaluationSchema = z.object({
  score: z.number().min(0).max(10),
  comments: z.string().min(10)
});

export const userRoleSchema = z.enum(['student', 'teacher', 'admin', 'pending']);
```

### 8.2 Middleware de Autorización
**Archivo:** `lib/auth/middleware.ts`

Funciones helper para verificar permisos:
```typescript
export async function requireRole(req: NextRequest, allowedRoles: string[]) {
  const session = await getSession(req);
  if (!session || !allowedRoles.includes(session.role)) {
    throw new Error('No autorizado');
  }
  return session;
}

export async function requireProjectOwnership(req: NextRequest, projectId: string) {
  // Verificar que el usuario es dueño del proyecto
}
```

### 8.3 Sanitización de Inputs
- Sanitizar URLs de repositorio
- Escapar HTML en comentarios
- Validar fechas

### 8.4 Rate Limiting (Opcional)
Implementar con biblioteca como `@upstash/ratelimit` o custom.

**Tiempo estimado:** 3-4 horas

---

## Fase 9: Testing y Refinamiento

### 9.1 Testing Manual
- Flujo completo de registro y login
- Crear proyecto como student
- Evaluar proyecto como teacher
- Gestionar usuarios como admin
- Verificar permisos entre roles

### 9.2 Testing de Edge Cases
- Tokens expirados
- URLs de GitHub inválidas
- Repositorios privados
- Evaluaciones parciales
- Usuarios inactivos

### 9.3 Testing de IA
- Diferentes tipos de repositorios
- Repositorios con poco código
- Repositorios sin README
- Timeout de API de IA

### 9.4 Optimizaciones
- Cachear resultados de análisis IA
- Lazy loading de componentes
- Optimizar queries de MongoDB
- Comprimir imágenes

**Tiempo estimado:** 4-5 horas

---

## Fase 10: Documentación y Deployment

### 10.1 Documentación
- README.md con instrucciones de instalación
- Guía de usuario para cada rol
- Documentación de API
- Diagramas de flujo

### 10.2 Scripts útiles
**Archivo:** `package.json`
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "db:setup": "mongosh < scripts/setup-db.js",
    "db:seed": "mongosh < scripts/seed-db.js",
    "db:reset": "mongosh < scripts/reset-db.js"
  }
}
```

### 10.3 Docker (Opcional)
Crear `docker-compose.yml` para:
- MongoDB
- MailHog
- Aplicación Next.js

### 10.4 Variables de Producción
Preparar configuración para producción:
- MongoDB Atlas en lugar de localhost
- Servicio de email real (SendGrid, etc.)
- Variables de entorno seguras

**Tiempo estimado:** 3-4 horas

---

## Resumen de Tiempo Estimado

| Fase | Descripción | Tiempo |
|------|-------------|--------|
| 0 | Setup y Configuración | 0.5h |
| 1 | Infraestructura y DB | 4h |
| 2 | Autenticación | 6h |
| 3 | Gestión de Usuarios | 5h |
| 4 | Gestión de Proyectos (Student) | 7h |
| 5 | Evaluación (Teacher) | 10h |
| 6 | Prompts de IA (Admin) | 5h |
| 7 | UI/UX | 6h |
| 8 | Validación y Seguridad | 4h |
| 9 | Testing | 5h |
| 10 | Documentación | 4h |
| **TOTAL** | | **~56 horas** |

---

## Orden de Implementación Recomendado

1. **Fase 0-1**: Setup y base de datos (necesario para todo)
2. **Fase 2**: Autenticación (necesario para acceder)
3. **Fase 3**: Admin usuarios (para asignar roles)
4. **Fase 4**: Student proyectos (para tener datos)
5. **Fase 5**: Teacher evaluaciones (funcionalidad core)
6. **Fase 6**: Prompts IA (complemento de evaluaciones)
7. **Fase 7**: UI/UX (mejora experiencia)
8. **Fase 8-9**: Seguridad y testing
9. **Fase 10**: Documentación

---

## Próximos Pasos Inmediatos

1. Ejecutar `npm install` con todas las dependencias
2. Configurar `.env.local`
3. Crear scripts de setup de base de datos
4. Implementar conexión a MongoDB
5. Crear estructura de carpetas `lib/`, `types/`

---

## Consideraciones Importantes

### GitHub API
- Para repositorios públicos no se necesita token
- Para repositorios privados necesitarás OAuth de GitHub
- Considerar límites de rate (60 req/hora sin auth, 5000 con auth)

### IA API
- Anthropic tiene límites de tokens por minuto
- Cachear análisis para evitar llamadas repetidas
- Considerar timeout de 30-60 segundos

### MongoDB
- Crear índices adecuados para performance
- Considerar límites de tamaño de documentos (16MB)
- Backups regulares

### MailHog
- Solo para desarrollo
- En producción usar servicio real (SendGrid, Postmark, etc.)
