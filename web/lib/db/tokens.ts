import { ObjectId } from 'mongodb';
import { getCollection } from './mongodb';
import type { Token } from '@/types';

/**
 * Generate a random 6-digit code
 */
function generate6DigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Create a new token with a random 6-digit code
 */
export async function createToken(): Promise<Token> {
  const collection = await getCollection<Token>('tokens');

  let code = generate6DigitCode();
  
  // Ensure code is unique
  let existingToken = await collection.findOne({ code });
  let attempts = 0;
  while (existingToken && attempts < 10) {
    code = generate6DigitCode();
    existingToken = await collection.findOne({ code });
    attempts++;
  }

  const token: Omit<Token, '_id'> = {
    code,
    createdAt: new Date(),
    used: false
  };

  const result = await collection.insertOne(token as any);
  return { ...token, _id: result.insertedId };
}

/**
 * Find token by code
 */
export async function findTokenByCode(code: string): Promise<Token | null> {
  const collection = await getCollection<Token>('tokens');
  return collection.findOne({ code });
}

/**
 * Find token by ID
 */
export async function findTokenById(id: string): Promise<Token | null> {
  const collection = await getCollection<Token>('tokens');
  
  try {
    const objectId = new ObjectId(id);
    return collection.findOne({ _id: objectId });
  } catch (error) {
    return null;
  }
}

/**
 * Validate code and create/update token with email, expiration and JWT
 * Updates the existing token record instead of creating a new one
 */
export async function validateCodeAndCreateToken(
  code: string,
  email: string,
  jwt: string,
  expiresAt: Date
): Promise<Token | null> {
  const collection = await getCollection<Token>('tokens');

  // Find token by code
  const token = await findTokenByCode(code);

  if (!token) {
    return null;
  }

  // Check if already used
  if (token.used) {
    return null;
  }

  // Update token with email, JWT and expiration
  const result = await collection.updateOne(
    { _id: token._id },
    {
      $set: {
        email,
        jwt,
        expiresAt,
        used: true,
        updatedAt: new Date()
      }
    }
  );

  if (result.modifiedCount === 0) {
    return null;
  }

  // Return updated token
  return collection.findOne({ _id: token._id });
}

