# Diagramas del Sistema

## Arquitectura del Sistema

```mermaid
graph TB
    subgraph "Cliente"
        UI[Next.js UI]
    end

    subgraph "Backend - Next.js"
        API[API Routes]
        Auth[Auth Service]
        Email[Email Service]
        DB[Database Service]
        AI[AI Service]
        GH[GitHub Service]
    end

    subgraph "Servicios Externos"
        MongoDB[(MongoDB)]
        MailHog[MailHog/SMTP]
        Claude[Claude API]
        GitHub[GitHub API]
    end

    UI --> API
    API --> Auth
    API --> DB
    API --> AI
    API --> GH
    Auth --> Email
    DB --> MongoDB
    Email --> MailHog
    AI --> Claude
    GH --> GitHub
```

## Modelo de Datos

```mermaid
erDiagram
    USERS ||--o{ PROJECTS : "owns"
    USERS ||--o{ MAGIC_LINKS : "has"
    USERS ||--o{ AI_PROMPTS : "creates"
    PROJECTS ||--o| VIDEO_EVALUATION : "has"
    PROJECTS ||--o| REPOSITORY_EVALUATION : "has"

    USERS {
        ObjectId _id PK
        string email UK
        string role
        string name
        date createdAt
        date lastLogin
        boolean isActive
    }

    PROJECTS {
        ObjectId _id PK
        string name
        string studentEmail FK
        string repositoryUrl
        date submissionDate
        string status
        date createdAt
    }

    VIDEO_EVALUATION {
        number score
        string comments
        string evaluatedBy
        date evaluatedAt
    }

    REPOSITORY_EVALUATION {
        number score
        string comments
        string aiAnalysis
        string aiPromptUsed
        string evaluatedBy
        date evaluatedAt
    }

    MAGIC_LINKS {
        ObjectId _id PK
        string email FK
        string token UK
        date expiresAt
        boolean used
    }

    AI_PROMPTS {
        ObjectId _id PK
        string name
        string prompt
        boolean isActive
        string createdBy FK
    }
```

## Flujo de Autenticación

```mermaid
sequenceDiagram
    actor User
    participant UI as Login Page
    participant API as Auth API
    participant DB as MongoDB
    participant Email as Email Service
    participant MH as MailHog

    User->>UI: Ingresa email
    UI->>API: POST /api/auth/request-magic-link
    API->>DB: findUserByEmail()

    alt Usuario existe y está activo
        DB-->>API: User found
        API->>API: Generar token único
        API->>DB: createMagicLink(email, token)
        DB-->>API: Link guardado
        API->>Email: sendMagicLink(email, token)
        Email->>MH: Enviar email
        MH-->>Email: Email enviado
        API-->>UI: {success: true}
        UI->>User: "Revisa tu email"

        User->>MH: Abre email
        MH->>User: Muestra magic link
        User->>API: GET /api/auth/verify?token=xxx
        API->>DB: validateMagicLink(token)

        alt Token válido y no expirado
            DB-->>API: Valid token
            API->>DB: markTokenAsUsed(token)
            API->>DB: updateLastLogin(email)
            API->>API: Crear sesión
            API-->>User: Redirect a dashboard
        else Token inválido o expirado
            DB-->>API: Invalid token
            API-->>User: Redirect a login con error
        end
    else Usuario no existe o inactivo
        DB-->>API: User not found
        API-->>UI: {success: false, error}
        UI->>User: Muestra error
    end
```

## Flujo de Creación de Proyecto

