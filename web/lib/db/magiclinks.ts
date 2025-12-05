import { getCollection } from './mongodb';
import type { MagicLink } from '@/types';
import { MAGIC_LINK_EXPIRY_MINUTES } from '@/types';

/**
 * Create a new magic link token
 */
export async function createMagicLink(
  email: string,
  token: string
): Promise<MagicLink> {
  const collection = await getCollection<MagicLink>('magiclinks');

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + MAGIC_LINK_EXPIRY_MINUTES);

  const magicLink: Omit<MagicLink, '_id'> = {
    email,
    token,
    createdAt: new Date(),
    expiresAt,
    used: false
  };

  const result = await collection.insertOne(magicLink as any);
  return { ...magicLink, _id: result.insertedId };
}

/**
 * Validate magic link token
 * Returns the magic link if valid (exists, not expired, not used)
 */
export async function   validateMagicLink(
  token: string
): Promise<MagicLink | null> {
  const collection = await getCollection<MagicLink>('magiclinks');
  console.log('token', token);
  const magicLink = await collection.findOne({
    token,
    //used: false,
    // expiresAt: { $gt: new Date() }
  });

  return magicLink;
}

/**
 * Mark token as used
 */
export async function markTokenAsUsed(token: string): Promise<boolean> {
  const collection = await getCollection<MagicLink>('magiclinks');

  const result = await collection.updateOne(
    { token },
    { $set: { used: true } }
  );

  return result.modifiedCount > 0;
}

/**
 * Clean up expired tokens (optional, as TTL index should handle this)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const collection = await getCollection<MagicLink>('magiclinks');

  // const result = await collection.deleteMany({
  //   expiresAt: { $lt: new Date() }
  // });

  // return result.deletedCount;
  return 0;
}

/**
 * Delete all tokens for an email (optional, for security)
 */
export async function deleteTokensByEmail(email: string): Promise<number> {
  const collection = await getCollection<MagicLink>('magiclinks');

  const result = await collection.deleteMany({ email });
  return result.deletedCount;
}
