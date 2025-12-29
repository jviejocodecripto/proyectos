# Sistema de Gestión de Proyectos Académicos

Sistema web para la gestión y evaluación de proyectos académicos basados en repositorios de GitHub, con evaluación asistida por IA.

## Documentación

- **[SPECS.md](./SPECS.md)** - Especificaciones técnicas completas del sistema
- **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** - Esquemas de MongoDB, índices y queries
- **[API_ENDPOINTS.md](./API_ENDPOINTS.md)** - Documentación completa de la API REST
- **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** - Plan de implementación por fases
- **[TYPES.md](./TYPES.md)** - Definiciones de tipos TypeScript

## Características Principales

### 👨‍🎓 Para Estudiantes
- Registro y autenticación con magic link
- Crear y gestionar proyectos
- Asociar repositorios de GitHub
- Ver evaluaciones y comentarios de profesores
- Seguimiento del estado de proyectos

### 👨‍🏫 Para Profesores
- Ver todos los proyectos de estudiantes
- Evaluar videos demo con notas y comentarios
- Analizar repositorios de GitHub con ayuda de IA
- Evaluar código con análisis automático
- Dejar feedback constructivo

### 👨‍💼 Para Administradores
- Gestionar usuarios y asignar roles
- Configurar prompts de evaluación con IA
- Ver estadísticas del sistema
- Activar/desactivar usuarios

## Stack Tecnológico

- **Frontend/Backend**: Next.js 16 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **Base de datos**: MongoDB (driver nativo)
- **Autenticación**: Magic Link (sin contraseña)
- **Email**: MailHog (desarrollo) / SendGrid (producción)
- **IA**: Claude (Anthropic) o GPT (OpenAI)
- **GitHub**: Octokit API

## Estructura del Proyecto

```
PROYECTOS/
├── web/                          # Aplicación Next.js
│   ├── app/                      # App Router
│   │   ├── (auth)/              # Páginas de autenticación
│   │   ├── (dashboard)/         # Dashboards por rol
│   │   └── api/                 # API Routes
│   ├── lib/                     # Lógica de negocio
│   │   ├── db/                  # Funciones de base de datos
│   │   ├── auth/                # Autenticación y sesiones
│   │   ├── email/               # Envío de emails
│   │   ├── ai/                  # Análisis con IA
│   │   └── github/              # Cliente GitHub API
│   ├── components/              # Componentes React
│   ├── types/                   # Tipos TypeScript
│   └── middleware.ts            # Middleware global
├── scripts/                      # Scripts de utilidad
│   ├── setup-db.js              # Crear colecciones e índices
│   ├── seed-db.js               # Datos iniciales
│   └── reset-db.js              # Resetear base de datos
├── SPECS.md                      # Especificaciones
├── DATABASE_SCHEMA.md            # Esquemas de BD
├── API_ENDPOINTS.md              # Documentación de API
├── IMPLEMENTATION_PLAN.md        # Plan de implementación
└── README.md                     # Este archivo
```

## Instalación y Configuración

### Prerrequisitos

- Node.js 20+
- MongoDB 7+
- MailHog (para desarrollo)
- Cuenta de Anthropic o OpenAI (para IA)

### Paso 1: Instalar Dependencias

```bash
cd web
npm install
```

### Paso 2: Configurar Variables de Entorno

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
SESSION_SECRET=your-secure-secret-key-here

# AI API
ANTHROPIC_API_KEY=sk-ant-...
```

### Paso 3: Inicializar Base de Datos

```bash
# Verificar MongoDB
mongosh --eval "db.version()"

# Crear collections e índices
npm run db:setup

# Insertar datos iniciales
npm run db:seed
```

### Paso 4: Iniciar MailHog

```bash
# Si está instalado con Homebrew (macOS)
mailhog