```mermaid
sequenceDiagram
    actor Student
    participant UI as Projects Page
    participant API as Projects API
    participant DB as MongoDB

    Student->>UI: Clic "Nuevo Proyecto"
    UI->>Student: Muestra formulario
    Student->>UI: Completa datos
    UI->>UI: Validación client-side
    UI->>API: POST /api/projects
    API->>API: Validar sesión
    API->>API: Validar datos con Zod

    alt Datos válidos
        API->>API: Verificar URL de GitHub

        alt URL válida
            API->>DB: insertProject()
            DB-->>API: Proyecto creado
            API-->>UI: {success: true, data}
            UI->>Student: "Proyecto creado"
            UI->>UI: Redirect a lista de proyectos
        else URL inválida
            API-->>UI: {success: false, error: "URL inválida"}
            UI->>Student: Muestra error
        end
    else Datos inválidos
        API-->>UI: {success: false, error}
        UI->>Student: Muestra errores de validación
    end
```

## Flujo de Evaluación con IA

```mermaid
sequenceDiagram
    actor Teacher
    participant UI as Evaluate Page
    participant API as Evaluate API
    participant GH as GitHub Service
    participant GitHubAPI as GitHub API
    participant AI as AI Service
    participant Claude as Claude API
    participant DB as MongoDB

    Teacher->>UI: Selecciona proyecto
    UI->>API: GET /api/projects/:id
    API->>DB: findProjectById()
    DB-->>API: Project data
    API-->>UI: Project details

    Teacher->>UI: Clic "Analizar con IA"
    UI->>API: GET /api/projects/:id/ai-analysis
    API->>DB: getProject()
    DB-->>API: Project with repoUrl

    API->>GH: getRepositoryInfo(repoUrl)
    GH->>GitHubAPI: GET README
    GitHubAPI-->>GH: README content
    GH->>GitHubAPI: GET file tree
    GitHubAPI-->>GH: File structure
    GH->>GitHubAPI: GET commits
    GitHubAPI-->>GH: Commit history
    GH->>GitHubAPI: GET main files
    GitHubAPI-->>GH: Code content
    GH-->>API: Repository info

    API->>DB: getActivePrompt()
    DB-->>API: Prompt template
    API->>AI: analyzeRepository(prompt, repoInfo)
    AI->>AI: Rellenar template
    AI->>Claude: POST /messages
    Note over AI,Claude: Envía prompt con<br/>info del repositorio
    Claude-->>AI: Análisis completo
    AI->>AI: Parsear respuesta
    AI-->>API: Analysis result

    API-->>UI: {analysis, scores, comments}
    UI->>Teacher: Muestra análisis

    Teacher->>UI: Revisa análisis
    Teacher->>UI: Ajusta nota si necesario
    Teacher->>UI: Añade comentarios
    Teacher->>UI: Clic "Guardar Evaluación"

    UI->>API: POST /api/projects/:id/evaluate/repository
    API->>DB: updateProjectEvaluation()
    DB-->>API: Evaluation saved
    API-->>UI: {success: true}
    UI->>Teacher: "Evaluación guardada"
```

## Flujo de Gestión de Usuarios (Admin)

```mermaid
sequenceDiagram
    actor Admin
    participant UI as Admin Dashboard
    participant API as Admin API
    participant DB as MongoDB
    participant Email as Email Service

    Admin->>UI: Accede a Gestión de Usuarios
    UI->>API: GET /api/admin/users
    API->>API: Verificar rol admin
    API->>DB: findAllUsers()
    DB-->>API: Lista de usuarios
    API-->>UI: {users, pagination}
    UI->>Admin: Muestra tabla de usuarios

    Admin->>UI: Aplica filtro "pending"
    UI->>API: GET /api/admin/users?role=pending
    API->>DB: findUsers({role: 'pending'})
    DB-->>API: Usuarios pendientes
    API-->>UI: {users}
    UI->>Admin: Muestra solo pendientes

    Admin->>UI: Selecciona usuario
    Admin->>UI: Cambia rol a "student"
    UI->>API: PATCH /api/admin/users/:email/role
    Note over UI,API: {role: "student"}
    API->>API: Verificar rol admin
    API->>API: Validar nuevo rol
    API->>DB: updateUserRole(email, role)
    DB-->>API: Usuario actualizado

    alt Notificación habilitada
        API->>Email: sendRoleAssignedEmail()
        Email->>Email: Enviar email al usuario
    end

    API-->>UI: {success: true, user}
    UI->>Admin: "Rol actualizado"
    UI->>UI: Actualizar tabla
```

