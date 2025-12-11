# Script de Descarga de Proyectos

Este script descarga todos los proyectos de la base de datos MongoDB y los organiza en carpetas individuales.

## Funcionalidades

Para cada proyecto, el script:

1. **Crea una carpeta** con el formato: `{email}-{id}`
2. **Guarda un JSON** (`project.json`) con todos los datos del proyecto
3. **Clona el repositorio** de GitHub en la subcarpeta `repository/`
4. **Descarga el video** (si es una URL directa) o guarda la URL en `video-url.txt`
5. **Descarga evaluaciones desde GridFS** (si existen):
   - `evaluations/video-comments.md` - Comentarios de evaluación de video
   - `evaluations/repository-comments.md` - Comentarios de evaluación de repositorio
   - `evaluations/ai-analysis.md` - Análisis de IA

## Estructura de Carpetas

```
downloads/
├── usuario1@example.com-507f1f77bcf86cd799439012/
│   ├── project.json
│   ├── repository/
│   │   └── [código clonado del repositorio]
│   ├── video.mp4 (o video-url.txt)
│   └── evaluations/
│       ├── video-comments.md (si existe)
│       ├── repository-comments.md (si existe)
│       └── ai-analysis.md (si existe)
├── usuario2@example.com-507f1f77bcf86cd799439013/
│   └── ...
```

## Uso

### Opción 1: Usando npm script

```bash
cd web
npm run download:projects
```

### Opción 2: Ejecutar directamente con tsx

```bash
cd web
tsx scripts/download-projects.ts
```

## Variables de Entorno

El script usa las siguientes variables de entorno (con valores por defecto):

- `MONGODB_URI` - URI de conexión a MongoDB (default: `mongodb://localhost:27017`)
- `MONGODB_DB` - Nombre de la base de datos (default: `proyectos`)
- `DOWNLOAD_DIR` - Directorio donde se descargarán los proyectos (default: `./downloads`)

### Ejemplo con variables personalizadas:

```bash
MONGODB_URI="mongodb://localhost:27017" \
MONGODB_DB="proyectos" \
DOWNLOAD_DIR="/ruta/personalizada/descargas" \
npm run download:projects
```

## Requisitos

- Node.js instalado
- Git instalado (para clonar repositorios)
- Acceso a MongoDB
- Conexión a internet (para clonar repositorios y descargar videos)

## Notas

- Si un repositorio ya existe, el script lo omite (no vuelve a clonar)
- Los videos de YouTube, Vimeo, etc. no se pueden descargar directamente, solo se guarda la URL
- El script continúa procesando proyectos aunque falle alguno individual
- Los errores se muestran en consola pero no detienen el proceso completo

## Solución de Problemas

### Error de conexión a MongoDB
Asegúrate de que MongoDB esté corriendo y que la URI sea correcta.

### Error al clonar repositorio
- Verifica que la URL del repositorio sea válida
- Algunos repositorios pueden ser privados y requerir autenticación
- El timeout es de 5 minutos por repositorio

### Error al descargar video
- Si el video es de YouTube/Vimeo, solo se guardará la URL
- Para videos directos, verifica que la URL sea accesible

