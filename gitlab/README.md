# GitLab CLI

CLI para gestionar usuarios y proyectos en GitLab usando la API de GitLab.

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Compilar TypeScript:
```bash
npm run build
```

## Configuración

Crear un archivo `.env` en la raíz del proyecto `gitlab/` (o en la raíz del proyecto principal `web/`) con las siguientes variables:

```env
GITLAB_URL=https://gitlab.codecrypto.academy
GITLAB_TOKEN_ROOT=tu-token-de-gitlab-aqui
```

**Nota:** El CLI buscará el archivo `.env` en el directorio actual. Si el `.env` está en otro directorio (por ejemplo, en `web/`), puedes ejecutar el CLI desde ese directorio o copiar el `.env` al directorio `gitlab/`.

## Uso

### Crear un usuario

```bash
npm run dev create-user -e usuario@example.com -u username -n "Nombre Completo"
```

Opciones adicionales:
- `-p, --password <password>`: Contraseña (si no se proporciona, se genera una aleatoria)
- `--admin`: Crear usuario como administrador
- `--can-create-group`: Permitir crear grupos
- `--skip-confirmation`: Saltar confirmación por email

Ejemplo completo:
```bash
npm run dev create-user -e test@example.com -u testuser -n "Test User" --admin --can-create-group
```

### Hacer fork de un proyecto

```bash
npm run dev fork-project -s "namespace/project" -g "subgrupo-destino" -u "username"
```

O usando el ID numérico:
```bash
npm run dev fork-project -s 123 -g "subgrupo-destino" -u "username"
```

O usando una URL completa:
```bash
npm run dev fork-project -s "https://gitlab.codecrypto.academy/codecrypto/github/98_pfm_traza_2025" -g "subgrupo-destino" -u "username"
```

Opciones:
- `-s, --source <source>`: ID numérico, path del proyecto (namespace/project) o URL completa del proyecto (requerido)
- `-g, --subgroup <subgroup>`: Nombre del subgrupo destino (requerido)
- `-u, --user <user>`: Username o email del usuario a añadir al proyecto (requerido)
- `-n, --name <name>`: Nombre opcional para el fork
- `-r, --role <role>`: Role del usuario (guest, reporter, developer, maintainer, owner). Por defecto: maintainer

Ejemplos:
```bash
# Usando path
npm run dev fork-project -s "root/mi-proyecto" -g "eth-rust" -u "usuario@example.com" -n "mi-proyecto-fork" -r "maintainer"

# Usando URL completa
npm run dev fork-project -s "https://gitlab.codecrypto.academy/codecrypto/github/98_pfm_traza_2025" -g "eth-rust" -u "usuario@example.com"

# Usando ID numérico
npm run dev fork-project -s 123 -g "ia4devs" -u "username" -r "developer"
```

**Nota:** 
- El comando acepta URLs completas de GitLab y extrae automáticamente el path del proyecto
- Después de hacer el fork, el usuario especificado será añadido automáticamente al proyecto con el role indicado (por defecto "maintainer")

### Listar usuarios

```bash
npm run dev list-users
```

Opciones:
- `-a, --all`: Listar todos los usuarios (incluye inactivos)
- `-s, --search <search>`: Buscar usuarios por nombre o email
- `--active`: Solo usuarios activos
- `--blocked`: Solo usuarios bloqueados

Ejemplos:
```bash
npm run dev list-users
npm run dev list-users --active
npm run dev list-users -s "test"
npm run dev list-users --all
```

### Listar proyectos por subgrupo

```bash
npm run dev list-projects -g "subgrupo"
```

Opciones:
- `-g, --subgroup <subgroup>`: Nombre del subgrupo (requerido)
- `-a, --archived`: Incluir proyectos archivados
- `-s, --search <search>`: Buscar proyectos por nombre

Ejemplos:
```bash
npm run dev list-projects -g "eth-rust"
npm run dev list-projects -g "ia4devs" -s "test"
npm run dev list-projects -g "eth-rust" --archived
```

### Listar grupos y subgrupos

```bash
npm run dev list-groups
```

Opciones:
- `-a, --all`: Listar todos los grupos disponibles (incluye grupos privados)
- `-s, --search <search>`: Buscar grupos por nombre
- `--top-level-only`: Solo mostrar grupos de nivel superior (sin subgrupos)

Ejemplos:
```bash
npm run dev list-groups
npm run dev list-groups --all
npm run dev list-groups -s "eth"
npm run dev list-groups --top-level-only
```

**Nota:** Este comando muestra la estructura jerárquica de grupos y subgrupos, incluyendo el ID del grupo padre para identificar relaciones.

## Desarrollo

Para ejecutar en modo desarrollo (sin compilar):
```bash
npm run dev <comando>
```

Para compilar y ejecutar:
```bash
npm run build
npm start <comando>
```

## Notas

- El CLI usa la librería `@gitbeaker/rest` para interactuar con la API de GitLab
- Las variables de entorno se cargan desde el archivo `.env` usando `dotenv`
- Todos los comandos requieren que `GITLAB_URL` y `GITLAB_TOKEN_ROOT` estén configurados

