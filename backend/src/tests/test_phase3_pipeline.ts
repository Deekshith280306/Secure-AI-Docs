import crypto from 'crypto';
import speakeasy from 'speakeasy';

const API_BASE = 'http://localhost:5001/api';

async function runPhase3Verification() {
  console.log('=== [PHASE 3 E2E INTEGRATION TEST SUITE] ===\n');

  // 1. HEALTH CHECK
  console.log('1. Testing System Health Check...');
  const healthRes = await fetch(`${API_BASE}/health`);
  const healthData = await healthRes.json();
  console.log('   ✓ Health check status:', healthData.status, '| Database mode:', healthData.database);

  // 2. REGISTER OFFICER
  const officerEmail = `officer_${Date.now()}@policedept.gov.in`;
  console.log(`\n2. Registering Investigating Officer: ${officerEmail}...`);
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: officerEmail,
      password: 'SecurePassword123!',
      name: 'Inspector Vikram Singh',
      role: 'Officer',
    }),
  });
  const regData = await regRes.json();
  if (!regRes.ok) throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
  console.log('   ✓ Officer account registered. Manual TOTP Key issued:', regData.manualKey ? 'YES' : 'NO');

  // 3. COMPLETE 2FA TOTP
  console.log('\n3. Verifying 2FA TOTP Token...');
  const totpToken = speakeasy.totp({
    secret: regData.manualKey,
    encoding: 'base32',
  });
  const verifyRes = await fetch(`${API_BASE}/auth/verify-2fa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tempToken: regData.tempToken,
      code: totpToken,
    }),
  });
  const verifyData = await verifyRes.json();
  if (!verifyRes.ok) throw new Error(`2FA verification failed: ${JSON.stringify(verifyData)}`);
  const officerToken = verifyData.token;
  console.log('   ✓ 2FA Authenticated. JWT token received.');

  // 4. PRE-FLIGHT SHA-256 HASHING
  console.log('\n4. Preparing Tamper-Evident Evidence Payload (BSA 2023 Sec 63)...');
  const dummyFileContent = Buffer.from(
    '%PDF-1.4\n% Evidence FIR DL-CR-2026-8812\nTimestamp: 2026-09-13T10:00:00Z\nAccused: State vs John Doe\nIncident Panchnama confirmed by Cyber Forensic Unit.',
    'utf-8'
  );
  const clientHash = crypto.createHash('sha256').update(dummyFileContent).digest('hex');
  console.log('   ✓ Pre-Flight Client SHA-256 Checksum:', clientHash);

  // 5. REQUEST PRESIGNED UPLOAD URL
  console.log('\n5. Requesting Presigned S3/Vault Upload URL...');
  const uploadUrlRes = await fetch(`${API_BASE}/docs/upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${officerToken}`,
    },
    body: JSON.stringify({
      caseNumber: 'DL-CR-2026-8812',
      title: 'Initial FIR & Panchnama Seizure Report',
      category: 'First Information Report (FIR)',
      fileName: 'FIR_DL_2026_8812.pdf',
      fileSize: dummyFileContent.length,
      mimeType: 'application/pdf',
      clientHash,
    }),
  });
  const uploadUrlData = await uploadUrlRes.json();
  if (!uploadUrlRes.ok) throw new Error(`Upload URL request failed: ${JSON.stringify(uploadUrlData)}`);
  console.log('   ✓ Ticket Granted. Document ID:', uploadUrlData.documentId);
  console.log('   ✓ Presigned Target URL:', uploadUrlData.uploadUrl);
  console.log('   ✓ Storage Provider:', uploadUrlData.provider);

  // 6. DIRECT FILE UPLOAD TO PRESIGNED URL
  console.log('\n6. Direct-Streaming Payload to Vault (Simulating browser PUT)...');
  const putRes = await fetch(uploadUrlData.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/pdf',
      ...(uploadUrlData.headers || {}),
    },
    body: dummyFileContent,
  });
  console.log('   ✓ Raw Payload PUT Status:', putRes.status, putRes.statusText);
  if (!putRes.ok) throw new Error(`Direct PUT failed: ${await putRes.text()}`);

  // 7. CONFIRM UPLOAD & BIT-FOR-BIT VERIFICATION
  console.log('\n7. Calling /api/docs/confirm-upload for Server Bit-for-Bit Hash Verification...');
  const confirmRes = await fetch(`${API_BASE}/docs/confirm-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${officerToken}`,
    },
    body: JSON.stringify({
      documentId: uploadUrlData.documentId,
    }),
  });
  const confirmData = await confirmRes.json();
  if (!confirmRes.ok) throw new Error(`Confirm upload failed: ${JSON.stringify(confirmData)}`);
  console.log('   ✓ Bit-for-Bit Verification Result:', confirmData.message);
  console.log('   ✓ Document Status:', confirmData.document.status);
  console.log('   ✓ Document Hash Stamped:', confirmData.document.fileHash);

  // 8. TEST ANTI-TAMPER REJECTION (SECURITY CHECK)
  console.log('\n8. Security Test: Simulating In-Flight Byte Tampering (Man-In-The-Middle)...');
  const tamperedContent = Buffer.from(
    '%PDF-1.4\n% Evidence FIR DL-CR-2026-8812 [TAMPERED_IN_FLIGHT_BY_ATTACKER]',
    'utf-8'
  );
  // Claiming original clientHash but sending tampered bytes
  const tamperedDocReq = await fetch(`${API_BASE}/docs/upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${officerToken}`,
    },
    body: JSON.stringify({
      caseNumber: 'DL-CR-2026-8812',
      title: 'Tampered Evidence Test',
      category: 'Digital Evidence / Other',
      fileName: 'tampered.pdf',
      fileSize: tamperedContent.length,
      mimeType: 'application/pdf',
      clientHash, // Purposely mismatched with actual tampered bytes
    }),
  });
  const tamperedTicket = await tamperedDocReq.json();
  await fetch(tamperedTicket.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf' },
    body: tamperedContent,
  });
  const tamperedConfirm = await fetch(`${API_BASE}/docs/confirm-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${officerToken}`,
    },
    body: JSON.stringify({ documentId: tamperedTicket.documentId }),
  });
  const tamperedConfirmData = await tamperedConfirm.json();
  if (tamperedConfirm.status === 422) {
    console.log('   ✓ REJECTION VERIFIED (HTTP 422):', tamperedConfirmData.error);
    console.log('     Expected Hash:', tamperedConfirmData.expectedHash);
    console.log('     Actual Hash:  ', tamperedConfirmData.actualHash);
  } else {
    throw new Error('Anti-tamper check failed! Server did not reject tampered payload.');
  }

  // 9. LIST CASE EVIDENCE
  console.log('\n9. Querying Evidence Repository (/api/docs?caseNumber=DL-CR-2026-8812)...');
  const listRes = await fetch(`${API_BASE}/docs?caseNumber=DL-CR-2026-8812`, {
    headers: { Authorization: `Bearer ${officerToken}` },
  });
  const listData = await listRes.json();
  console.log(`   ✓ Found ${listData.total} documents for case DL-CR-2026-8812:`);
  for (const doc of listData.documents) {
    console.log(`     - [${doc.status}] "${doc.title}" | Hash: ${doc.fileHash.slice(0, 16)}...`);
  }

  // 10. PRESIGNED DOWNLOAD & BYTE-FOR-BYTE CHECK
  console.log('\n10. Testing Presigned Download URL Generation...');
  const downloadUrlRes = await fetch(`${API_BASE}/docs/${uploadUrlData.documentId}/download-url`, {
    headers: { Authorization: `Bearer ${officerToken}` },
  });
  const downloadUrlData = await downloadUrlRes.json();
  console.log('   ✓ Download URL Issued:', downloadUrlData.downloadUrl);

  const downloadedRes = await fetch(downloadUrlData.downloadUrl);
  const downloadedBuffer = Buffer.from(await downloadedRes.arrayBuffer());
  const downloadedHash = crypto.createHash('sha256').update(downloadedBuffer).digest('hex');
  if (downloadedHash === clientHash) {
    console.log('   ✓ DOWNLOADED PAYLOAD MATCHES ORIGINAL BIT-FOR-BIT!');
    console.log('     Original Hash:   ', clientHash);
    console.log('     Downloaded Hash: ', downloadedHash);
  } else {
    throw new Error('Downloaded file hash mismatch!');
  }

  // 11. RBAC ZERO-TRUST GUARD
  console.log('\n11. Testing Zero-Trust RBAC: Verifying Auditor CANNOT ingest evidence...');
  const auditorEmail = `auditor_${Date.now()}@cag.gov.in`;
  const regAuditor = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: auditorEmail,
      password: 'AuditorPassword123!',
      name: 'Auditor Sharma',
      role: 'Auditor',
    }),
  });
  const auditorRegData = await regAuditor.json();
  const auditorTotp = speakeasy.totp({
    secret: auditorRegData.manualKey,
    encoding: 'base32',
  });
  const authAuditor = await fetch(`${API_BASE}/auth/verify-2fa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tempToken: auditorRegData.tempToken, code: auditorTotp }),
  });
  const auditorToken = (await authAuditor.json()).token;

  const auditorUploadAttempt = await fetch(`${API_BASE}/docs/upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auditorToken}`,
    },
    body: JSON.stringify({
      caseNumber: 'DL-CR-2026-8812',
      fileName: 'unauthorized.pdf',
      fileSize: 100,
      clientHash,
    }),
  });
  console.log(
    '   ✓ Auditor Upload Attempt Status:',
    auditorUploadAttempt.status,
    auditorUploadAttempt.status === 403 ? '(HTTP 403 Forbidden - ACCESS DENIED AS EXPECTED)' : 'UNEXPECTED'
  );
  if (auditorUploadAttempt.status !== 403) {
    throw new Error('RBAC Failure: Auditor was able to request upload URL!');
  }

  console.log('\n======================================================');
  console.log('🎉 ALL 11 PHASE 3 PIPELINE TESTS PASSED WITH 100% SUCCESS!');
  console.log('======================================================\n');
}

runPhase3Verification().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
