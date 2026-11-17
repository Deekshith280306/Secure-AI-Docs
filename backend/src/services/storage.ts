import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const VAULT_DIR = path.resolve(__dirname, '../../vault');

// Ensure local vault directory exists
if (!fs.existsSync(VAULT_DIR)) {
  fs.mkdirSync(VAULT_DIR, { recursive: true });
}

export interface StorageProvider {
  type: 's3' | 'local_vault';
  getPresignedUploadUrl(
    storageKey: string,
    mimeType: string,
    clientHash: string
  ): Promise<{ uploadUrl: string; provider: 's3' | 'local_vault'; headers?: Record<string, string> }>;
  getPresignedDownloadUrl(storageKey: string, fileName: string): Promise<string>;
  saveLocalFile(storageKey: string, dataBuffer: Buffer): Promise<void>;
  getLocalFilePath(storageKey: string): string | null;
  getFileBuffer(storageKey: string): Promise<Buffer | null>;
  verifyFileHash(storageKey: string, expectedHash: string): Promise<{ valid: boolean; actualHash: string }>;
  deleteFile(storageKey: string): Promise<boolean>;
}

const isAwsConfigured = (): boolean => {
  const key = process.env.AWS_ACCESS_KEY_ID;
  const secret = process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  return (
    Boolean(key && secret && bucket) &&
    key !== 'your_aws_access_key' &&
    secret !== 'your_aws_secret_key'
  );
};

export const StorageService: StorageProvider = {
  type: isAwsConfigured() ? 's3' : 'local_vault',

  async getPresignedUploadUrl(
    storageKey: string,
    mimeType: string,
    clientHash: string
  ): Promise<{ uploadUrl: string; provider: 's3' | 'local_vault'; headers?: Record<string, string> }> {
    if (isAwsConfigured()) {
      const s3 = new S3Client({
        region: process.env.AWS_REGION || 'ap-south-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });

      const kmsKeyId = process.env.AWS_KMS_KEY_ID || process.env.KMS_KEY_ARN;
      const sse = kmsKeyId ? 'aws:kms' : 'AES256';

      const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: storageKey,
        ContentType: mimeType,
        ServerSideEncryption: sse,
        ...(kmsKeyId ? { SSEKMSKeyId: kmsKeyId } : {}),
        Metadata: {
          sha256: clientHash,
        },
      });

      // 300 seconds (5 minutes) expiry
      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
      return {
        uploadUrl,
        provider: 's3',
        headers: {
          'Content-Type': mimeType,
          'x-amz-server-side-encryption': sse,
          ...(kmsKeyId ? { 'x-amz-server-side-encryption-aws-kms-key-id': kmsKeyId } : {}),
        },
      };
    }

    // Local Vault Fallback for offline / zero-config development
    const port = process.env.PORT || 5001;
    const uploadUrl = `http://localhost:${port}/api/docs/local-upload/${encodeURIComponent(storageKey)}`;
    return {
      uploadUrl,
      provider: 'local_vault',
      headers: {
        'Content-Type': mimeType,
      },
    };
  },

  async getPresignedDownloadUrl(storageKey: string, fileName: string): Promise<string> {
    if (isAwsConfigured()) {
      const s3 = new S3Client({
        region: process.env.AWS_REGION || 'ap-south-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });

      const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: storageKey,
        ResponseContentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
      });

      return await getSignedUrl(s3, command, { expiresIn: 300 });
    }

    const port = process.env.PORT || 5001;
    return `http://localhost:${port}/api/docs/local-download/${encodeURIComponent(storageKey)}`;
  },

  async saveLocalFile(storageKey: string, dataBuffer: Buffer): Promise<void> {
    const safeKey = storageKey.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(VAULT_DIR, safeKey);
    await fs.promises.writeFile(filePath, dataBuffer);
  },

  getLocalFilePath(storageKey: string): string | null {
    const safeKey = storageKey.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(VAULT_DIR, safeKey);
    return fs.existsSync(filePath) ? filePath : null;
  },

  async getFileBuffer(storageKey: string): Promise<Buffer | null> {
    if (isAwsConfigured()) {
      const s3 = new S3Client({
        region: process.env.AWS_REGION || 'ap-south-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
      try {
        const res = await s3.send(new GetObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME!,
          Key: storageKey,
        }));
        const chunks: Buffer[] = [];
        for await (const chunk of res.Body as any) {
          chunks.push(Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
      } catch {
        return null;
      }
    }

    const safeKey = storageKey.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(VAULT_DIR, safeKey);
    if (!fs.existsSync(filePath)) return null;
    return fs.promises.readFile(filePath);
  },

  async verifyFileHash(
    storageKey: string,
    expectedHash: string
  ): Promise<{ valid: boolean; actualHash: string }> {
    if (isAwsConfigured()) {
      // In AWS S3, verify via S3 stream
      const s3 = new S3Client({
        region: process.env.AWS_REGION || 'ap-south-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });

      const response = await s3.send(
        new GetObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME!,
          Key: storageKey,
        })
      );

      return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = response.Body as any;
        stream.on('data', (chunk: Buffer) => hash.update(chunk));
        stream.on('end', () => {
          const actualHash = hash.digest('hex');
          resolve({ valid: actualHash === expectedHash, actualHash });
        });
        stream.on('error', reject);
      });
    }

    // Local Vault Hash Verification
    const safeKey = storageKey.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(VAULT_DIR, safeKey);

    if (!fs.existsSync(filePath)) {
      return { valid: false, actualHash: '' };
    }

    const fileBuffer = await fs.promises.readFile(filePath);
    const actualHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    return {
      valid: actualHash.toLowerCase() === expectedHash.toLowerCase(),
      actualHash,
    };
  },

  async deleteFile(storageKey: string): Promise<boolean> {
    try {
      const safeKey = storageKey.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = path.join(VAULT_DIR, safeKey);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
      return false;
    } catch (err) {
      console.error('[DeleteFile Error]:', err);
      return false;
    }
  },
};
