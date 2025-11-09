import { ObjectId } from 'mongodb';
import { getCollection } from './mongodb';
import type { AIPrompt, CreatePromptInput, UpdatePromptInput } from '@/types';

/**
 * Get active prompt (isActive: true)
 * If promptId is provided, get that specific prompt
 */
export async function getActivePrompt(
  promptId?: string
): Promise<AIPrompt | null> {
  const collection = await getCollection<AIPrompt>('aiPrompts');

  if (promptId && ObjectId.isValid(promptId)) {
    return collection.findOne({ _id: new ObjectId(promptId) });
  }

  return collection.findOne({ isActive: true });
}

/**
 * Create new AI prompt
 */
export async function createPrompt(
  createdBy: string,
  data: CreatePromptInput
): Promise<AIPrompt> {
  const collection = await getCollection<AIPrompt>('aiPrompts');

  // If this prompt should be active, deactivate all others
  if (data.isActive) {
    await collection.updateMany({}, { $set: { isActive: false } });
  }

  const prompt: Omit<AIPrompt, '_id'> = {
    name: data.name,
    prompt: data.prompt,
    isActive: data.isActive,
    createdBy,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await collection.insertOne(prompt as any);
  return { ...prompt, _id: result.insertedId };
}

/**
 * Find all prompts
 */
export async function findAllPrompts(): Promise<AIPrompt[]> {
  const collection = await getCollection<AIPrompt>('aiPrompts');

  return collection.find().sort({ createdAt: -1 }).toArray();
}

/**
 * Find prompt by ID
 */
export async function findPromptById(id: string): Promise<AIPrompt | null> {
  const collection = await getCollection<AIPrompt>('aiPrompts');

  if (!ObjectId.isValid(id)) {
    return null;
  }

  return collection.findOne({ _id: new ObjectId(id) });
}

/**
 * Update prompt
 */
export async function updatePrompt(
  id: string,
  data: UpdatePromptInput
): Promise<boolean> {
  const collection = await getCollection<AIPrompt>('aiPrompts');

  if (!ObjectId.isValid(id)) {
    return false;
  }

  // If setting this prompt as active, deactivate all others
  if (data.isActive === true) {
    await collection.updateMany({}, { $set: { isActive: false } });
  }

  const updateData: any = { updatedAt: new Date() };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.prompt !== undefined) updateData.prompt = data.prompt;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData }
  );

  return result.modifiedCount > 0;
}

/**
 * Delete prompt
 */
export async function deletePrompt(id: string): Promise<boolean> {
  const collection = await getCollection<AIPrompt>('aiPrompts');

  if (!ObjectId.isValid(id)) {
    return false;
  }

  // Don't delete if it's the only active prompt
  const prompt = await findPromptById(id);
  if (prompt?.isActive) {
    const activeCount = await collection.countDocuments({ isActive: true });
    if (activeCount === 1) {
      return false; // Don't delete the only active prompt
    }
  }

  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}