## Estados de un Proyecto

```mermaid
stateDiagram-v2
    [*] --> Pending: Student crea proyecto

    Pending --> Submitted: Student completa y envía
    Pending --> Pending: Student edita (antes de fecha)
    Pending --> [*]: Student elimina

    Submitted --> PartiallyEvaluated: Teacher evalúa video
    Submitted --> PartiallyEvaluated: Teacher evalúa repo

    PartiallyEvaluated --> Evaluated: Teacher completa evaluaciones
    PartiallyEvaluated --> PartiallyEvaluated: Teacher evalúa parte faltante

    Evaluated --> [*]: Proyecto finalizado

    note right of Pending
        Editable por student
        Antes de fecha de entrega
    end note

    note right of Submitted
        No editable
        Esperando evaluación
    end note

    note right of PartiallyEvaluated
        Una evaluación completa
        Video O Repositorio
    end note

    note right of Evaluated
        Ambas evaluaciones completas
        Video Y Repositorio
    end note
```

## Roles y Permisos

```mermaid
graph TB
    subgraph Roles
        Pending[Pending<br/>Usuario nuevo]
        Student[Student<br/>Estudiante]
        Teacher[Teacher<br/>Profesor]
        Admin[Admin<br/>Administrador]
    end

    subgraph Acciones Student
        CreateProject[Crear proyectos]
        ViewOwnProjects[Ver propios proyectos]
        EditOwnProjects[Editar propios proyectos]
        DeleteOwnProjects[Eliminar propios proyectos]
        ViewEvaluations[Ver evaluaciones]
    end

    subgraph Acciones Teacher
        ViewAllProjects[Ver todos proyectos]
        EvaluateVideo[Evaluar video demo]
        EvaluateRepo[Evaluar repositorio]
        UseAI[Usar análisis IA]
    end

    subgraph Acciones Admin
        ManageUsers[Gestionar usuarios]
        AssignRoles[Asignar roles]
        ManagePrompts[Gestionar prompts IA]
        ViewStats[Ver estadísticas]
    end

    Pending -.->|Admin asigna rol| Student
    Pending -.->|Admin asigna rol| Teacher
    Pending -.->|Admin asigna rol| Admin

    Student --> CreateProject
    Student --> ViewOwnProjects
    Student --> EditOwnProjects
    Student --> DeleteOwnProjects
    Student --> ViewEvaluations

    Teacher --> ViewAllProjects
    Teacher --> EvaluateVideo
    Teacher --> EvaluateRepo
    Teacher --> UseAI

    Admin --> ManageUsers
    Admin --> AssignRoles
    Admin --> ManagePrompts
    Admin --> ViewStats
    Admin -.->|Puede hacer todo| ViewAllProjects
```

## Arquitectura de Carpetas

```mermaid
graph TB
    Root[PROYECTOS/]

    Root --> Web[web/]
    Root --> Scripts[scripts/]
    Root --> Docs[docs/]

    Web --> App[app/]
    Web --> Lib[lib/]
    Web --> Components[components/]
    Web --> Types[types/]

    App --> Auth["(auth)/<br/>Login pages"]
    App --> Dashboard["(dashboard)/<br/>Dashboards"]
    App --> API[api/]

    Dashboard --> StudentPages[student/]
    Dashboard --> TeacherPages[teacher/]
    Dashboard --> AdminPages[admin/]

    API --> AuthAPI[auth/]
    API --> ProjectsAPI[projects/]
    API --> AdminAPI[admin/]

    Lib --> DB[db/]
    Lib --> AuthLib[auth/]
    Lib --> EmailLib[email/]
    Lib --> AILib[ai/]
    Lib --> GitHubLib[github/]

    Components --> UI[ui/]
    Components --> ProjectsComp[projects/]
    Components --> AdminComp[admin/]

    style Root fill:#e1f5ff
    style Web fill:#fff4e6
    style App fill:#e8f5e9
    style Lib fill:#f3e5f5
    style Components fill:#fff9c4
```

