# ✅ Solución Aplicada - Problema de Creación de Usuarios

## Resumen del Problema

La aplicación fallaba al crear usuarios con error:
```
MongoServerError: Document failed validation
```

**Causa**: Mismatch entre el esquema TypeScript (`roles: array`) y el validador MongoDB (`role: string`)

---

## ✅ Solución Aplicada

### 1. Base de Datos - MongoDB ✓
- ✓ Migrados 13 usuarios de `role` (singular) a `roles` (array)
- ✓ Eliminado completamente el campo `role` antiguo
- ✓ Validador actualizado para requerir `roles` como array
- ✓ Índices actualizados (`role_1` → `roles_1`)

### 2. Scripts Actualizados ✓
- ✓ `scripts/setup-db.js` - Ahora usa `roles: array`
- ✓ `scripts/seed-db.js` - Todos los inserts usan `roles: ["admin"]`
- ✓ `scripts/fix-users-schema.js` - Script de migración creado

### 3. Documentación Actualizada ✓
- ✓ `DATABASE_SCHEMA.md` - Actualizado con el nuevo esquema
- ✓ Todos los ejemplos usan `roles` como array

---

## 🧪 Cómo Probar

### Opción 1: Desde la Aplicación Web (Recomendado)

1. **Reinicia el servidor** (si está corriendo):
   ```bash
   cd /Users/joseviejo/2025/cc/PROYECTOS/web
   # Ctrl+C para detener si está corriendo
   npm run dev
   ```

2. **Abre el navegador** y haz un **Hard Refresh**:
   - Chrome/Edge: `Cmd + Shift + R` (Mac) o `Ctrl + Shift + R` (Windows)
   - Safari: `Cmd + Option + R`

3. **Navega a**: http://localhost:3000/admin/users

4. **Haz clic en "Crear Usuario"** y completa el formulario:
   - Email: `test@example.com`
   - Nombre: `Usuario de Prueba`
   - Roles: Marca "Estudiante"
   - Usuario activo: ✓

5. **Haz clic en "Crear"**

### Opción 2: Usando el Script de Test

```bash
cd /Users/joseviejo/2025/cc/PROYECTOS
./test-user-creation.sh
```

### Opción 3: Directamente con MongoDB (Ya probado ✓)

```bash
mongosh proyectos --eval "
db.users.insertOne({
  email: 'test-' + Date.now() + '@example.com',
  roles: ['student'],
  name: 'Usuario de Prueba',
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLogin: null,
  isActive: true
});
"
```

---

## 🔍 Verificación del Esquema

Para verificar que todo está correcto en MongoDB:

```bash
cd /Users/joseviejo/2025/cc/PROYECTOS
mongosh proyectos --quiet --eval "
print('Usuarios con campo role antiguo:', db.users.countDocuments({ role: { \$exists: true } }));
print('Usuarios con campo roles nuevo:', db.users.countDocuments({ roles: { \$exists: true } }));
print('');
print('Muestra de usuarios:');
db.users.find({}, { email: 1, roles: 1, _id: 0 }).limit(3).forEach(printjson);
"
```

**Resultado esperado**:
- Usuarios con campo `role` antiguo: **0**
- Usuarios con campo `roles` nuevo: **16** (o el total de usuarios)

---

## 📝 Qué Cambió

### Antes (❌ Incorrecto)
```javascript
// MongoDB
{
  email: "user@example.com",
  role: "student",        // ❌ String singular
  name: "Usuario"
}
```

### Ahora (✅ Correcto)
```javascript
// MongoDB
{
  email: "user@example.com",
  roles: ["student"],     // ✅ Array
  name: "Usuario"
}
```

---

## 🐛 Si Todavía Tienes Problemas

### 1. Verifica que el servidor esté actualizado
```bash
# Detén el servidor (Ctrl+C)
cd /Users/joseviejo/2025/cc/PROYECTOS/web
npm run dev
```

### 2. Limpia la caché del navegador
- Abre DevTools (F12)
- Right-click en el botón de refresh → "Empty Cache and Hard Reload"

### 3. Verifica la consola del navegador (F12)
- Ve a la pestaña "Console"
- Busca errores en rojo cuando intentas crear un usuario

### 4. Verifica los logs del servidor
- Mira la terminal donde está corriendo `npm run dev`
- Busca errores cuando intentas crear un usuario

### 5. Prueba directamente la API
```bash
# Necesitas estar autenticado como admin
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "roles": ["student"],
    "isActive": true
  }'
```

---

## 📧 ¿Qué Error Específico Ves?

Si el problema persiste, por favor comparte:
1. El mensaje de error exacto de la consola del navegador
2. El mensaje de error del servidor (terminal)
3. El resultado de la verificación del esquema (comando arriba)

Esto me ayudará a identificar si hay algún otro problema.

