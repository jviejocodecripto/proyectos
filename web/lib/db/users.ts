import { getCollection } from './mongodb';
import type { User, UserRole, UserQueryParams, PaginatedResponse } from '@/types';
import { PAGINATION_DEFAULTS } from '@/types';

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const collection = await getCollection<User>('users');
  return collection.findOne({ email });
}

/**
 * Create new user with pending role
 */
export async function createUser(email: string, name: string): Promise<User> {
  const collection = await getCollection<User>('users');

  const user: Omit<User, '_id'> = {
    email,
    name,
    roles: ['pending'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: null
  };

  const result = await collection.insertOne(user as any);
  return { ...user, _id: result.insertedId };
}

/**
 * Create new user with custom roles and status (admin only)
 */
export async function createUserWithRoles(
  email: string,
  name: string,
  roles: UserRole[],
  isActive: boolean = true
): Promise<User> {
  const collection = await getCollection<User>('users');

  const user: Omit<User, '_id'> = {
    email,
    name,
    roles,
    isActive,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: null
  };

  try {
    const result = await collection.insertOne(user as any);
    return { ...user, _id: result.insertedId };
  } catch (error: any) {
    // Mostrar error detallado de validación
    console.error('=== ERROR DE VALIDACIÓN MONGODB ===');
    console.error('Documento que se intentó insertar:');
    console.error(JSON.stringify(user, null, 2));
    console.error('\nError completo:');
    console.error(JSON.stringify(error, null, 2));
    if (error.errInfo) {
      console.error('\nDetalles de validación (errInfo):');
      console.error(JSON.stringify(error.errInfo, null, 2));
    }
    console.error('=====================================');
    throw error;
  }
}

/**
 * Update user roles
 */
export async function updateUserRoles(
  email: string,
  roles: UserRole[]
): Promise<boolean> {
  const collection = await getCollection<User>('users');

  const result = await collection.updateOne(
    { email },
    {
      $set: {
        roles,
        updatedAt: new Date()
      }
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Update user active status
 */
export async function updateUserStatus(
  email: string,
  isActive: boolean
): Promise<boolean> {
  const collection = await getCollection<User>('users');

  const result = await collection.updateOne(
    { email },
    {
      $set: {
        isActive,
        updatedAt: new Date()
      }
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Update user data (name, roles, status)
 */
export async function updateUser(
  email: string,
  updates: {
    name?: string;
    roles?: UserRole[];
    isActive?: boolean;
  }
): Promise<boolean> {
  const collection = await getCollection<User>('users');

  const result = await collection.updateOne(
    { email },
    {
      $set: {
        ...updates,
        updatedAt: new Date()
      }
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(email: string): Promise<boolean> {
  const collection = await getCollection<User>('users');

  const result = await collection.updateOne(
    { email },
    { $set: { lastLogin: new Date() } }
  );

  return result.modifiedCount > 0;
}

/**
 * Find all users with pagination and filters
 */
export async function findUsers(
  params: UserQueryParams = {}
): Promise<PaginatedResponse<User>> {
  const collection = await getCollection<User>('users');

  const {
    page = PAGINATION_DEFAULTS.PAGE,
    limit = PAGINATION_DEFAULTS.LIMIT,
    roles,
    search
  } = params;

  // Build query
  const query: any = {};

  if (roles && roles.length > 0) {
    query.roles = { $in: roles };
  }

  if (search) {
    query.$or = [
      { email: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } }
    ];
  }

  // Get total count
  const total = await collection.countDocuments(query);

  // Get paginated results
  const skip = (page - 1) * limit;
  const items = await collection
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

/**
 * Count users by role (a user can have multiple roles)
 */
export async function countUsersByRole(): Promise<Record<UserRole, number>> {
  const collection = await getCollection<User>('users');

  const result = await collection
    .aggregate([
      { $unwind: '$roles' },
      {
        $group: {
          _id: '$roles',
          count: { $sum: 1 }
        }
      }
    ])
    .toArray();

  const counts: Record<UserRole, number> = {
    pending: 0,
    student: 0,
    teacher: 0,
    admin: 0
  };

  result.forEach((item) => {
    counts[item._id as UserRole] = item.count;
  });

  return counts;
}

/**
 * Delete user by email (admin only)
 */
export async function deleteUser(email: string): Promise<boolean> {
  const collection = await getCollection<User>('users');

  const result = await collection.deleteOne({ email });
  return result.deletedCount > 0;
}

/**
 * Get all users (for sync purposes)
 */
export async function getAllUsers(): Promise<User[]> {
  const collection = await getCollection<User>('users');
  return collection.find({}).toArray();
}