## Flujo de Datos en Evaluación

```mermaid
graph LR
    subgraph Input
        Repo[Repositorio GitHub]
        Prompt[Prompt Template]
    end

    subgraph Procesamiento
        Extract[Extraer Info]
        Build[Construir Prompt]
        AI[Llamar IA]
        Parse[Parsear Resultado]
    end

    subgraph Output
        Analysis[Análisis Detallado]
        Scores[Puntuaciones]
        Suggestions[Sugerencias]
    end

    Repo --> Extract
    Extract --> Build
    Prompt --> Build
    Build --> AI
    AI --> Parse
    Parse --> Analysis
    Parse --> Scores
    Parse --> Suggestions

    style Repo fill:#e3f2fd
    style Prompt fill:#e3f2fd
    style Analysis fill:#c8e6c9
    style Scores fill:#c8e6c9
    style Suggestions fill:#c8e6c9
```

## Ciclo de Vida de un Token

```mermaid
timeline
    title Magic Link Token Lifecycle

    section Creación
        Usuario solicita login : POST /request-magic-link
        Sistema genera token : crypto.randomUUID()
        Token guardado en DB : expiresAt = now + 15min
        Email enviado : Link con token

    section Validación
        Usuario hace clic : GET /verify?token=xxx
        Sistema valida : token existe + no expirado + no usado
        Sesión creada : iron-session
        Token marcado usado : used = true

    section Expiración
        TTL index activo : MongoDB auto-delete
        Después de 15min : Documento eliminado
```

## Integración con Servicios Externos

```mermaid
graph TB
    App[Next.js App]

    subgraph "Base de Datos"
        Mongo[MongoDB<br/>localhost:27017]
    end

    subgraph "Email"
        Mail[MailHog<br/>localhost:1025]
        MailUI[MailHog UI<br/>localhost:8025]
    end

    subgraph "IA"
        Claude[Claude API<br/>api.anthropic.com]
    end

    subgraph "GitHub"
        GitHubAPI[GitHub API<br/>api.github.com]
    end

    App -->|MongoDB Driver| Mongo
    App -->|Nodemailer| Mail
    Mail --> MailUI
    App -->|@anthropic-ai/sdk| Claude
    App -->|@octokit/rest| GitHubAPI

    style App fill:#1976d2,color:#fff
    style Mongo fill:#4caf50,color:#fff
    style Mail fill:#ff9800,color:#fff
    style Claude fill:#9c27b0,color:#fff
    style GitHubAPI fill:#000,color:#fff
```

## Middleware Flow

```mermaid
flowchart TD
    Start([Request]) --> IsPublic{Es ruta<br/>pública?}

    IsPublic -->|Sí| Allow[Permitir]
    IsPublic -->|No| HasSession{Tiene<br/>sesión?}

    HasSession -->|No| Redirect401[Redirect a /login]
    HasSession -->|Sí| CheckRole{Verificar<br/>rol}

    CheckRole -->|Admin route| IsAdmin{Es admin?}
    CheckRole -->|Teacher route| IsTeacher{Es teacher<br/>o admin?}
    CheckRole -->|Student route| IsStudent{Es student?}
    CheckRole -->|Public dashboard| Allow

    IsAdmin -->|Sí| Allow
    IsAdmin -->|No| Error403[Error 403]

    IsTeacher -->|Sí| Allow
    IsTeacher -->|No| Error403

    IsStudent -->|Sí| Allow
    IsStudent -->|No| Error403

    Allow --> End([Continue])
    Redirect401 --> End
    Error403 --> End

    style Start fill:#e3f2fd
    style End fill:#c8e6c9
    style Allow fill:#4caf50,color:#fff
    style Error403 fill:#f44336,color:#fff
    style Redirect401 fill:#ff9800,color:#fff
```
