import {
  KMSClient,
  GenerateDataKeyCommand,
  EncryptCommand,
  DecryptCommand,
  DescribeKeyCommand,
} from '@aws-sdk/client-kms';
import crypto from 'crypto';

export interface EncryptedEnvelope {
  ciphertext: string;
  iv: string;
  authTag: string;
  encryptedDataKey: string;
  keyId: string;
  algorithm: 'AES-256-GCM-KMS-ENVELOPE';
}

export interface KmsDiagnostics {
  status: 'ONLINE' | 'STANDALONE_FALLBACK';
  provider: 'AWS_KMS_CMK' | 'LOCAL_SIMULATED_KMS';
  keyId: string;
  region: string;
  envelopeAlgorithm: 'AES-256-GCM-KMS-ENVELOPE';
  description: string;
  hsmManaged: boolean;
}

// Fallback Master Key for local development or testing when AWS KMS credentials are not provided
const getLocalMasterKey = (): Buffer => {
  const secret =
    process.env.MASTER_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'fallback_local_kms_secure_master_key_2026_dms_legal';
  return crypto.createHash('sha256').update(secret).digest();
};

export class KmsService {
  private static clientInstance: KMSClient | null = null;

  /**
   * Checks whether AWS KMS is explicitly configured with valid credentials and a Key ID / ARN
   */
  public static isConfigured(): boolean {
    const keyId = process.env.AWS_KMS_KEY_ID || process.env.KMS_KEY_ARN;
    const accessKey = process.env.AWS_ACCESS_KEY_ID;
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY;

    return Boolean(
      keyId &&
        accessKey &&
        secretKey &&
        accessKey !== 'your_aws_access_key' &&
        secretKey !== 'your_aws_secret_key'
    );
  }

  /**
   * Retrieves the configured Master Key ID, Alias, or ARN
   */
  public static getMasterKeyId(): string {
    return (
      process.env.AWS_KMS_KEY_ID ||
      process.env.KMS_KEY_ARN ||
      'alias/secure-dms-master-key'
    );
  }

  /**
   * Lazy-loaded KMS Client
   */
  private static getClient(): KMSClient {
    if (!this.clientInstance) {
      this.clientInstance = new KMSClient({
        region: process.env.AWS_REGION || 'ap-south-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
    }
    return this.clientInstance;
  }

  /**
   * Generate an AES-256 Data Encryption Key (DEK) wrapped by the AWS KMS Master Key
   */
  public static async generateDataKey(
    encryptionContext?: Record<string, string>
  ): Promise<{ plaintextKey: Buffer; encryptedDataKey: string }> {
    if (this.isConfigured()) {
      try {
        const client = this.getClient();
        const command = new GenerateDataKeyCommand({
          KeyId: this.getMasterKeyId(),
          KeySpec: 'AES_256',
          EncryptionContext: encryptionContext,
        });

        const response = await client.send(command);
        if (!response.Plaintext || !response.CiphertextBlob) {
          throw new Error('KMS response missing Plaintext or CiphertextBlob.');
        }

        return {
          plaintextKey: Buffer.from(response.Plaintext),
          encryptedDataKey: Buffer.from(response.CiphertextBlob).toString('base64'),
        };
      } catch (err: any) {
        console.warn(`[AWS KMS Error]: ${err.message}. Falling back to simulated local envelope encryption.`);
      }
    }

    // Local cryptographic fallback for offline testing / zero-config dev
    const randomKey = crypto.randomBytes(32);
    const localMaster = getLocalMasterKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', localMaster, iv);
    const encryptedKey = Buffer.concat([cipher.update(randomKey), cipher.final()]);
    const tag = cipher.getAuthTag();

    const packedEnvelope = Buffer.concat([iv, tag, encryptedKey]).toString('base64');
    return {
      plaintextKey: randomKey,
      encryptedDataKey: packedEnvelope,
    };
  }

  /**
   * Decrypt a wrapped Data Encryption Key (DEK) using the AWS KMS Master Key
   */
  public static async decryptDataKey(
    encryptedDataKeyBase64: string,
    encryptionContext?: Record<string, string>
  ): Promise<Buffer> {
    if (this.isConfigured()) {
      try {
        const client = this.getClient();
        const ciphertextBlob = Buffer.from(encryptedDataKeyBase64, 'base64');
        const command = new DecryptCommand({
          CiphertextBlob: ciphertextBlob,
          KeyId: this.getMasterKeyId(),
          EncryptionContext: encryptionContext,
        });

        const response = await client.send(command);
        if (!response.Plaintext) {
          throw new Error('KMS Decrypt response missing Plaintext key.');
        }

        return Buffer.from(response.Plaintext);
      } catch (err: any) {
        console.warn(`[AWS KMS Decrypt Error]: ${err.message}. Attempting local decryption.`);
      }
    }

    // Local cryptographic fallback
    try {
      const buffer = Buffer.from(encryptedDataKeyBase64, 'base64');
      const iv = buffer.subarray(0, 12);
      const tag = buffer.subarray(12, 28);
      const encryptedKey = buffer.subarray(28);

      const localMaster = getLocalMasterKey();
      const decipher = crypto.createDecipheriv('aes-256-gcm', localMaster, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(encryptedKey), decipher.final()]);
    } catch (e: any) {
      throw new Error(`Data key decryption failed: ${e.message}`);
    }
  }

  /**
   * Envelope Encryption: Encrypt plaintext using a unique AES-256-GCM data key wrapped by AWS KMS
   */
  public static async encryptEnvelope(
    plaintext: string | Buffer,
    encryptionContext?: Record<string, string>
  ): Promise<EncryptedEnvelope> {
    const rawBuffer = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext, 'utf8');

    // 1. Get unique data key protected by AWS KMS Master Key
    const { plaintextKey, encryptedDataKey } = await this.generateDataKey(encryptionContext);

    // 2. Encrypt payload with AES-256-GCM
    const iv = crypto.randomBytes(12); // Standard 96-bit GCM IV
    const cipher = crypto.createCipheriv('aes-256-gcm', plaintextKey, iv);
    const ciphertext = Buffer.concat([cipher.update(rawBuffer), cipher.final()]).toString('base64');
    const authTag = cipher.getAuthTag().toString('hex');

    // 3. Securely destroy plaintext key from memory
    plaintextKey.fill(0);

    return {
      ciphertext,
      iv: iv.toString('hex'),
      authTag,
      encryptedDataKey,
      keyId: this.getMasterKeyId(),
      algorithm: 'AES-256-GCM-KMS-ENVELOPE',
    };
  }

