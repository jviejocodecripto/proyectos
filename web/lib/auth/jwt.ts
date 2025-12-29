import { SignJWT, jwtVerify } from 'jose';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in .env.local');
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export interface JWTPayload {
  email: string;
  exp?: number;
  iat?: number;
}

/**
 * Generate a JWT token for a student
 * @param email Student email
 * @param expiresIn Expiration time in seconds (default: 12 months = 31536000)
 * @returns JWT token string
 */
export async function generateStudentToken(
  email: string,
  expiresIn: number = 31536000 // 12 months
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresIn)
    .sign(secret);

  return token;
}

/**
 * Verify and decode a JWT token
 * @param token JWT token string
 * @returns Decoded payload with email
 * @throws Error if token is invalid or expired
 */
export async function verifyStudentToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      // Allow tokens with different expiration formats
      clockTolerance: 60, // 60 seconds tolerance
    });
    
    if (!payload.email || typeof payload.email !== 'string') {
      throw new Error('Invalid token: missing email');
    }

    return {
      email: payload.email,
      exp: payload.exp,
      iat: payload.iat
    };
  } catch (error: any) {
    console.error('JWT verification error:', {
      code: error.code,
      message: error.message,
      name: error.name
    });
    
    if (error.code === 'ERR_JWT_EXPIRED' || error.code === 'ERR_JWT_CLAIM_VALIDATION_FAILED') {
      throw new Error('Token expired');
    }
    if (error.code === 'ERR_JWT_INVALID' || error.code === 'ERR_JWS_INVALID') {
      throw new Error(`Invalid token: ${error.message}`);
    }
    if (error.code === 'ERR_JWT_SIGNATURE_VERIFICATION_FAILED') {
      throw new Error('Token signature verification failed - JWT_SECRET may not match');
    }
    throw new Error(`Token verification failed: ${error.message || error.code || 'Unknown error'}`);
  }
}

/**
 * Extract JWT token from Authorization header
 * Supports both "Bearer <token>" and just "<token>" formats
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  // Remove "Bearer " prefix if present
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : authHeader;

  return token.trim() || null;
}

