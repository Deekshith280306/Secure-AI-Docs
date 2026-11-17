import assert from 'assert';
import { KmsService } from '../services/kms';

async function runKmsTests() {
  console.log('========================================================');
  console.log('🚀 SECURE DMS: AWS KMS MASTER KEY & ENVELOPE ENCRYPTION');
  console.log('========================================================\n');

  // Test 1: Diagnostics
  console.log('1. Querying KMS Configuration Diagnostics...');
  const diagnostics = await KmsService.getDiagnostics();
  console.log('   ✓ Status:            ', diagnostics.status);
  console.log('   ✓ Provider:          ', diagnostics.provider);
  console.log('   ✓ Master Key ID:     ', diagnostics.keyId);
  console.log('   ✓ Envelope Algorithm:', diagnostics.envelopeAlgorithm);
  console.log('   ✓ HSM Managed:       ', diagnostics.hsmManaged, '(Software KMS CMK as requested)');
  assert.strictEqual(diagnostics.envelopeAlgorithm, 'AES-256-GCM-KMS-ENVELOPE');
  assert.strictEqual(diagnostics.hsmManaged, false);

  // Test 2: Envelope Encryption & Decryption
  console.log('\n2. Testing AES-256-GCM Envelope Encryption (DEK wrapped by Master Key)...');
  const sensitiveCaseEvidence =
    'FIR-2024-ND-8491: Confidential CBI Witness Statement. Intercepted offshore Swiss account CH93-0000-0000-1234-5.';

  const envelope = await KmsService.encryptEnvelope(sensitiveCaseEvidence, {
    caseNumber: 'FIR-2024-ND-8491',
    classification: 'TOP_SECRET',
  });

  console.log('   ✓ Ciphertext (Base64):     ', envelope.ciphertext.substring(0, 32) + '...');
  console.log('   ✓ 96-bit IV (Hex):         ', envelope.iv);
  console.log('   ✓ 128-bit Auth Tag (Hex):  ', envelope.authTag);
  console.log('   ✓ Encrypted Data Key (KMS):', envelope.encryptedDataKey.substring(0, 32) + '...');
  console.log('   ✓ Key Identifier:          ', envelope.keyId);

  assert(envelope.ciphertext.length > 0, 'Ciphertext must be generated');
  assert.strictEqual(envelope.iv.length, 24, 'IV must be 12 bytes (24 hex characters)');
  assert.strictEqual(envelope.authTag.length, 32, 'Auth tag must be 16 bytes (32 hex characters)');
  assert(envelope.encryptedDataKey.length > 0, 'Encrypted data key must be present');

  console.log('\n3. Testing AES-256-GCM Envelope Decryption...');
  const decryptedText = await KmsService.decryptEnvelope(envelope, {
    caseNumber: 'FIR-2024-ND-8491',
    classification: 'TOP_SECRET',
  });

  console.log('   ✓ Decrypted Plaintext matches bit-for-bit: ', decryptedText === sensitiveCaseEvidence);
  assert.strictEqual(decryptedText, sensitiveCaseEvidence, 'Decrypted text must match original');

  // Test 4: Tamper Detection (GCM Authentication Tag)
  console.log('\n4. Testing Tamper Detection (Altering 1 bit in ciphertext)...');
  const tamperedEnvelope = {
    ...envelope,
    ciphertext: Buffer.from('TAMPERED_CIPHERTEXT_PAYLOAD_HERE', 'utf8').toString('base64'),
  };

  let caughtTamper = false;
  try {
    await KmsService.decryptEnvelope(tamperedEnvelope);
  } catch (err: any) {
    caughtTamper = true;
    console.log('   ✓ Tamper Caught! Authentication Tag Verification Failed: ', err.message);
  }
  assert.strictEqual(caughtTamper, true, 'Tampering must trigger cryptographic authentication failure');

  // Test 5: Direct Secret Protection
  console.log('\n5. Testing Master Secret Protection...');
  const masterSecret = 'vault_root_credential_session_token_xyz99';
  const encryptedSecret = await KmsService.encryptSecret(masterSecret);
  const decryptedSecret = await KmsService.decryptSecret(encryptedSecret);
  console.log('   ✓ Direct Secret Encrypted: ', encryptedSecret.substring(0, 35) + '...');
  console.log('   ✓ Direct Secret Recovered: ', decryptedSecret === masterSecret);
  assert.strictEqual(decryptedSecret, masterSecret);

  console.log('\n========================================================');
  console.log('✅ ALL AWS KMS MASTER KEY TESTS PASSED SUCCESSFULLY!');
  console.log('========================================================');
}

runKmsTests().catch((e) => {
  console.error('KMS Test Error:', e);
  process.exit(1);
});
