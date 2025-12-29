import { ObjectId } from 'mongodb';
import { getCollection } from './mongodb';
import type { EnvConfig, CreateEnvConfigInput, UpdateEnvConfigInput } from '@/types';

/**
 * Create a new environment configuration
 */
export async function createEnvConfig(
  data: CreateEnvConfigInput,
  studentEmail?: string
): Promise<EnvConfig> {
  const collection = await getCollection<EnvConfig>('envConfigs');

  const now = new Date();
  const envConfig: Omit<EnvConfig, '_id'> = {
    projectId: data.projectId,
    environment: data.environment,
    scope: data.scope,
    key: data.key,
    value: data.value,
    createdAt: now,
    updatedAt: now
  };

  // If it's a global config, associate it with the student's email (if provided)
  // If studentEmail is not provided, it's a truly global admin config
  if (data.projectId === 'global' && studentEmail) {
    envConfig.studentEmail = studentEmail;
  }
  // If projectId is 'global' and studentEmail is undefined, it's an admin global config

  const result = await collection.insertOne(envConfig as EnvConfig);
  return { ...envConfig, _id: result.insertedId };
}

/**
 * Find environment configuration by ID
 */
export async function findEnvConfigById(id: string): Promise<EnvConfig | null> {
  const collection = await getCollection<EnvConfig>('envConfigs');

  if (!ObjectId.isValid(id)) {
    return null;
  }

  return collection.findOne({ _id: new ObjectId(id) });
}

/**
 * Find all environment configurations for a student's projects
 * Returns configs for all projects + global (filtered by student email)
 */
export async function findEnvConfigsForStudent(
  studentProjectIds: string[],
  studentEmail: string
): Promise<EnvConfig[]> {
  const collection = await getCollection<EnvConfig>('envConfigs');

  // Build query: student's projects OR (global AND studentEmail)
  const query = {
    $or: [
      // Student's specific projects
      { projectId: { $in: studentProjectIds } },
      // Global configs for this specific student
      { projectId: 'global', studentEmail: studentEmail }
    ]
  };

  return collection
    .find(query)
    .sort({ projectId: 1, key: 1 })
    .toArray();
}

/**
 * Update environment configuration
 */
export async function updateEnvConfig(
  id: string,
  data: UpdateEnvConfigInput
): Promise<boolean> {
  const collection = await getCollection<EnvConfig>('envConfigs');

  if (!ObjectId.isValid(id)) {
    return false;
  }

  const updateData: Partial<EnvConfig> = {
    updatedAt: new Date()
  };

  if (data.environment !== undefined) {
    updateData.environment = data.environment;
  }
  if (data.key !== undefined) {
    updateData.key = data.key;
  }
  if (data.value !== undefined) {
    updateData.value = data.value;
  }

  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData }
  );

  return result.modifiedCount > 0;
}

/**
 * Delete environment configuration
 */
export async function deleteEnvConfig(id: string): Promise<boolean> {
  const collection = await getCollection<EnvConfig>('envConfigs');

  if (!ObjectId.isValid(id)) {
    return false;
  }

  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}

/**
 * Check if a key already exists for a project and environment
 */
