# Configuración de Email Service

El sistema utiliza **Resend** para envío de emails en producción y **MailHog** (Nodemailer) para desarrollo.

## Desarrollo (MailHog + Nodemailer)

### Requisitos
1. Tener MailHog instalado y corriendo
2. Configurar las variables de entorno en `.env.local`

### Instalación de MailHog

**macOS:**
```bash
brew install mailhog
mailhog
```

**Docker:**
```bash
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog
```

**Linux:**
```bash
# Descargar binario
wget https://github.com/mailhog/MailHog/releases/download/v1.0.1/MailHog_linux_amd64
chmod +x MailHog_linux_amd64
sudo mv MailHog_linux_amd64 /usr/local/bin/mailhog
mailhog
```

### Variables de Entorno (Desarrollo)

```env
# Email (MailHog)
SMTP_HOST=localhost
SMTP_PORT=1025
EMAIL_FROM=noreply@proyectos.local
```

### Verificar emails
Accede a http://localhost:8025 para ver los emails capturados por MailHog.

---

## Producción (Resend)

### Requisitos
1. Cuenta en [Resend](https://resend.com)
2. Dominio verificado en Resend
3. API Key de Resend

### Configuración

1. **Crear cuenta en Resend:**
   - Regístrate en https://resend.com
   - Verifica tu email

2. **Agregar y verificar tu dominio:**
   - En el dashboard de Resend, ve a "Domains"
   - Agrega tu dominio (ej: `tudominio.com`)
   - Configura los registros DNS según las instrucciones de Resend
   - Espera la verificación del dominio

3. **Obtener API Key:**
   - Ve a "API Keys" en el dashboard
   - Crea una nueva API Key
   - Copia la API Key (solo se muestra una vez)

### Variables de Entorno (Producción)

```env
# Email (Resend)
RESEND_API_KEY=re_your_resend_api_key_here
EMAIL_FROM=noreply@tudominio.com
NODE_ENV=production
```

### Importante

- `EMAIL_FROM` debe usar un dominio verificado en Resend
- El sistema detecta automáticamente el entorno:
  - Si `NODE_ENV=production` Y existe `RESEND_API_KEY`, usa Resend
  - En cualquier otro caso, usa Nodemailer (MailHog)

---

## Testing

### Test Manual

Puedes probar el envío de emails desde el login:
1. Accede a `/login`
2. Ingresa un email
3. En desarrollo: Revisa http://localhost:8025
4. En producción: Revisa la bandeja del email

### Test Programático

```typescript
import { testEmailConnection } from '@/lib/email/mailer';

const isConnected = await testEmailConnection();
console.log('Email service:', isConnected ? 'Connected' : 'Failed');
```

---

## Emails que se envían

### 1. Magic Link
**Cuándo:** Cuando un usuario solicita acceso al sistema
**Contiene:** Enlace de autenticación (válido 15 minutos)

### 2. Welcome Email
**Cuándo:** Cuando un admin asigna un rol a un usuario pendiente
**Contiene:** Confirmación de activación de cuenta y rol asignado

---

## Estructura del código

```
lib/email/
└── mailer.ts          # Lógica de envío (Resend + Nodemailer)

Funciones exportadas:
- sendMagicLink()      # Envía enlace de autenticación
- sendWelcomeEmail()   # Envía email de bienvenida
- testEmailConnection() # Prueba la conexión
```

---

## Solución de problemas

### "SMTP_HOST must be set"
**Causa:** Estás en desarrollo sin MailHog configurado
**Solución:** Configura las variables SMTP en `.env.local` y arranca MailHog

### "RESEND_API_KEY must be set in production"
**Causa:** NODE_ENV=production sin API key de Resend
**Solución:** Agrega `RESEND_API_KEY` a tus variables de entorno

### "Domain not verified" (Resend)
**Causa:** El dominio en EMAIL_FROM no está verificado en Resend
**Solución:** Verifica el dominio en el dashboard de Resend

### Emails no llegan en producción
1. Verifica que el dominio esté verificado en Resend
2. Revisa los logs del dashboard de Resend
3. Verifica que EMAIL_FROM use el dominio verificado
4. Revisa la carpeta de spam del destinatario

---

## Costos

### MailHog (Desarrollo)
- **Gratis** - Se ejecuta localmente

### Resend (Producción)
- **Plan gratuito:** 100 emails/día, 3,000 emails/mes
- **Planes pagos:** Desde $20/mes para 50,000 emails/mes
- Ver precios actuales en: https://resend.com/pricing
