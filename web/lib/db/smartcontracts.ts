import { ObjectId } from 'mongodb';
import { getCollection } from './mongodb';
import type { SmartContract, CreateSmartContractInput } from '@/types';

/**
 * Create a new smart contract record
 */
export async function createSmartContract(
  data: CreateSmartContractInput
): Promise<SmartContract> {
  const collection = await getCollection<SmartContract>('sc');

  const now = new Date();
  const smartContract: Omit<SmartContract, '_id'> = {
    email: data.email,
    privateKey: data.privateKey,
    folder: data.folder,
    rpcUrl: data.rpcUrl,
    transactions: data.transactions,
    createdAt: now,
    updatedAt: now
  };

  const result = await collection.insertOne(smartContract as SmartContract);
  
  return {
    ...smartContract,
    _id: result.insertedId
  } as SmartContract;
}

/**
 * Find smart contracts by email
 */
export async function findSmartContractsByEmail(
  email: string
): Promise<SmartContract[]> {
  const collection = await getCollection<SmartContract>('sc');
  
  return collection
    .find({ email })
    .sort({ createdAt: -1 })
    .toArray();
}

/**
 * Find smart contract by ID
 */
export async function findSmartContractById(
  id: string
): Promise<SmartContract | null> {
  const collection = await getCollection<SmartContract>('sc');
  
  if (!ObjectId.isValid(id)) {
    return null;
  }
  
  return collection.findOne({ _id: new ObjectId(id) });
}

/**
 * Update smart contract
 */
export async function updateSmartContract(
  id: string,
  data: Partial<CreateSmartContractInput>
): Promise<SmartContract | null> {
  const collection = await getCollection<SmartContract>('sc');
  
  if (!ObjectId.isValid(id)) {
    return null;
  }
  
  const updateData: any = {
    ...data,
    updatedAt: new Date()
  };
  
  // Remove _id if present
  delete updateData._id;
  
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: updateData },
    { returnDocument: 'after' }
  );
  
  return result || null;
}

/**
 * Delete smart contract
 */
export async function deleteSmartContract(id: string): Promise<boolean> {
  const collection = await getCollection<SmartContract>('sc');
  
  if (!ObjectId.isValid(id)) {
    return false;
  }
  
  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  
  return result.deletedCount > 0;
}

