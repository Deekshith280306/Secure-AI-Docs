import {
  KMSClient,
  CreateKeyCommand,
  CreateAliasCommand,
  EnableKeyRotationCommand,
} from '@aws-sdk/client-kms';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function createKmsMasterKey() {
  console.log('========================================================');
  console.log('🔐 AUTOMATED AWS KMS MASTER KEY PROVISIONER');
  console.log('========================================================\n');

  const region = process.env.AWS_REGION || 'ap-south-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    console.error('❌ Error: AWS credentials missing in environment.');
    console.error('Please provide AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in backend/.env');
    process.exit(1);
  }

  const client = new KMSClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  try {
    console.log(`1. Requesting AWS KMS Master Key creation in region [${region}]...`);
    // Create standard Customer Master Key (CMK) - Software-backed (non-HSM)
    const createKeyRes = await client.send(
      new CreateKeyCommand({
        Description: 'Secure DMS Customer Master Key (CMK) - Section 63 BSA 2023 Evidentiary Vault',
        KeyUsage: 'ENCRYPT_DECRYPT',
        KeySpec: 'SYMMETRIC_DEFAULT', // Standard AES-256 GCM in AWS KMS
        Origin: 'AWS_KMS', // Standard AWS KMS multi-tenant (NOT CloudHSM)
      })
    );

    const keyId = createKeyRes.KeyMetadata?.KeyId;
    const keyArn = createKeyRes.KeyMetadata?.Arn;

    if (!keyId || !keyArn) {
      throw new Error('Key created but metadata missing from AWS response.');
    }

    console.log(`   ✓ Key Created Successfully!`);
    console.log(`   ✓ Key ID:  ${keyId}`);
    console.log(`   ✓ Key ARN: ${keyArn}`);

    // Create Alias
    const aliasName = 'alias/secure-dms-master-key';
    console.log(`\n2. Binding alias [${aliasName}] to Key...`);
    try {
      await client.send(
        new CreateAliasCommand({
          AliasName: aliasName,
          TargetKeyId: keyId,
        })
      );
      console.log(`   ✓ Alias ${aliasName} successfully attached.`);
    } catch (aliasErr: any) {
      console.warn(`   Notice on alias: ${aliasErr.message}`);
    }

    // Enable automated yearly key rotation (AWS Security Best Practice)
    console.log(`\n3. Enabling automated cryptographic key rotation...`);
    try {
      await client.send(new EnableKeyRotationCommand({ KeyId: keyId }));
      console.log(`   ✓ Automated AWS Key Rotation enabled.`);
    } catch (rotErr: any) {
      console.warn(`   Notice on key rotation: ${rotErr.message}`);
    }

    // Automatically update backend/.env
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      if (envContent.includes('AWS_KMS_KEY_ID=')) {
        envContent = envContent.replace(/AWS_KMS_KEY_ID=.*/, `AWS_KMS_KEY_ID=${keyArn}`);
      } else {
        envContent += `\nAWS_KMS_KEY_ID=${keyArn}\n`;
      }
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log(`\n4. Automatically updated backend/.env with AWS_KMS_KEY_ID=${keyArn}`);
    }

    console.log('\n========================================================');
    console.log('✅ AWS KMS MASTER KEY CREATION & SETUP COMPLETE!');
    console.log('========================================================');
  } catch (err: any) {
    console.error('\n❌ Failed to provision AWS KMS Key:', err.message);
    process.exit(1);
  }
}

createKmsMasterKey();
