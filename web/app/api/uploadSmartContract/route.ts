import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { extractTokenFromHeader, verifyStudentToken } from '@/lib/auth/jwt';
import { getEmailFromRequest } from '@/lib/auth/session';
import { findUserByEmail } from '@/lib/db/users';
import { createSmartContract } from '@/lib/db/smartcontracts';
import type { ApiResponse, SmartContractDTO } from '@/types';
import { convertSmartContractToDTO } from '@/types';

const uploadSmartContractSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase(),
  privateKey: z.string().min(1, 'La clave privada es requerida'),
  folder: z.string().min(1, 'El folder es requerido'),
  rpcUrl: z.string().url('La URL RPC debe ser una URL válida'),
  transactions: z.record(z.string(), z.unknown()) // JSON with transactions
});

/**
 * POST /api/uploadSmartContract
 * Upload smart contract data
 * Requires JWT token authentication
 */
export async function POST(req: NextRequest) {
  try {
    // Get email from JWT token or session
    let userEmail: string | null = null;
    
    // Try JWT token first
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const token = extractTokenFromHeader(authHeader);
        if (token) {
          const payload = await verifyStudentToken(token);
          userEmail = payload.email;
        }
      } catch (error: any) {
        // JWT verification failed, try session
        userEmail = await getEmailFromRequest(req);
      }
    } else {
      // No Authorization header, try session
      userEmail = await getEmailFromRequest(req);
    }

    if (!userEmail) {
      let jwtError: string | null = null;
      if (authHeader) {
        try {
          const token = extractTokenFromHeader(authHeader);
          if (token) {
            await verifyStudentToken(token);
          }
        } catch (error: any) {
          jwtError = error.message || 'Unknown JWT error';
        }
      }
      
      const errorMessage = jwtError 
        ? `Token JWT inválido: ${jwtError}. Proporciona un token JWT válido en el header Authorization`
        : 'No autenticado. Proporciona un token JWT válido en el header Authorization';
      const response: ApiResponse & { jwtError?: string } = {
        success: false,
        error: errorMessage,
        code: 'UNAUTHORIZED',
        jwtError: jwtError || undefined
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Verify user exists and is active
    const user = await findUserByEmail(userEmail);
    if (!user || !user.isActive) {
      const response: ApiResponse = {
        success: false,
        error: 'Usuario no encontrado o inactivo',
        code: 'USER_NOT_FOUND'
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = uploadSmartContractSchema.parse(body);

    // Verify that the email in the request matches the authenticated user's email
    if (validatedData.email !== userEmail) {
      const response: ApiResponse = {
        success: false,
        error: 'El email proporcionado no coincide con el usuario autenticado',
        code: 'EMAIL_MISMATCH'
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Create smart contract record
    const smartContract = await createSmartContract({
      email: validatedData.email,
      privateKey: validatedData.privateKey,
      folder: validatedData.folder,
      rpcUrl: validatedData.rpcUrl,
      transactions: validatedData.transactions
    });

    // Convert to DTO (exclude privateKey for security)
    const smartContractDTO = convertSmartContractToDTO(smartContract);

    const response: ApiResponse & { data: SmartContractDTO } = {
      success: true,
      message: 'Smart contract guardado correctamente',
      data: smartContractDTO
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      const response: ApiResponse = {
        success: false,
        error: firstError?.message || 'Error de validación',
        code: 'VALIDATION_ERROR'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Handle other errors
    console.error('Error in POST /api/uploadSmartContract:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error del servidor',
      code: 'SERVER_ERROR'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

