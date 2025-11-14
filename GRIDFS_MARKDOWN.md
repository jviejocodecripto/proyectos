# GridFS para Almacenamiento de Markdown

## 🎯 Objetivo

Almacenar evaluaciones en formato Markdown de cualquier tamaño usando GridFS de MongoDB, en lugar de campos limitados de texto.

---

## 📚 ¿Qué es GridFS?

GridFS es el sistema de archivos de MongoDB que permite almacenar y recuperar archivos grandes (>16MB límite de documentos BSON). Divide los archivos en chunks de 255KB y los almacena en dos colecciones:

- `evaluations.files` - Metadata de archivos
- `evaluations.chunks` - Chunks de datos binarios

---

## 🔧 Implementación

### Archivos Creados

1. **`lib/db/gridfs.ts`** - Funciones para manejar GridFS
   - `uploadMarkdown()` - Sube contenido markdown
   - `downloadMarkdown()` - Descarga contenido markdown
   - `deleteMarkdown()` - Elimina archivo
   - `markdownExists()` - Verifica si existe
   - `getMarkdownMetadata()` - Obtiene metadata

2. **`components/common/MarkdownEditor.tsx`** - Editor con preview
   - Tabs: Escribir / Vista Previa
   - Drag & Drop para subir archivos .md
   - Botón para subir archivos
   - Preview renderizado en tiempo real
   - Contador de caracteres y líneas

3. **`components/common/MarkdownViewer.tsx`** - Visor renderizado
   - Renderiza markdown con estilos
   - Soporta tablas, listas, código, enlaces
   - Estilos consistentes con Tailwind

### Archivos Modificados

4. **`types/index.ts`** - Tipos actualizados
   - Agregado `commentsFileId?: ObjectId` a evaluaciones
   - Agregado `aiAnalysisFileId?: ObjectId` a evaluación de repo

5. **`lib/db/projects.ts`** - Lógica de almacenamiento
   - `addVideoEvaluation()` - Usa GridFS si >1KB
   - `addRepositoryEvaluation()` - Usa GridFS si >1KB
   - `loadEvaluationMarkdown()` - Carga desde GridFS
   - `findProjectById()` - Carga markdown automáticamente
   - `findProjects()` - Carga markdown para todos

6. **Formularios de evaluación**
   - `VideoEvaluationForm.tsx` - Usa MarkdownEditor
   - `RepositoryEvaluationForm.tsx` - Usa MarkdownEditor

7. **Páginas de detalle**
   - `student/projects/[id]/page.tsx` - Usa MarkdownViewer
   - `teacher/projects/[id]/page.tsx` - Usa MarkdownViewer

---

## 💾 Cómo Funciona

### Escritura (Guardar Evaluación)

```typescript
// Si el contenido es > 1KB:
if (comments.length > 1000) {
  // 1. Subir a GridFS
  const fileId = await uploadMarkdown(
    comments,
    'video-eval-123-1234567890.md',
    { projectId, evaluationType: 'video' }
  );
  
  // 2. Guardar solo el fileId en el documento
  evaluation.commentsFileId = fileId;
  evaluation.comments = ''; // String vacío
} else {
  // Contenido pequeño, guardar directamente
  evaluation.comments = comments;
}
```

### Lectura (Obtener Proyecto)

```typescript
// 1. Obtener proyecto de MongoDB
const project = await collection.findOne({ _id: projectId });

// 2. Si tiene commentsFileId, cargar desde GridFS
if (project.evaluations.videoDemo?.commentsFileId) {
  const comments = await downloadMarkdown(fileId);
  project.evaluations.videoDemo.comments = comments;
}

// 3. Retornar proyecto con contenido completo
return project;
```

---

## 📊 Estructura en MongoDB

### Documento de Proyecto

```javascript
{
  _id: ObjectId("..."),
  name: "Mi Proyecto",
  evaluations: {
    videoDemo: {
      score: 9.5,
      comments: "",  // Vacío si está en GridFS
      commentsFileId: ObjectId("..."),  // Referencia al archivo
      evaluatedBy: "profesor@example.com",
      evaluatedAt: ISODate("...")
    },
    repository: {
      score: 8.5,
      comments: "",
      commentsFileId: ObjectId("..."),
      aiAnalysis: "",
      aiAnalysisFileId: ObjectId("..."),
      ...
    }
  }
}
```

### GridFS Files

```javascript
// evaluations.files
{
  _id: ObjectId("..."),
  filename: "video-eval-123-1234567890.md",
  length: 5420,  // bytes
  chunkSize: 261120,
  uploadDate: ISODate("..."),
  metadata: {
    projectId: "123",
    evaluationType: "video",
    evaluatedBy: "profesor@example.com",
    contentType: "text/markdown",
    uploadedAt: ISODate("...")
  }
}
```

