import { ObjectId, GridFSBucket } from 'mongodb';
import { getDatabase } from './mongodb';
import { Readable } from 'stream';

/**
 * Upload markdown content to GridFS
 */
export async function uploadMarkdown(
  content: string,
  filename: string,
  metadata?: Record<string, any>
): Promise<ObjectId> {
  const db = await getDatabase();
  const bucket = new GridFSBucket(db, { bucketName: 'evaluations' });

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        ...metadata,
        contentType: 'text/markdown',
        uploadedAt: new Date()
      }
    });

    const readableStream = Readable.from([content]);

    readableStream.pipe(uploadStream);

    uploadStream.on('finish', () => {
      resolve(uploadStream.id as ObjectId);
    });

    uploadStream.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Download markdown content from GridFS
 */
export async function downloadMarkdown(fileId: ObjectId | string): Promise<string> {
  const db = await getDatabase();
  const bucket = new GridFSBucket(db, { bucketName: 'evaluations' });

  const id = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;

  return new Promise((resolve, reject) => {
    const downloadStream = bucket.openDownloadStream(id);
    const chunks: Buffer[] = [];

    downloadStream.on('data', (chunk) => {
      chunks.push(chunk);
    });

    downloadStream.on('end', () => {
      const content = Buffer.concat(chunks).toString('utf-8');
      resolve(content);
    });

    downloadStream.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Delete markdown file from GridFS
 */
export async function deleteMarkdown(fileId: ObjectId | string): Promise<void> {
  const db = await getDatabase();
  const bucket = new GridFSBucket(db, { bucketName: 'evaluations' });

  const id = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;

  await bucket.delete(id);
}

/**
 * Check if file exists in GridFS
 */
export async function markdownExists(fileId: ObjectId | string): Promise<boolean> {
  const db = await getDatabase();
  const bucket = new GridFSBucket(db, { bucketName: 'evaluations' });

  const id = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;

  try {
    const files = await bucket.find({ _id: id }).limit(1).toArray();
    return files.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Get file metadata from GridFS
 */
export async function getMarkdownMetadata(fileId: ObjectId | string) {
  const db = await getDatabase();
  const bucket = new GridFSBucket(db, { bucketName: 'evaluations' });

  const id = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;

  const files = await bucket.find({ _id: id }).limit(1).toArray();
  return files[0] || null;
}

