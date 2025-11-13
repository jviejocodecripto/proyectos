#!/bin/bash

# Script para probar la creación de usuarios
# Asegúrate de que el servidor de Next.js esté corriendo en http://localhost:3000

echo "=== Test de Creación de Usuario ==="
echo ""

# Primero necesitas obtener una cookie de sesión de admin
echo "⚠️  IMPORTANTE: Este test requiere que tengas una sesión de admin activa."
echo "   1. Ve a http://localhost:3000/login"
echo "   2. Ingresa con admin@example.com"
echo "   3. Abre DevTools (F12) > Application > Cookies"
echo "   4. Copia el valor de la cookie 'session'"
echo ""
read -p "Pega tu cookie de sesión aquí: " SESSION_COOKIE

if [ -z "$SESSION_COOKIE" ]; then
    echo "❌ No se proporcionó cookie de sesión"
    exit 1
fi

echo ""
echo "Probando crear un usuario de prueba..."
echo ""

# Crear usuario de prueba
TIMESTAMP=$(date +%s)
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST http://localhost:3000/api/admin/users \
    -H "Content-Type: application/json" \
    -H "Cookie: session=$SESSION_COOKIE" \
    -d "{
        \"email\": \"test-$TIMESTAMP@example.com\",
        \"name\": \"Usuario Test $TIMESTAMP\",
        \"roles\": [\"student\"],
        \"isActive\": true
    }")

# Separar body y status
HTTP_BODY=$(echo "$RESPONSE" | sed -e 's/HTTP_STATUS\:.*//g')
HTTP_STATUS=$(echo "$RESPONSE" | tr -d '\n' | sed -e 's/.*HTTP_STATUS://')

echo "Status HTTP: $HTTP_STATUS"
echo ""
echo "Respuesta:"
echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
echo ""

if [ "$HTTP_STATUS" = "201" ]; then
    echo "✅ ¡Usuario creado exitosamente!"
    echo ""
    echo "Verificando en MongoDB..."
    mongosh proyectos --quiet --eval "
        const user = db.users.findOne({ email: 'test-$TIMESTAMP@example.com' }, { email: 1, roles: 1, name: 1, _id: 0 });
        if (user) {
            print('✓ Usuario encontrado en DB:');
            printjson(user);
        } else {
            print('✗ Usuario NO encontrado en DB');
        }
    "
elif [ "$HTTP_STATUS" = "401" ] || [ "$HTTP_STATUS" = "403" ]; then
    echo "❌ Error de autenticación/autorización"
    echo "   Verifica que la cookie sea válida y que seas admin"
else
    echo "❌ Error al crear usuario"
fi

echo ""
echo "=== Fin del Test ==="