# Si está instalado con Docker
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog
```

### Paso 5: Iniciar Aplicación

```bash
npm run dev
```

La aplicación estará disponible en:
- **App**: http://localhost:3000
- **MailHog UI**: http://localhost:8025

### Usuario Inicial

Después de ejecutar el seed:
- **Email**: admin@example.com
- **Rol**: admin

Para iniciar sesión:
1. Ir a http://localhost:3000/login
2. Ingresar admin@example.com
3. Revisar el magic link en MailHog (http://localhost:8025)
4. Hacer clic en el link del email

## Flujo de Uso

### 1. Registro de Usuario

1. Usuario accede a `/login`
2. Ingresa su email
3. Se crea cuenta con rol "pending"
4. Admin asigna el rol correspondiente

### 2. Login con Magic Link

1. Usuario ingresa email en `/login`
2. Sistema envía magic link por email
3. Usuario hace clic en el link
4. Sistema crea sesión y redirige a dashboard

### 3. Envío de Proyecto (Student)

1. Student accede a "Mis Proyectos"
2. Crea nuevo proyecto con:
   - Nombre del proyecto
   - URL del repositorio GitHub
   - Fecha de entrega
3. Proyecto queda visible para teachers

### 4. Evaluación de Proyecto (Teacher)

1. Teacher ve lista de proyectos
2. Selecciona un proyecto para evaluar
3. **Evalúa video demo**:
   - Nota del 0 al 10
   - Comentarios
4. **Evalúa repositorio**:
   - Sistema analiza repo con IA
   - Teacher revisa análisis
   - Ajusta nota si es necesario
   - Añade comentarios adicionales
5. Student puede ver sus evaluaciones

### 5. Gestión de Sistema (Admin)

1. Ver todos los usuarios
2. Asignar roles a usuarios nuevos
3. Gestionar prompts de IA
4. Ver estadísticas generales

## Roles y Permisos

| Acción | Student | Teacher | Admin |
|--------|---------|---------|-------|
| Ver propios proyectos | ✅ | ✅ | ✅ |
| Ver todos los proyectos | ❌ | ✅ | ✅ |
| Crear proyecto | ✅ | ❌ | ❌ |
| Editar propio proyecto | ✅ | ❌ | ❌ |
| Eliminar propio proyecto | ✅ | ❌ | ✅ |
| Evaluar proyectos | ❌ | ✅ | ❌ |
| Gestionar usuarios | ❌ | ❌ | ✅ |
| Gestionar prompts IA | ❌ | ❌ | ✅ |

## Evaluación con IA

### Proceso de Análisis

1. **Extracción de información del repositorio**:
   - README.md
   - Estructura de archivos
   - Código principal
   - Historial de commits
   - package.json / requirements.txt

2. **Análisis con IA**:
   - Calidad del código
   - Documentación
   - Buenas prácticas
   - Completitud del proyecto
   - Uso de Git

3. **Resultado**:
   - Puntuación sugerida
   - Puntos fuertes
   - Áreas de mejora
   - Comentarios detallados

### Prompts Personalizables

Los administradores pueden:
- Crear múltiples prompts de evaluación
- Activar/desactivar prompts
- Personalizar criterios de evaluación
- Usar variables: `{{projectName}}`, `{{readme}}`, etc.

## API REST

Ver documentación completa en [API_ENDPOINTS.md](./API_ENDPOINTS.md).

### Endpoints Principales

```
POST   /api/auth/request-magic-link
GET    /api/auth/verify?token=xxx
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
DELETE /api/projects/:id

POST   /api/projects/:id/evaluate/video
POST   /api/projects/:id/evaluate/repository
GET    /api/projects/:id/ai-analysis

GET    /api/admin/users
PATCH  /api/admin/users/:email/role
PATCH  /api/admin/users/:email/status

GET    /api/admin/prompts
POST   /api/admin/prompts
PATCH  /api/admin/prompts/:id
DELETE /api/admin/prompts/:id
```

## Base de Datos

Ver esquemas completos en [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md).

### Collections

- **users**: Usuarios del sistema
- **projects**: Proyectos de estudiantes
- **magiclinks**: Tokens de autenticación
- **aiPrompts**: Templates de prompts para IA

### Scripts Útiles

```bash
# Configurar base de datos
npm run db:setup

# Insertar datos iniciales
npm run db:seed

# Resetear base de datos
npm run db:reset

