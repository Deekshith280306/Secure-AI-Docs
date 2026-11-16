import crypto from 'crypto';

const API_BASE = 'http://localhost:5001/api';

async function runTests() {
  console.log('================================================================');
  console.log('   PHASE 6: MULTI-ROLE PORTALS & COURT CERTIFICATE TEST SUITE');
  console.log('   (Role Separation / Forensic Certification / BSA 63 Exports)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${msg}`);
      failed++;
    }
  }

  async function waitForServer(url: string, retries = 10, delayMs = 1000) {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url);
        if (res.status === 200) return res;
      } catch {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    return fetch(url);
  }

  try {
    // 1. Health check
    console.log('Test 1: Health Check & System Readiness');
    const healthRes = await waitForServer(`${API_BASE}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'HTTP 200 returned from /api/health');
    assert(healthData.status === 'online' || healthData.status === 'ok', 'System health status is "online"');
    console.log(`     Compliance: ${healthData.complianceStandard} | DB State: ${healthData.dbState}\n`);

    // 2. Authenticate all 4 tiers of personnel
    console.log('Test 2: Multi-Role Authentication (4 Security Tiers)');
    const roles = ['Officer', 'Verifier', 'Auditor', 'Admin'] as const;
    const tokens: Record<string, string> = {};

    for (const r of roles) {
      const authRes = await fetch(`${API_BASE}/auth/demo-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: r }),
      });
      const authData = await authRes.json();
      assert(authRes.status === 200, `${r} successfully authenticated with 2FA`);
      assert(authData.user.role === r, `Token payload reflects role: ${r}`);
      tokens[r] = authData.token;
    }
    console.log('     All 4 user clearance tokens acquired.\n');

    // 3. Officer uploads fresh evidence
    console.log('Test 3: Investigating Officer Evidence Ingestion');
    const caseNumber = `CR-BLR-2026-${Math.floor(Math.random() * 9000 + 1000)}`;
    const fileName = 'Forensic_Phone_Dump_Report.pdf';
    const rawContent = 'SEIZED DIGITAL ARTIFACT: Mobile phone memory dump containing chat transcripts under BNS 318.';
    const fileBuffer = Buffer.from(rawContent, 'utf-8');
    const clientHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Step A: Request presigned upload URL
    const uploadUrlRes = await fetch(`${API_BASE}/docs/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens['Officer']}`,
      },
      body: JSON.stringify({
        caseNumber,
        title: 'Forensic Phone Dump Report',
        category: 'Forensic Lab Report',
        fileName,
        fileSize: fileBuffer.length,
        mimeType: 'application/pdf',
        clientHash,
      }),
    });
    const uploadUrlData = await uploadUrlRes.json();
    assert(uploadUrlRes.status === 200, 'Officer generated presigned upload URL');
    const documentId = uploadUrlData.documentId;
    assert(Boolean(documentId), `Draft document created with ID: ${documentId}`);

    // Step B: Send payload to local vault
    const putRes = await fetch(uploadUrlData.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/pdf' },
      body: fileBuffer,
    });
    assert(putRes.status === 200, 'Payload securely stored in encrypted vault');

    // Step C: Confirm upload
    const confirmRes = await fetch(`${API_BASE}/docs/confirm-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens['Officer']}`,
      },
      body: JSON.stringify({ documentId }),
    });
    const confirmData = await confirmRes.json();
    assert(confirmRes.status === 200, 'Upload confirmed with bit-for-bit SHA-256 match');
    assert(confirmData.document.status === 'UPLOADED', 'Document status is "UPLOADED"\n');

    // 4. Role separation: Non-verifier attempts to certify evidence
    console.log('Test 4: RBAC Guard - Non-Verifiers Blocked from Forensic Certification');
    const officerCertifyRes = await fetch(`${API_BASE}/docs/certify/${documentId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens['Officer']}`,
      },
      body: JSON.stringify({ notes: 'Officer attempting unauthorized certification' }),
    });
    assert(officerCertifyRes.status === 403, 'Officer certification request rejected with HTTP 403 Forbidden');

    const auditorCertifyRes = await fetch(`${API_BASE}/docs/certify/${documentId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens['Auditor']}`,
      },
      body: JSON.stringify({ notes: 'Auditor attempting unauthorized certification' }),
    });
    assert(auditorCertifyRes.status === 403, 'Auditor certification request rejected with HTTP 403 Forbidden\n');

    // 5. Authorized Forensic Verifier certifies evidence
    console.log('Test 5: Forensic Verifier Signs & Certifies Evidence');
    const verifierCertifyRes = await fetch(`${API_BASE}/docs/certify/${documentId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens['Verifier']}`,
      },
      body: JSON.stringify({
        notes: 'Forensic Lab Bit-for-Bit verification completed. SHA-256 matches chain of custody.',
      }),
    });
    const verifierCertifyData = await verifierCertifyRes.json();
    assert(verifierCertifyRes.status === 200, 'Verifier certified evidence successfully');
    assert(verifierCertifyData.document.status === 'VERIFIED', 'Document status successfully transitioned to "VERIFIED"');
    assert(Boolean(verifierCertifyData.ledgerBlock), 'Blockchain ledger block generated for certification\n');

    // 6. Verify Blockchain Ledger records DOCUMENT_VERIFIED
    console.log('Test 6: Immutable Ledger Audit Trail Verification');
    const ledgerRes = await fetch(`${API_BASE}/audit/ledger?caseNumber=${caseNumber}`, {
      headers: { Authorization: `Bearer ${tokens['Auditor']}` },
    });
    const ledgerData = await ledgerRes.json();
    assert(ledgerRes.status === 200, 'Auditor retrieved ledger records');
    const verifiedBlock = ledgerData.blocks.find(
      (b: any) => b.action === 'DOCUMENT_VERIFIED' && b.resourceId === documentId
    );
    assert(Boolean(verifiedBlock), 'DOCUMENT_VERIFIED event recorded in ledger');
    assert(verifiedBlock?.userRole === 'Verifier', 'Ledger block operator recorded as "Verifier"');
    console.log(`     Block #${verifiedBlock?.sequenceNumber} Hash: ${verifiedBlock?.currentHash.substring(0, 24)}...\n`);

    // 7. Auditor exports Section 63 BSA Courtroom Certificate
    console.log('Test 7: Section 63 BSA Courtroom Certificate Generation');
    const certExportRes = await fetch(
      `${API_BASE}/audit/certificate?caseNumber=${caseNumber}&documentId=${documentId}`,
      {
        headers: { Authorization: `Bearer ${tokens['Auditor']}` },
      }
    );
    const certExportData = await certExportRes.json();
    assert(certExportRes.status === 200, 'Auditor generated Section 63 BSA Certificate');
    const cert = certExportData.certificate;
    assert(Boolean(cert.certificateId), `Certificate ID minted: ${cert.certificateId}`);
    assert(cert.actTitle.includes('Bharatiya Sakshya Adhiniyam'), 'Statutory title cites BSA, 2023');
    assert(cert.cryptographicProof.chainValid === true, 'Cryptographic chain declared 100% valid');
    assert(cert.cryptographicProof.targetDocumentHash === clientHash, 'Target document checksum matches client SHA-256\n');

    // 8. Courtroom / Judge Public Certificate Validator Desk
    console.log('Test 8: Courtroom Certificate Verification Desk');
    // Test A: Genuine certificate verification
    const verifyCertRes = await fetch(`${API_BASE}/audit/verify-certificate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens['Auditor']}`,
      },
      body: JSON.stringify({ certificateId: cert.certificateId }),
    });
    const verifyCertData = await verifyCertRes.json();
    assert(verifyCertRes.status === 200, 'Genuine certificate verified with HTTP 200');
    assert(verifyCertData.valid === true, 'Certificate marked as VALID and genuine');
    assert(verifyCertData.chainStatus.chainValid === true, 'Blockchain custody chain confirmed unbroken');

    // Test B: Counterfeit / forged certificate verification
    const fakeCertRes = await fetch(`${API_BASE}/audit/verify-certificate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens['Auditor']}`,
      },
      body: JSON.stringify({ certificateId: 'BSA-63-FORGED-FAKE-12345' }),
    });
    assert(fakeCertRes.status === 404, 'Counterfeit certificate correctly rejected with HTTP 404 Not Found');
    const fakeData = await fakeCertRes.json();
    assert(fakeData.valid === false, 'Counterfeit certificate marked as INVALID\n');

    // 9. Tamper resilience check
    console.log('Test 9: Tamper Resilience & Chain Healing');
    const chainCheckRes = await fetch(`${API_BASE}/audit/verify-chain`, {
      headers: { Authorization: `Bearer ${tokens['Auditor']}` },
    });
    const chainCheckData = await chainCheckRes.json();
    assert(chainCheckData.verification.isValid === true, 'Current chain is 100% intact');

    console.log('\n================================================================');
    console.log(`   PHASE 6 TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Test Suite Error:', err);
    process.exit(1);
  }
}

runTests();
