import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions } from './lib/auth/session';
import type { SessionData } from '@/types';

// Public routes that don't require authentication
const publicRoutes = ['/login', '/api/auth/request-magic-link', '/api/auth/verify', '/api/tokens'];

// Routes that handle their own authentication (JWT tokens)
const jwtAuthRoutes = [
  '/api/projects/',
  '/api/student/env-configs',
  '/api/uploadSmartContract'
];

// Admin routes that require admin role (handled in the route itself)
const adminRoutes = [
  '/api/admin'
];

// Route permissions by role
const roleRoutes: Record<string, string[]> = {
  '/admin': ['admin'],
  '/teacher': ['teacher', 'admin'],
  '/student': ['student'],
  '/pending': ['pending'],
  '/api/admin': ['admin'],
  '/api/projects': ['student', 'teacher', 'admin'], // Will be refined in API handlers
  '/api/auth/me': ['student', 'teacher', 'admin', 'pending'],
  '/api/auth/logout': ['student', 'teacher', 'admin', 'pending']
};

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow routes that handle their own JWT authentication
  if (jwtAuthRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  try {
    // Get session
    const response = NextResponse.next();
    const session = await getIronSession<SessionData>(
      req,
      response,
      sessionOptions
    );

    // Check if user is authenticated
    if (!session.isLoggedIn || !session.email) {
      // Redirect to login for page routes
      if (!pathname.startsWith('/api')) {
        return NextResponse.redirect(new URL('/login', req.url));
      }

      // Return 401 for API routes
      return NextResponse.json(
        {
          success: false,
          error: 'No autenticado',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }

    // Check role-based permissions
    for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
      if (pathname.startsWith(route)) {
        const hasRequiredRole = session.roles?.some(role => allowedRoles.includes(role));

        if (!hasRequiredRole) {
          // Redirect to appropriate dashboard for page routes
          if (!pathname.startsWith('/api')) {
            // Determine redirect based on user's primary role (first role in array)
            const primaryRole = session.roles?.[0] || 'pending';
            const redirectMap: Record<string, string> = {
              admin: '/admin',
              teacher: '/teacher',
              student: '/student',
              pending: '/pending'
            };

            const redirectPath = redirectMap[primaryRole] || '/login';
            return NextResponse.redirect(new URL(redirectPath, req.url));
          }

          // Return 403 for API routes
          return NextResponse.json(
            {
              success: false,
              error: 'No autorizado',
              code: 'FORBIDDEN'
            },
            { status: 403 }
          );
        }
      }
    }

    // Redirect root to appropriate dashboard
    if (pathname === '/') {
      // Determine redirect based on user's primary role (first role in array)
      const primaryRole = session.roles?.[0] || 'pending';
      const redirectMap: Record<string, string> = {
        admin: '/admin',
        teacher: '/teacher',
        student: '/student',
        pending: '/pending'
      };

      const redirectPath = redirectMap[primaryRole] || '/login';
      return NextResponse.redirect(new URL(redirectPath, req.url));
    }

    return response;
  } catch (error) {
    console.error('Proxy error:', error);

    // Redirect to login on error for page routes
    if (!pathname.startsWith('/api')) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Return 500 for API routes
    return NextResponse.json(
      {
        success: false,
        error: 'Error del servidor',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}

// Configure which routes to run proxy on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public/).*)'
  ]
};

