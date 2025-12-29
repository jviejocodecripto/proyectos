import { NextRequest, NextResponse } from 'next/server';
import { validateMagicLink, markTokenAsUsed } from '@/lib/db/magiclinks';
import { findUserByEmail, updateLastLogin } from '@/lib/db/users';
import { createSession } from '@/lib/auth/session';
import type { ApiResponse } from '@/types';

export async function GET(req: NextRequest) {
  try {
    // Get token from query params
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(
        new URL('/login?error=token-missing', req.url)
      );
    }

    // Special case: if token is NOT a magic link (magic links are 64 hex chars),
    // redirect to code form. This allows external systems to redirect to the code form
    // Magic links are 32 bytes = 64 hex characters
    const isMagicLinkToken = /^[a-f0-9]{64}$/i.test(token);
    
    if (!isMagicLinkToken) {
      // This is a code token parameter, redirect to code form
      return NextResponse.redirect(
        new URL('/login/code', req.url)
      );
    }

    // Validate magic link (normal flow)
    const magicLink = await validateMagicLink(token);

    if (!magicLink) {
      return NextResponse.redirect(
        new URL('/login?error=invalid-token', req.url)
      );
    }

    // Get user
    const user = await findUserByEmail(magicLink.email);

    if (!user) {
      return NextResponse.redirect(
        new URL('/login?error=user-not-found', req.url)
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.redirect(
        new URL('/login?error=user-inactive', req.url)
      );
    }

    // Mark token as used
    await markTokenAsUsed(token);

    // Update last login
    await updateLastLogin(user.email);

    // Handle legacy users with 'role' field instead of 'roles'
    // @ts-ignore - handle legacy field
    const roles = user.roles || (user.role ? [user.role] : ['pending']);

    // Create session
    await createSession(user.email, roles);

    // Redirect based on primary role (first role in array)
    const primaryRole = roles[0] || 'pending';
    const redirectMap: Record<string, string> = {
      admin: '/admin',
      teacher: '/teacher',
      student: '/student',
      pending: '/pending'
    };

    const redirectPath = redirectMap[primaryRole] || '/';
    return NextResponse.redirect(new URL(redirectPath, req.url));
  } catch (error) {
    console.error('Error in verify:', error);
    return NextResponse.redirect(
      new URL('/login?error=server-error', req.url)
    );
  }
}