---

## 🎨 Experiencia de Usuario

### Para Profesores (Escribiendo Evaluación)

1. **Tab "Escribir"**: Editor de texto con sintaxis Markdown
2. **Tab "Vista Previa"**: Ver cómo se renderizará
3. **Arrastrar archivo .md**: Sube y carga el contenido
4. **Botón "Subir .md"**: Selecciona archivo del sistema
5. **Ayuda Markdown**: Tips de sintaxis rápida

### Para Estudiantes (Viendo Evaluación)

1. **Comentarios renderizados**: Con formato bonito
2. **Títulos, listas, código**: Todo con estilo
3. **Tablas y enlaces**: Funcionales
4. **Legible y profesional**: Mejor que texto plano

---

## 📏 Límites y Consideraciones

### Límites

- **Threshold GridFS**: 1KB (1000 caracteres)
  - Contenido < 1KB → Almacenado en documento
  - Contenido ≥ 1KB → Almacenado en GridFS

- **Máximo GridFS**: 16MB por archivo
  - Más que suficiente para evaluaciones detalladas

### Ventajas

✅ **Sin límite práctico** - Evaluaciones de cualquier tamaño
✅ **Formato rico** - Markdown con todos los elementos
✅ **Reutilizable** - Subir archivos .md existentes
✅ **Profesional** - Evaluaciones bien formateadas
✅ **Automático** - Transparente para el usuario

### Performance

- ⚡ **Lectura eficiente** - Carga bajo demanda
- 💾 **Almacenamiento optimizado** - Chunks de 255KB
- 🔄 **Streaming** - No carga todo en memoria
- 📦 **Batch loading** - Carga múltiples evaluaciones en paralelo

---

## 🧪 Testing

### Crear evaluación con markdown largo

```bash
# 1. Ir a /teacher/projects/[id]/evaluate
# 2. Escribir evaluación >1KB (más de 1000 caracteres)
# 3. Guardar
# 4. Verificar en MongoDB:

mongosh proyectos --eval "
  db.projects.findOne(
    { 'evaluations.videoDemo.commentsFileId': { \$exists: true } },
    { 'evaluations.videoDemo': 1 }
  )
"

# Debería mostrar commentsFileId pero comments vacío
```

### Ver archivos en GridFS

```bash
mongosh proyectos --eval "
  db.evaluations.files.find().forEach(printjson)
"
```

### Ver contenido de un archivo

```bash
mongosh proyectos --eval "
  const file = db.evaluations.files.findOne();
  if (file) {
    print('Archivo:', file.filename);
    print('Tamaño:', file.length, 'bytes');
    printjson(file.metadata);
  }
"
```

---

## 🗑️ Limpieza

### Eliminar archivos huérfanos (sin proyecto asociado)

```javascript
// Script para limpiar archivos GridFS no usados
use proyectos;

const gridfsFiles = db.evaluations.files.find().toArray();
const orphanFiles = [];

gridfsFiles.forEach(file => {
  const projectId = file.metadata.projectId;
  const project = db.projects.findOne({ _id: ObjectId(projectId) });
  
  if (!project) {
    orphanFiles.push(file._id);
  }
});

// Eliminar huérfanos
if (orphanFiles.length > 0) {
  print('Archivos huérfanos encontrados:', orphanFiles.length);
  orphanFiles.forEach(fileId => {
    db.evaluations.files.deleteOne({ _id: fileId });
    db.evaluations.chunks.deleteMany({ files_id: fileId });
  });
}
```

---

## 🔮 Futuras Mejoras

- [ ] Compresión de archivos antes de subir
- [ ] Versionado de evaluaciones (historial)
- [ ] Export masivo de evaluaciones en PDF
- [ ] Templates de markdown predefinidos
- [ ] Búsqueda full-text en evaluaciones
- [ ] Estadísticas de tamaño de archivos

---

## 📦 Dependencias Añadidas

```json
{
  "react-markdown": "^9.x",
  "remark-gfm": "^4.x",
  "@tailwindcss/typography": "^0.5.x"
}
```

---

## ✅ Estado Actual

- ✅ GridFS configurado y funcionando
- ✅ Editor de Markdown con preview
- ✅ Visor de Markdown con estilos
- ✅ Almacenamiento automático (>1KB → GridFS)
- ✅ Carga automática desde GridFS
- ✅ Drag & Drop de archivos .md
- ✅ Build exitoso sin errores

**Total de páginas**: 26
**Total de APIs**: 24
**Sin errores de TypeScript**: ✓
**Sin errores de compilación**: ✓

