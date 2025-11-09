import nodemailer, { Transporter } from 'nodemailer';
import { Resend } from 'resend';

// Determine which email service to use
const useResend = process.env.RESEND_API_KEY && process.env.NODE_ENV === 'production';

// Initialize Resend for production
let resend: Resend | null = null;
if (useResend) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY must be set in production');
  }
  if (!process.env.EMAIL_FROM) {
    throw new Error('EMAIL_FROM must be set');
  }
  resend = new Resend(process.env.RESEND_API_KEY);
}

// Initialize Nodemailer for development
let transporter: Transporter | null = null;
if (!useResend) {
  if (!process.env.SMTP_HOST) {
    throw new Error('SMTP_HOST must be set in .env.local for development');
  }
  if (!process.env.SMTP_PORT) {
    throw new Error('SMTP_PORT must be set in .env.local for development');
  }
  if (!process.env.EMAIL_FROM) {
    throw new Error('EMAIL_FROM must be set in .env.local');
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      : undefined
  });
}

/**
 * Send magic link email
 */
export async function sendMagicLink(
  email: string,
  token: string,
  userName?: string,
  baseUrl?: string
): Promise<void> {
  const appUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const magicLink = `${appUrl}/api/auth/verify?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 30px;
            border: 1px solid #e0e0e0;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          h1 {
            color: #2563eb;
            margin: 0;
          }
          .content {
            background-color: white;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #2563eb;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: 600;
          }
          .button:hover {
            background-color: #1d4ed8;
          }
          .link {
            word-break: break-all;
            color: #6b7280;
            font-size: 12px;
            margin-top: 10px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #6b7280;
            font-size: 14px;
          }
          .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 12px;
            margin: 20px 0;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Sistema de Proyectos</h1>
          </div>

          <div class="content">
            <p>Hola${userName ? ` ${userName}` : ''},</p>

            <p>Has solicitado acceder a tu cuenta. Haz clic en el siguiente botón para iniciar sesión:</p>

            <div style="text-align: center;">
              <a href="${magicLink}" class="button">Iniciar Sesión</a>
            </div>

            <p class="link">O copia y pega este enlace en tu navegador:<br>${magicLink}</p>

            <div class="warning">
              <strong>⚠️ Importante:</strong> Este enlace expirará en 15 minutos y solo puede usarse una vez.
            </div>

            <p>Si no solicitaste este acceso, puedes ignorar este correo de forma segura.</p>
          </div>

          <div class="footer">
            <p>Sistema de Gestión de Proyectos Académicos</p>
            <p style="font-size: 12px; color: #9ca3af;">Este es un correo automático, por favor no respondas.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Hola${userName ? ` ${userName}` : ''},

Has solicitado acceder a tu cuenta en el Sistema de Proyectos.

Haz clic en el siguiente enlace para iniciar sesión:
${magicLink}

Este enlace expirará en 15 minutos y solo puede usarse una vez.

Si no solicitaste este acceso, puedes ignorar este correo de forma segura.

---
Sistema de Gestión de Proyectos Académicos
  `;

  // Use Resend in production, Nodemailer in development
  if (useResend && resend) {
    await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: email,
      subject: 'Tu enlace de acceso - Sistema de Proyectos',
      text,
      html
    });
  } else if (transporter) {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Tu enlace de acceso - Sistema de Proyectos',
      text,
      html
    });
  } else {
    throw new Error('No email service configured');
  }
}

/**
 * Send welcome email when role is assigned
 */
export async function sendWelcomeEmail(
  email: string,
  name: string,
  role: string,
  baseUrl?: string
): Promise<void> {
  const appUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const roleNames: Record<string, string> = {
    student: 'Estudiante',
    teacher: 'Profesor',
    admin: 'Administrador'
  };

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 30px;
            border: 1px solid #e0e0e0;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          h1 {
            color: #2563eb;
            margin: 0;
          }
          .content {
            background-color: white;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
          }
          .role-badge {
            display: inline-block;
            padding: 8px 16px;
            background-color: #dbeafe;
            color: #1e40af;
            border-radius: 20px;
            font-weight: 600;
            margin: 10px 0;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #2563eb;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: 600;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #6b7280;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 ¡Bienvenido!</h1>
          </div>

          <div class="content">
            <p>Hola ${name},</p>

            <p>Tu cuenta ha sido activada en el Sistema de Proyectos.</p>

            <p>Se te ha asignado el rol de:</p>
            <div style="text-align: center;">
              <span class="role-badge">${roleNames[role] || role}</span>
            </div>

            <p>Ya puedes acceder al sistema usando tu email: <strong>${email}</strong></p>

            <div style="text-align: center;">
              <a href="${appUrl}/login" class="button">Ir al Sistema</a>
            </div>
          </div>

          <div class="footer">
            <p>Sistema de Gestión de Proyectos Académicos</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
¡Bienvenido ${name}!

Tu cuenta ha sido activada en el Sistema de Proyectos.

Rol asignado: ${roleNames[role] || role}

Ya puedes acceder al sistema usando tu email: ${email}

Accede aquí: ${appUrl}/login

---
Sistema de Gestión de Proyectos Académicos
  `;

  // Use Resend in production, Nodemailer in development
  if (useResend && resend) {
    await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: email,
      subject: '¡Bienvenido al Sistema de Proyectos!',
      text,
      html
    });
  } else if (transporter) {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: '¡Bienvenido al Sistema de Proyectos!',
      text,
      html
    });
  } else {
    throw new Error('No email service configured');
  }
}

/**
 * Test email connection
 */
export async function testEmailConnection(): Promise<boolean> {
  try {
    if (useResend && resend) {
      // Resend doesn't have a verify method, so we just check if it's initialized
      return true;
    } else if (transporter) {
      await transporter.verify();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Email connection test failed:', error);
    return false;
  }
}
