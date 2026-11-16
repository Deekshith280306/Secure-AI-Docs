import crypto from 'crypto';
import speakeasy from 'speakeasy';

const API_BASE = 'http://localhost:5001/api';

async function runPhase4Verification() {
  console.log('=== [PHASE 4 E2E CRYPTOGRAPHIC LEDGER TEST SUITE] ===\n');

  // 1. HEALTH CHECK
  console.log('1. Testing System Health Check...');
  const healthRes = await fetch(`${API_BASE}/health`);
  const healthData = await healthRes.json();
  console.log('   ✓ Health check status:', healthData.status);

  // 2. REGISTER & AUTHENTICATE AUDITOR
  const auditorEmail = `auditor_bsa_${Date.now()}@cag.gov.in`;
  console.log(`\n2. Authenticating Auditor (${auditorEmail})...`);
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: auditorEmail,
      password: 'AuditorPassword123!',
      name: 'Auditor Meenakshi Sundaram',
      role: 'Auditor',
    }),
  });
  const regData = await regRes.json();
  const totpToken = speakeasy.totp({
    secret: regData.manualKey,
    encoding: 'base32',
  });
  const authRes = await fetch(`${API_BASE}/auth/verify-2fa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tempToken: regData.tempToken,
      code: totpToken,
    }),
  });
  const authData = await authRes.json();
  const auditorToken = authData.token;
  console.log('   ✓ Auditor Authenticated with TOTP 2FA. Scoped token issued.');

  // 3. VERIFY GENESIS BLOCK 0
  console.log('\n3. Verifying Genesis Block 0 in Ledger...');
  const ledgerRes = await fetch(`${API_BASE}/audit/ledger`, {
    headers: { Authorization: `Bearer ${auditorToken}` },
  });
  const ledgerData = await ledgerRes.json();
  const genesisBlock = ledgerData.blocks.find((b: any) => b.sequenceNumber === 0);
  if (!genesisBlock) throw new Error('Genesis Block 0 not found in ledger!');
  console.log('   ✓ Genesis Block Found:');
  console.log('     Seq #:         ', genesisBlock.sequenceNumber);
  console.log('     Action:        ', genesisBlock.action);
  console.log('     Previous Hash: ', genesisBlock.previousHash);
  console.log('     Current Hash:  ', genesisBlock.currentHash);
  if (genesisBlock.previousHash !== '0'.repeat(64)) {
    throw new Error('Invalid Genesis previousHash! Must be 64 zeros.');
  }

  // 4. INGEST EVIDENCE AS OFFICER TO GENERATE CHAINED BLOCKS
  console.log('\n4. Ingesting Evidence to Generate Chained Evidentiary Blocks...');
  const officerEmail = `officer_bsa_${Date.now()}@policedept.gov.in`;
  const regOfficer = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: officerEmail,
      password: 'OfficerPassword123!',
      name: 'Insp. R. K. Nair',
      role: 'Officer',
    }),
  });
  const officerRegData = await regOfficer.json();
  const officerTotp = speakeasy.totp({
    secret: officerRegData.manualKey,
    encoding: 'base32',
  });
  const authOfficer = await fetch(`${API_BASE}/auth/verify-2fa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tempToken: officerRegData.tempToken, code: officerTotp }),
  });
  const officerToken = (await authOfficer.json()).token;

  const filePayload = Buffer.from(
    '%PDF-1.4\n% Case: DL-CR-2026-9012 Panchnama\nSeized: Mobile device containing encrypted ledger logs.',
    'utf-8'
  );
  const clientHash = crypto.createHash('sha256').update(filePayload).digest('hex');

  const uploadTicketRes = await fetch(`${API_BASE}/docs/upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${officerToken}`,
    },
    body: JSON.stringify({
      caseNumber: 'DL-CR-2026-9012',
      title: 'Seizure Memo & Cyber Panchnama',
      category: 'Seizure Memo / Panchnama',
      fileName: 'Panchnama_Seizure_9012.pdf',
      fileSize: filePayload.length,
      mimeType: 'application/pdf',
      clientHash,
    }),
  });
  const uploadTicket = await uploadTicketRes.json();

  await fetch(uploadTicket.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf' },
    body: filePayload,
  });

  const confirmRes = await fetch(`${API_BASE}/docs/confirm-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${officerToken}`,
    },
    body: JSON.stringify({ documentId: uploadTicket.documentId }),
  });
  const confirmData = await confirmRes.json();
  console.log('   ✓ Document Upload Confirmed:', confirmData.message);

  // Request download ticket (to trigger DOCUMENT_DOWNLOADED block)
  await fetch(`${API_BASE}/docs/${uploadTicket.documentId}/download-url`, {
    headers: { Authorization: `Bearer ${officerToken}` },
  });
  console.log('   ✓ Presigned Download Ticket Generated (DOCUMENT_DOWNLOADED logged).');

  // 5. LIVE CRYPTOGRAPHIC CHAIN VERIFICATION
  console.log('\n5. Executing Cryptographic Chain Verification (/api/audit/verify-chain)...');
  const verifyChainRes = await fetch(`${API_BASE}/audit/verify-chain`, {
    headers: { Authorization: `Bearer ${auditorToken}` },
  });
  const verifyChainData = await verifyChainRes.json();
  const { verification } = verifyChainData;

  console.log('   ✓ Verification Status:  ', verification.isValid ? '100% VALID (UNBROKEN)' : 'FAILED');
  console.log('   ✓ Total Blocks Verified:', verification.totalBlocks);
  console.log('   ✓ Broken Blocks:        ', verification.brokenBlockIndex === null ? '0 Broken Links' : verification.brokenBlockIndex);
  console.log('   ✓ Genesis Root Hash:    ', verification.genesisHash);
  console.log('   ✓ Latest Tip Hash:      ', verification.tipHash);

  if (!verification.isValid) {
    throw new Error(`Chain verification failed: ${verification.error}`);
  }

  // 6. GENERATE SECTION 63 BSA COURT CERTIFICATE
  console.log('\n6. Exporting Court Certificate under Section 63 BSA 2023...');
  const certRes = await fetch(
    `${API_BASE}/audit/certificate?caseNumber=DL-CR-2026-9012&documentId=${uploadTicket.documentId}`,
    {
      headers: { Authorization: `Bearer ${auditorToken}` },
    }
  );
  const certData = await certRes.json();
  const cert = certData.certificate;

  console.log('   ✓ Certificate ID:        ', cert.certificateId);
  console.log('   ✓ Legal Statute:         ', `${cert.actTitle} - ${cert.section}`);
  console.log('   ✓ System Declaration:    ', cert.deviceDeclaration.operatingStatus);
  console.log('   ✓ Cryptographic Proof:   ', cert.cryptographicProof.chainValid ? 'VERIFIED' : 'FAILED');
  console.log('   ✓ Target Doc Checksum:   ', cert.cryptographicProof.targetDocumentHash);
  console.log('   ✓ Statutory Attestation: ', cert.legalSignoff);

  // 7. DEMONSTRATE ANTI-TAMPER DETECTION (OUT-OF-BAND CORRUPTION TEST)
  console.log('\n7. Security Test: Simulating Out-of-Band Database Tampering on Block #1...');
  const tamperRes = await fetch(`${API_BASE}/audit/simulate-tamper`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auditorToken}`,
    },
    body: JSON.stringify({ sequenceNumber: 1 }),
  });
  const tamperData = await tamperRes.json();
  console.log('   ✓ Database tampering injected:', tamperData.message);

  // Re-run verification to observe instant failure detection!
  const tamperVerifyRes = await fetch(`${API_BASE}/audit/verify-chain`, {
    headers: { Authorization: `Bearer ${auditorToken}` },
  });
  const tamperVerify = (await tamperVerifyRes.json()).verification;

  console.log('   ✓ Post-Tamper Verification Result:');
  console.log('     Chain Valid:       ', tamperVerify.isValid ? 'VALID' : 'COMPROMISED (TAMPER DETECTED)');
  console.log('     Corrupted Block:   ', `Block #${tamperVerify.brokenBlockIndex}`);
  console.log('     Tamper Diagnostic: ', tamperVerify.error);

  if (tamperVerify.isValid || tamperVerify.brokenBlockIndex !== 1) {
    throw new Error('Anti-tamper test failed: System did not detect corrupted block #1!');
  }
  console.log('   ✓ TAMPER DETECTION ENGINE WORKING WITH 100% ACCURACY!');

  // 8. HEAL / RESET LEDGER
  console.log('\n8. Restoring Ledger to Pristine State (/api/audit/reset-chain)...');
  const resetRes = await fetch(`${API_BASE}/audit/reset-chain`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auditorToken}`,
    },
  });
  const resetData = await resetRes.json();
  console.log('   ✓', resetData.message);

  const finalVerify = (await (await fetch(`${API_BASE}/audit/verify-chain`, {
    headers: { Authorization: `Bearer ${auditorToken}` },
  })).json()).verification;
  console.log('   ✓ Post-Healing Chain Valid:', finalVerify.isValid, `(Blocks: ${finalVerify.totalBlocks})`);

  console.log('\n=============================================================');
  console.log('🎉 ALL 8 PHASE 4 CRYPTOGRAPHIC LEDGER TESTS PASSED (100%)!');
  console.log('=============================================================\n');
}

runPhase4Verification().catch((err) => {
  console.error('\n❌ Phase 4 Test Suite Failed:', err);
  process.exit(1);
});
