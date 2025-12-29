import { SessionOptions, getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';
import type { SessionData } from '@/types';

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set in .env.local');
}

if (process.env.SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must be at least 32 characters long');
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: 'proyectos_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 días
    path: '/'
  }
};

/**
 * Get session from request (server component or route handler)
 */
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

/**
 * Get current user from session
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<SessionData | null> {
  const session = await getSession();

  if (!session.isLoggedIn || !session.email) {
    return null;
  }

  // Handle legacy sessions with single 'role' field
  let roles = session.roles || [];
  if (!roles || roles.length === 0) {
    // @ts-ignore - handle legacy 'role' field
    const legacyRole = session.role;
    if (legacyRole) {
      roles = [legacyRole];
    }
  }

  return {
    email: session.email,
    roles: roles,
    isLoggedIn: session.isLoggedIn
  };
}

/**
 * Create session for user
 */
export async function createSession(
  email: string,
  roles: string[]
): Promise<void> {
  const session = await getSession();

  session.email = email;
  session.roles = roles as any;
  session.isLoggedIn = true;

  await session.save();
}

/**
 * Destroy session (logout)
 */
export async function destroySession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Check if user has any of the specified roles
 */
export async function hasRole(allowedRoles: string[]): Promise<boolean> {
  const user = await getCurrentUser();

  if (!user) {
    return false;
  }

  return user.roles.some(role => allowedRoles.includes(role));
}

/**
 * Require authentication (throws if not authenticated)
 */
export async function requireAuth(): Promise<SessionData> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Authentication required');
  }

  return user;
}

/**
 * Get email from JWT token or session
 * Tries JWT first, then falls back to session
 */
export async function getEmailFromRequest(req: Request): Promise<string | null> {
  // Try JWT token first
  const authHeader = req.headers.get('Authorization');
  if (authHeader) {
    try {
      const { extractTokenFromHeader, verifyStudentToken } = await import('./jwt');
      const token = extractTokenFromHeader(authHeader);
      if (token) {
        const payload = await verifyStudentToken(token);
        return payload.email;
      }
    } catch (error) {
      // JWT verification failed, continue to session check
    }
  }

  // Fall back to session
  const user = await getCurrentUser();
  return user?.email || null;
}

/**
 * Require specific role (throws if not authorized)
 */
export async function requireRole(allowedRoles: string[]): Promise<SessionData> {
  const user = await requireAuth();

  const hasRequiredRole = user.roles.some(role => allowedRoles.includes(role));

  if (!hasRequiredRole) {
    throw new Error('Insufficient permissions');
  }

  return user;
}