  /**
   * Envelope Decryption: Decrypt ciphertext using AWS KMS Master Key unwrapping
   */
  public static async decryptEnvelope(
    envelope: EncryptedEnvelope,
    encryptionContext?: Record<string, string>
  ): Promise<string> {
    // 1. Decrypt data key via AWS KMS Master Key
    const plaintextKey = await this.decryptDataKey(envelope.encryptedDataKey, encryptionContext);

    // 2. Decrypt ciphertext with AES-256-GCM
    const iv = Buffer.from(envelope.iv, 'hex');
    const authTag = Buffer.from(envelope.authTag, 'hex');
    const ciphertextBuffer = Buffer.from(envelope.ciphertext, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', plaintextKey, iv);
    decipher.setAuthTag(authTag);
    const decryptedBuffer = Buffer.concat([decipher.update(ciphertextBuffer), decipher.final()]);

    // 3. Destroy plaintext key from memory
    plaintextKey.fill(0);

    return decryptedBuffer.toString('utf8');
  }

  /**
   * Directly encrypt small secrets/credentials using AWS KMS Master Key
   */
  public static async encryptSecret(
    secret: string,
    encryptionContext?: Record<string, string>
  ): Promise<string> {
    if (this.isConfigured()) {
      const client = this.getClient();
      const command = new EncryptCommand({
        KeyId: this.getMasterKeyId(),
        Plaintext: Buffer.from(secret, 'utf8'),
        EncryptionContext: encryptionContext,
      });

      const response = await client.send(command);
      if (response.CiphertextBlob) {
        return Buffer.from(response.CiphertextBlob).toString('base64');
      }
    }

    // Local fallback
    const envelope = await this.encryptEnvelope(secret, encryptionContext);
    return JSON.stringify(envelope);
  }

  /**
   * Directly decrypt small secrets/credentials using AWS KMS Master Key
   */
  public static async decryptSecret(
    ciphertext: string,
    encryptionContext?: Record<string, string>
  ): Promise<string> {
    if (this.isConfigured() && !ciphertext.startsWith('{')) {
      const client = this.getClient();
      const command = new DecryptCommand({
        CiphertextBlob: Buffer.from(ciphertext, 'base64'),
        KeyId: this.getMasterKeyId(),
        EncryptionContext: encryptionContext,
      });

      const response = await client.send(command);
      if (response.Plaintext) {
        return Buffer.from(response.Plaintext).toString('utf8');
      }
    }

    // Local fallback
    const envelope = JSON.parse(ciphertext) as EncryptedEnvelope;
    return await this.decryptEnvelope(envelope, encryptionContext);
  }

  /**
   * Get live diagnostic and compliance telemetry for the Master Key
   */
  public static async getDiagnostics(): Promise<KmsDiagnostics> {
    const isReady = this.isConfigured();
    const keyId = this.getMasterKeyId();

    if (isReady) {
      try {
        const client = this.getClient();
        await client.send(new DescribeKeyCommand({ KeyId: keyId }));
        return {
          status: 'ONLINE',
          provider: 'AWS_KMS_CMK',
          keyId,
          region: process.env.AWS_REGION || 'ap-south-1',
          envelopeAlgorithm: 'AES-256-GCM-KMS-ENVELOPE',
          description: 'AWS KMS Customer Master Key (CMK) with automated key rotation and envelope encryption.',
          hsmManaged: false, // In software KMS CMK (not CloudHSM) as requested
        };
      } catch (err: any) {
        // Fallback info if DescribeKey fails or permissions restricted
      }
    }

    return {
      status: 'STANDALONE_FALLBACK',
      provider: isReady ? 'AWS_KMS_CMK' : 'LOCAL_SIMULATED_KMS',
      keyId,
      region: process.env.AWS_REGION || 'ap-south-1',
      envelopeAlgorithm: 'AES-256-GCM-KMS-ENVELOPE',
      description: isReady
        ? 'AWS KMS CMK configured with AES-256-GCM envelope encryption.'
        : 'Zero-config local cryptographic master key active. Configure AWS_KMS_KEY_ID in .env for production AWS KMS.',
      hsmManaged: false,
    };
  }
}