export async function keyExistsForProject(
  key: string,
  projectId: string | 'global',
  environment: 'dev' | 'pro' | 'all',
  excludeId?: string,
  studentEmail?: string
): Promise<boolean> {
  const collection = await getCollection<EnvConfig>('envConfigs');

  const query: any = {
    key,
    projectId
  };

  // For environment, check if it conflicts with existing configs
  // A key can't exist with the same environment, or if one is 'all' and the other is specific
  const envCondition: any = {};
  if (environment === 'all') {
    // If creating 'all', check if key exists with any environment
    envCondition.$or = [
      { environment: 'all' },
      { environment: 'dev' },
      { environment: 'pro' }
    ];
  } else {
    // If creating specific environment, check if key exists with same environment or 'all'
    envCondition.$or = [
      { environment: environment },
      { environment: 'all' }
    ];
  }
  
  // Combine environment condition with existing query
  if (query.$and) {
    query.$and.push(envCondition);
  } else {
    Object.assign(query, envCondition);
  }

  // For global configs, filter by student email if provided
  // If studentEmail is not provided, check for admin globals (without studentEmail)
  if (projectId === 'global') {
    if (studentEmail) {
      query.studentEmail = studentEmail;
    } else {
      // Admin global config (no studentEmail)
      // Combine with existing $or if it exists
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          {
            $or: [
              { studentEmail: { $exists: false } },
              { studentEmail: null }
            ]
          }
        ];
        delete query.$or;
      } else {
        query.$or = [
          { studentEmail: { $exists: false } },
          { studentEmail: null }
        ];
      }
    }
  }

  if (excludeId && ObjectId.isValid(excludeId)) {
    query._id = { $ne: new ObjectId(excludeId) };
  }

  const existing = await collection.findOne(query);
  return existing !== null;
}

/**
 * Find environment configurations for a specific project and environment
 * Includes project-specific configs + admin global configs (without studentEmail)
 * Also includes configs with environment='all' for the requested environment
 */
export async function findEnvConfigsByProjectAndEnvironment(
  projectId: string,
  environment: 'dev' | 'pro'
): Promise<EnvConfig[]> {
  const collection = await getCollection<EnvConfig>('envConfigs');

  if (!ObjectId.isValid(projectId)) {
    return [];
  }

  // Query: project-specific configs OR admin global configs
  // Include configs with environment='all' OR environment matching the requested environment
  const query: any = {
    $and: [
      {
        $or: [
          { projectId: projectId },
          {
            projectId: 'global',
            $or: [
              { studentEmail: { $exists: false } },
              { studentEmail: null }
            ]
          }
        ]
      },
      {
        $or: [
          { environment: environment },
          { environment: 'all' }
        ]
      }
    ]
  };

  return collection
    .find(query)
    .sort({ projectId: 1, key: 1 }) // Admin globals first, then project-specific
    .toArray();
}

/**
 * Find global environment configurations for a student email and environment
 * Includes both student-specific globals and admin globals (without studentEmail)
 */
export async function findGlobalEnvConfigsByEmailAndEnvironment(
  studentEmail: string,
  environment: 'dev' | 'pro' | 'all' | string[],
  projectId: string
): Promise<EnvConfig[]> {
  const collection = await getCollection<EnvConfig>('envConfigs');

  // Normalize environment to array
  const environments = Array.isArray(environment) ? environment : [environment];

  // Query: student-specific globals OR admin globals (without studentEmail)
  // Include configs with environment='all' OR environment matching the requested environment
  const query: any = {
    projectId: projectId,
    studentEmail: studentEmail,
    $and: [
      {
        $or: [
          { environment: { $in: environments } },
        ]
      }
    ]
  };

  return collection
    .find(query)
    .sort({ key: 1 })
    .toArray();
}

/**
 * Find truly global admin environment configurations (without studentEmail)
 * If environment is specified, includes configs with that environment or 'all'
 */
export async function findAdminGlobalEnvConfigs(
  environment?: 'dev' | 'pro' | 'all'
): Promise<EnvConfig[]> {
  const collection = await getCollection<EnvConfig>('envConfigs');

  const query: any = {
    projectId: 'global',
    $and: [
      {
        $or: [
          { studentEmail: { $exists: false } },
          { studentEmail: null }
        ]
      }
    ]
  };

  // If environment is specified, filter by that environment or 'all'
  if (environment && environment !== 'all') {
    query.$and.push({
      $or: [
        { environment: environment },
        { environment: 'all' }
      ]
    });
  } else if (environment === 'all') {
    query.environment = 'all';
  }
  // If no environment specified, get all environments

  return collection
    .find(query)
    .sort({ environment: 1, key: 1 })
    .toArray();
}