# Backup
mongodump --db=proyectos --out=/backup/proyectos-$(date +%Y%m%d)

# Restore
mongorestore --db=proyectos /backup/proyectos-20250115/proyectos
```

## Desarrollo

### Scripts NPM

```bash
npm run dev      # Iniciar en modo desarrollo
npm run build    # Construir para producción
npm run start    # Iniciar en modo producción
npm run lint     # Verificar código
```

### Estructura de Código

```typescript
// Ejemplo de API Route con tipos
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, ProjectDTO } from '@/types';

export async function GET(req: NextRequest) {
  try {
    // Lógica...
    const response: ApiResponse<ProjectDTO[]> = {
      success: true,
      data: projects
    };
    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor'
    };
    return NextResponse.json(response, { status: 500 });
  }
}
```

## Seguridad

### Autenticación
- Magic links con expiración de 15 minutos
- Tokens de un solo uso
- Sesiones encriptadas con iron-session

### Autorización
- Middleware de verificación de roles
- Validación de permisos en cada endpoint
- Estudiantes solo acceden a sus propios proyectos

### Validación
- Validación con Zod en todos los inputs
- Sanitización de URLs de GitHub
- Prevención de inyección NoSQL

### Rate Limiting
Considerar implementar en:
- Solicitud de magic links (3 por 15 min)
- Análisis con IA (5 por hora)

## Testing

### Testing Manual

Verificar:
- [ ] Registro y login con magic link
- [ ] Asignación de roles por admin
- [ ] Creación de proyecto por student
- [ ] Edición de proyecto antes de fecha
- [ ] Evaluación de video demo por teacher
- [ ] Análisis de repositorio con IA
- [ ] Evaluación de repositorio por teacher
- [ ] Permisos entre roles
- [ ] Tokens expirados
- [ ] URLs de GitHub inválidas

### Testing de IA

Probar con diferentes tipos de repos:
- Repositorios completos con README
- Repositorios sin documentación
- Repositorios con poco código
- Diferentes lenguajes de programación

## Deployment

### Variables de Producción

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/proyectos
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxx
EMAIL_FROM=noreply@tudominio.com
NEXT_PUBLIC_APP_URL=https://tudominio.com
SESSION_SECRET=your-production-secret-key
ANTHROPIC_API_KEY=sk-ant-xxx
```

### Consideraciones

- Usar MongoDB Atlas en lugar de localhost
- Usar SendGrid u otro servicio de email real
- Configurar HTTPS
- Habilitar CORS si es necesario
- Configurar rate limiting
- Implementar logging
- Configurar backups automáticos

## Roadmap Futuro

### Fase 1 (MVP)
- [x] Autenticación con magic link
- [x] Gestión de usuarios por admin
- [x] CRUD de proyectos por estudiantes
- [x] Evaluación básica por profesores
- [x] Integración con IA para análisis

### Fase 2 (Mejoras)
- [ ] Estadísticas y dashboards
- [ ] Notificaciones por email
- [ ] Filtros y búsquedas avanzadas
- [ ] Exportación de datos (CSV, PDF)
- [ ] Tests automatizados

### Fase 3 (Features Avanzadas)
- [ ] Sistema de comentarios en proyectos
- [ ] Revisión por pares (peer review)
- [ ] Integración con CI/CD (ver tests del repo)
- [ ] Badges y gamificación
- [ ] API pública con tokens
- [ ] Mobile app

## Contribución

Para contribuir al proyecto:

1. Fork el repositorio
2. Crear rama de feature (`git checkout -b feature/nueva-feature`)
3. Commit cambios (`git commit -m 'Add nueva feature'`)
4. Push a la rama (`git push origin feature/nueva-feature`)
5. Crear Pull Request

## Licencia

MIT

## Soporte

Para preguntas o issues:
- Crear issue en GitHub
- Email: soporte@tudominio.com

## Créditos

Desarrollado para gestión de proyectos académicos.

---

**Nota**: Este es un sistema educativo. Asegúrate de cumplir con las políticas de privacidad y protección de datos al manejar información de estudiantes.
