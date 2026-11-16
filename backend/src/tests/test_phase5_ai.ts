import crypto from 'crypto';

const API_BASE = 'http://localhost:5001/api';

async function runTests() {
  console.log('================================================================');
  console.log('   PHASE 5: GEMINI AI & OCR EXTRACTION ENGINE TEST SUITE');
  console.log('   (BSA 2023 Sec 63 / Privacy Redaction / Semantic Search)');
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
    // 1. Check AI Engine Status
    console.log('Test 1: Check AI Engine Status Endpoint');
    const statusRes = await waitForServer(`${API_BASE}/ai/status`);
    const statusData = await statusRes.json();
    assert(statusRes.status === 200, 'HTTP 200 returned from /api/ai/status');
    assert(statusData.status === 'online', 'AI engine status is online');
    assert(Array.isArray(statusData.capabilities) && statusData.capabilities.length >= 4, 'Engine lists legal OCR & privacy capabilities');
    console.log(`     Active Engine: ${statusData.engine}\n`);

    // 2. Authenticate as Investigating Officer
    console.log('Test 2: Authenticate as Investigating Officer (Demo Login)');
    const authRes = await fetch(`${API_BASE}/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'Officer' }),
    });
    const authData = await authRes.json();
    assert(authRes.status === 200, 'Officer authenticated successfully');
    const token = authData.token;
    assert(Boolean(token), 'JWT Bearer token received\n');

    // 3. Ingest a realistic Indian Police FIR Document
    console.log('Test 3: Ingest Simulated FIR with Unmasked Sensitive PII into Vault');
    const rawFirContent = `POLICE STATION FIRST INFORMATION REPORT
State: Karnataka | District: Bengaluru City | Police Station: Indiranagar Cyber Crime PS
FIR No: 204/2024 | Date of Occurrence: 12-Sep-2024 | Time: 11:45 IST
Acts & Sections: BNS 2023 Sec 318(4) [Cheating], IT Act Sec 66D [Identity Theft / Impersonation]
Complainant: Rajesh Kumar (SBI Branch Manager, Bengaluru)
Complainant Contact: +91 98450 12345 | Aadhaar: 5498 7612 3490 | Email: rajesh.kumar@sbi-bank.in
Accused Person(s): Vikramaditya S. (Alias 'Phantom_09'), PAN: ABCDE1234F
Incident Narrative: The accused deployed a fraudulent phishing mirror gateway to siphon unauthorized banking funds totaling Rs. 42,50,000. Seized digital devices include 1x Apple MacBook Pro and 2x encrypted flash drives.
Investigating Officer: Inspector K. Ramanathan, Badge #KA-8812.`;

    const firBuffer = Buffer.from(rawFirContent, 'utf-8');
    const clientHash = crypto.createHash('sha256').update(firBuffer).digest('hex');

    // Request upload URL
    const uploadUrlRes = await fetch(`${API_BASE}/docs/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        caseNumber: 'CR-2024-AI-709',
        title: 'Cyber Fraud Indiranagar FIR & Evidence Ledger',
        category: 'First Information Report (FIR)',
        fileName: 'FIR_204_2024_Indiranagar_Cyber.txt',
        fileSize: firBuffer.length,
        mimeType: 'text/plain',
        clientHash,
      }),
    });
    const uploadUrlData = await uploadUrlRes.json();
    assert(uploadUrlRes.status === 200, 'Presigned upload ticket generated');
    const docId = uploadUrlData.documentId;
    const uploadEndpoint = uploadUrlData.uploadUrl;

    // Upload file bytes to local vault
    const putRes = await fetch(uploadEndpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: firBuffer,
    });
    assert(putRes.status === 200, 'File binary streamed into evidence vault');

    // Verify file hash and confirm upload
    const verifyRes = await fetch(`${API_BASE}/docs/confirm-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ documentId: docId }),
    });
    const verifyData = await verifyRes.json();
    assert(verifyRes.status === 200, 'Vault confirmed bit-for-bit SHA-256 match\n');

    // 4. Trigger AI OCR & Legal Metadata Extraction
    console.log('Test 4: Trigger Gemini AI / Legal OCR Extraction Engine');
    const aiRes = await fetch(`${API_BASE}/ai/analyze/${docId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const aiData = await aiRes.json();
    assert(aiRes.status === 200, 'HTTP 200 returned from /api/ai/analyze');
    assert(Boolean(aiData.document.extractedData), 'Structured legal metadata extracted');
    
    const ext = aiData.document.extractedData;
    console.log(`     Extracted FIR Number:   ${ext.firNumber}`);
    console.log(`     Police Station:         ${ext.policeStation}`);
    console.log(`     Acts & Penal Sections:  ${ext.actsAndSections.join(', ')}`);
    console.log(`     Accused Persons:        ${ext.accusedPersons.join(', ')}`);
    console.log(`     Confidence Score:       ${(ext.confidenceScore * 100).toFixed(1)}%`);

    assert(ext.firNumber.includes('204'), 'Extracted correct FIR number (204)');
    assert(ext.policeStation.includes('Indiranagar'), 'Extracted correct Police Station (Indiranagar)');
    assert(ext.actsAndSections.some((s: string) => s.includes('318') || s.includes('Cheating')), 'Extracted BNS Cheating Section');
    assert(Boolean(aiData.auditBlock), 'AI run sealed with cryptographic audit block\n');

    // 5. Verify Automatic PII Redaction
    console.log('Test 5: Verify Automated PII Redaction (Aadhaar, Phone, PAN, Email)');
    const redactedText = aiData.document.redactedText;
    const redactions = aiData.document.piiRedactions;

    console.log(`     Total PII Redactions Found: ${redactions.length}`);
    redactions.forEach((r: any) => console.log(`       * ${r.type}: ${r.maskedSnippet} (Count: ${r.count})`));

    assert(!redactedText.includes('5498 7612 3490'), 'Raw Aadhaar number is completely masked');
    assert(redactedText.includes('XXXX-XXXX-3490'), 'Masked Aadhaar format adheres to UIDAI privacy standard');
    assert(!redactedText.includes('98450 12345'), 'Raw mobile phone number is completely masked');
    assert(redactedText.includes('+91-XXXXX-12345'), 'Masked phone number preserves last digits for court verification');
    assert(!redactedText.includes('ABCDE1234F'), 'Raw PAN card number is masked\n');

    // 6. Test Natural Language & Semantic Search
    console.log('Test 6: Natural Language & Semantic Case Search');
    const searchRes = await fetch(`${API_BASE}/ai/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: 'Indiranagar banking cyber fraud cheating' }),
    });
    const searchData = await searchRes.json();
    assert(searchRes.status === 200, 'Search query executed successfully');
    assert(searchData.totalMatches > 0, `Search returned ${searchData.totalMatches} relevant case match(es)`);
    const topMatch = searchData.results[0];
    console.log(`     Top Hit: Case ${topMatch.document.caseNumber} - "${topMatch.document.title}"`);
    console.log(`     Relevance Score: ${topMatch.relevanceScore}`);
    console.log(`     Match Reasons: ${topMatch.matchReasons.join('; ')}\n`);
    assert(topMatch.document.id === docId, 'Semantic search pinpointed the newly analyzed case\n');

    // 7. Verify Blockchain Ledger Integrity after AI Blocks
    console.log('Test 7: Verify Blockchain Ledger Integrity (BSA 2023 Sec 63 Compliance)');
    const verifyChainRes = await fetch(`${API_BASE}/audit/verify-chain`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const chainData = await verifyChainRes.json();
    const ver = chainData.verification;
    assert(ver.isValid === true, 'Entire SHA-256 audit ledger is 100% valid');
    assert(ver.brokenBlockIndex === null, 'Zero broken cryptographic links found');
    console.log(`     Total Verified Blocks in Ledger: ${ver.totalBlocks}`);
    console.log(`     Genesis Hash: ${ver.genesisHash ? ver.genesisHash.slice(0, 24) : 'N/A'}...`);
    console.log(`     Tip Hash:     ${ver.tipHash ? ver.tipHash.slice(0, 24) : 'N/A'}...\n`);

    console.log('================================================================');
    console.log(`   TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  }
}

runTests();
