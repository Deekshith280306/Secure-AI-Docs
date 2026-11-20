import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header (Only on page 2 and later)
        if self._pageNumber > 1:
            self.drawString(54, letter[1] - 36, "SECURE AI DOCS — Official Presentation Defense Script | MVSR Engineering College (Batch 22)")
            self.drawRightString(letter[0] - 54, letter[1] - 36, "Sem V (2025-2026)")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(54, letter[1] - 42, letter[0] - 54, letter[1] - 42)
        
        # Footer
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 54, 32, page_text)
        self.drawString(54, 32, "Confidential — Academic & Examination Viva Defense Use Only")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(54, 42, letter[0] - 54, 42)
        
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor("#0f172a"),
        alignment=0,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=16,
        textColor=colors.HexColor("#334155"),
        spaceAfter=15
    )

    slide_heading_style = ParagraphStyle(
        'SlideHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=14,
        spaceAfter=6
    )

    badge_style = ParagraphStyle(
        'SpeakerBadge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#0284c7")
    )

    cue_style = ParagraphStyle(
        'VisualCue',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#b45309")
    )

    speech_style = ParagraphStyle(
        'SpeechText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=15,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=8
    )

    qa_q_style = ParagraphStyle(
        'QAQuestion',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=6,
        spaceAfter=3
    )

    qa_a_style = ParagraphStyle(
        'QAAnswer',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#334155"),
        spaceAfter=8
    )

    story = []

    # Title Block
    story.append(Paragraph("SECURE AI DOCS: Complete Presentation Script", title_style))
    meta_text = """
    <b>Institution:</b> Matrusri Engineering College (Affiliated to Osmania University), Nadergul, Hyderabad<br/>
    <b>Department:</b> Computer Science & Engineering (Allied Branches) — BE CSE-AI & ML, Sem V (2025-2026)<br/>
    <b>Batch No:</b> 22 &nbsp;|&nbsp; <b>Project Guide:</b> Dr. Sesham Anand, Associate Professor<br/>
    <b>Student Team:</b> Ginna Deekshith Sharma (2451-24-748-019) &amp; Pilla Krishna Rishik (2451-24-748-051)<br/>
    <b>Live Deployments:</b> Cloudflare (<code>https://secure-ai-docs.ginnadeekshith7.workers.dev/</code>) &amp; Render (<code>https://secure-ai-docs-frontend.onrender.com/</code>)
    """
    story.append(Paragraph(meta_text, subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=15))

    # Presentation Guidelines Box
    guide_html = """
    <b>🎯 Presentation Strategy &amp; Delivery Tips:</b><br/>
    • <b>Total Recommended Time:</b> 10 to 12 minutes (approx. 35–45 seconds per slide) + 3–5 minutes Q&amp;A.<br/>
    • <b>Speaker Roles:</b> Marked as <b>[Deekshith]</b> and <b>[Krishna Rishik]</b>. Can be presented interchangeably or combined if presenting solo.<br/>
    • <b>Slide Actions:</b> Highlighted in brown italics to remind you when to click or point to visual elements.<br/>
    • <b>Key Academic Keywords to Stress:</b> Section 63 BSA 2023, SHA-256 Merkle Ledger, Dual-Custody Verification, AES-256-GCM Envelope Encryption, pgvector 384D.
    """
    guide_table = Table([[Paragraph(guide_html, speech_style)]], colWidths=[letter[0]-108])
    guide_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(guide_table)
    story.append(Spacer(1, 15))

    slides = [
        {
            "num": 1,
            "title": "Title Slide (Project & Team Introduction)",
            "speaker": "Speaker 1 (Deekshith)",
            "cue": "[Display Slide 1. Maintain confident posture and smile at the evaluation panel.]",
            "content": """
            "Respected Guide Dr. Sesham Anand Sir, honourable external and internal examiners, and fellow classmates — a very good morning to all of you.
            <br/><br/>
            I am <b>Ginna Deekshith Sharma</b>, along with my project partner <b>Pilla Krishna Rishik</b>. We belong to Batch Number 22 from the Department of Computer Science and Engineering (Allied Branches), pursuing B.E. in Artificial Intelligence and Machine Learning.
            <br/><br/>
            Today, we are proud to present our Semester V project titled <b>'Secure AI Docs'</b>: an AI-Powered Secure Digital Document Management System specifically engineered for legal and investigation dossiers, ensuring strict evidentiary compliance under Section 63 of the Bharatiya Sakshya Adhiniyam, 2023.
            <br/><br/>
            Our platform is fully deployed, cloud-ready, and live on both Cloudflare Workers edge network and Render Cloud. Let us delve into the critical real-world problem that motivated this architecture."
            """
        },
        {
            "num": 2,
            "title": "Problem Statement, Scope & Objectives",
            "speaker": "Speaker 2 (Krishna Rishik)",
            "cue": "[Transition to Slide 2. Point to the three distinct sections: Problem, Scope, and Bulleted Objectives.]",
            "content": """
            "Thank you, Deekshith. Respected panel, in modern criminal and forensic investigations, agencies handle immense volumes of sensitive records—ranging from handwritten First Information Reports (FIRs) and charge sheets to forensic extraction dumps.
            <br/><br/>
            <b>The Problem:</b> Manual document review is painfully slow and prone to human oversight. Traditional systems lack cross-case intelligence and semantic search. Most critically, they are vulnerable to unauthorized access and broken chain-of-custody, making digital evidence questionable in court under <b>Section 63 of the new Bharatiya Sakshya Adhiniyam (BSA), 2023</b> (which superseded the old Section 65B of the Indian Evidence Act).
            <br/><br/>
            <b>Project Scope:</b> We designed a complete, full-stack, zero-trust web application. It automates OCR text extraction, legal Named Entity Recognition (NER), vector-based semantic search with pgvector, automated chronological case timelines, and an immutable SHA-256 Merkle hash chain.
            <br/><br/>
            <b>Key Objectives:</b>
            1. Automate legal OCR with confidence scoring.
            2. Eliminate manual bottlenecks via 384-dimensional cosine vector search.
            3. Surface hidden cross-case links through automated timelines and entity graphs.
            4. Guarantee cryptographic non-repudiation and court admissibility.
            5. Enforce zero-trust security with mandatory TOTP 2-Factor Authentication and granular 4-role RBAC."
            """
        },
        {
            "num": 3,
            "title": "Application Areas & Industry Challenges",
            "speaker": "Speaker 1 (Deekshith)",
            "cue": "[Transition to Slide 3. Draw a comparative gesture between the left application column and right challenges column.]",
            "content": """
            "On this slide, you see the direct institutional application areas alongside the real-world engineering hurdles we solved.
            <br/><br/>
            <b>Who uses this platform?</b>
            State Police Commissionerates for case diaries; Economic Offences Wings (EOW) and Financial Intelligence Units (FIU); Central Agencies like the CBI, NIA, and ED; Judicial Courts and Prosecution Directorates; and Forensic Science Laboratories (FSL).
            <br/><br/>
            <b>The Tough Engineering Challenges:</b>
            First, police scans are notoriously degraded, rotated, or handwritten. Second, when evidence moves between the investigating officer, the forensic lab, and the court, there is a massive risk of chain-of-custody repudiation. Third, evidence often leaks during inter-agency transit. And fourth, AI models can hallucinate critical penal provisions if not strictly constrained.
            <br/><br/>
            Our system directly addresses each of these vulnerabilities through client-side cryptographic hashing, dual-custody verification, and multimodal vision models."
            """
        },
        {
            "num": 4,
            "title": "Software & Hardware Requirements",
            "speaker": "Speaker 2 (Krishna Rishik)",
            "cue": "[Transition to Slide 4. Direct the panel's attention to the tech stack table.]",
            "content": """
            "Here is our complete software and technology stack.
            <br/><br/>
            • <b>Frontend:</b> Built using React.js 18 with TypeScript 5.8 for strict compile-time type safety, styled with Tailwind CSS for modern responsive interfaces.
            <br/>
            • <b>Backend API:</b> Dual orchestration using Node.js/Express 4.21 and asynchronous FastAPI Python pipelines to handle intensive machine learning workflows.
            <br/>
            • <b>Databases:</b> PostgreSQL equipped with the <code>pgvector</code> extension for storing high-dimensional vector embeddings, paired with MongoDB Atlas for structured document metadata.
            <br/>
            • <b>AI &amp; NLP Engine:</b> PaddleOCR and Tesseract for multi-orientation text extraction; spaCy and HuggingFace Transformers for legal entity extraction; and Sentence Transformers to compute dense 384-dimensional embeddings.
            <br/>
            • <b>Security Layer:</b> Cryptographic SHA-256 Merkle hash chaining, Speakeasy TOTP 2-Factor Authentication, and bcrypt password hashing.
            <br/>
            • <b>Client Requirement:</b> Lightweight! Runs on any standard browser with zero special client-side hardware needed."
            """
        },
        {
            "num": 5,
            "title": "Certifications (Domain Credentials)",
            "speaker": "Speaker 1 (Deekshith)",
            "cue": "[Transition to Slide 5. Acknowledge both certificates on screen.]",
            "content": """
            "To build solid domain competence in designing and fine-tuning machine learning models for this project, both team members completed formal professional certifications.
            <br/><br/>
            As shown on the slide, both myself, <b>Ginna Deekshith Sharma</b>, and my partner, <b>Pilla Krishna Rishik</b>, earned verified certifications in <b>'Intro to Machine Learning' from Kaggle</b>, mastering core principles of model training, feature validation, validation matrices, and algorithmic optimization."
            """
        },
        {
            "num": 6,
            "title": "Input / Output (I/O) Specifications",
            "speaker": "Speaker 2 (Krishna Rishik)",
            "cue": "[Transition to Slide 6. Walk through the clean separation between system inputs and cryptographic outputs.]",
            "content": """
            "Now let us examine the input and output boundaries of the platform.
            <br/><br/>
            <b>Inputs to the System:</b>
            1. User credentials, time-based OTP codes, and role clearances.
            2. Scanned legal files, FIRs, charge sheets, and forensic dumps in PDF, TIFF, or JPEG formats.
            3. Human-in-the-loop review corrections and bounding-box adjustments.
            4. Natural language investigative queries (e.g., 'Find all cases involving cyber fraud with Indiranagar jurisdiction').
            <br/><br/>
            <b>System Outputs:</b>
            1. Short-lived 15-minute JWT access tokens signed with role-based claims.
            2. OCR-extracted plain text with structured bounding coordinates.
            3. Extracted legal entities—such as accused names, BNS penal codes, dates, and seized devices—with confidence percentages.
            4. 384-dimensional vector embeddings stored for semantic cosine similarity search.
            5. Verifiable SHA-256 Merkle ledger records.
            6. And finally, official, court-admissible <b>Section 63 BSA Digital Certificates</b> complete with verification QR codes."
            """
        },
        {
            "num": 7,
            "title": "Proposed System Architecture",
            "speaker": "Speaker 1 (Deekshith)",
            "cue": "[Transition to Slide 7. Trace the architecture from Client -> Gateway -> AI Services -> Storage & Ledger.]",
            "content": """
            "Slide 7 illustrates the core architecture of Secure AI Docs.
            <br/><br/>
            <b>Tier 1: Client Layer:</b> The browser client features dedicated role workspaces for the Officer, Forensic Verifier, Court Auditor, and Administrator. All network communication occurs strictly over HTTPS.
            <br/><br/>
            <b>Tier 2: Backend API Gateway:</b> Built on Express and FastAPI, enforcing strict middleware for JWT authentication, RBAC policy enforcement, rate limiting, and business logic routing.
            <br/><br/>
            <b>Tier 3: AI &amp; Extraction Microservice:</b> Incoming files pass through an automated OCR and NLP pipeline that classifies documents, extracts entities, and computes an AI confidence score. Low-confidence extractions are automatically routed to the <b>Human Verification Desk</b>.
            <br/><br/>
            <b>Tier 4: Storage &amp; Cryptographic Ledger:</b> Raw files are encrypted with AES-256-GCM and stored securely in AWS S3 vaults. Simultaneously, metadata and vectors are written to PostgreSQL/MongoDB, while every single action is permanently recorded on our <b>Tamper-Evident SHA-256 Merkle Ledger</b>."
            """
        },
        {
            "num": 8,
            "title": "Application Flowchart & Custody Lifecycle",
            "speaker": "Speaker 2 (Krishna Rishik)",
            "cue": "[Transition to Slide 8. Guide the examiners along the decision diamonds from left to right.]",
            "content": """
            "Slide 8 outlines the end-to-end procedural workflow of an evidentiary record.
            <br/><br/>
            1. <b>Entry Gate:</b> The officer logs in with mandatory 2-Factor TOTP authentication.
            <br/>
            2. <b>Pre-Flight RAM Ingestion:</b> Before a single byte leaves the officer's browser, the <b>WebCrypto API</b> computes the file's SHA-256 cryptographic digest in local browser memory.
            <br/>
            3. <b>Envelope Sealing:</b> The file is encrypted with AES-256-GCM, and multimodal AI automatically extracts BNS sections while masking Aadhaar, phone numbers, and sensitive PII.
            <br/>
            4. <b>Dual-Custody Decision:</b> An investigating officer <i>cannot</i> self-approve evidence! A separate Forensic Verifier must inspect the file. The system independently recalculates the checksum:
               • If the hashes match, the Verifier applies an unforgeable forensic stamp.
               • If even a single bit differs, the system raises an immediate Tamper Alarm and blocks the record.
            <br/>
            5. <b>Ledger &amp; Certificate:</b> The event is appended to the SHA-256 Merkle Ledger, generating an official Section 63 BSA Court Certificate."
            """
        },
        {
            "num": 9,
            "title": "Implementation & Development Environment",
            "speaker": "Speaker 1 (Deekshith)",
            "cue": "[Transition to Slide 9. Point out the Antigravity IDE and modern modular implementation.]",
            "content": """
            "On Slide 9, we showcase our engineering and development setup.
            <br/><br/>
            The entire platform was architected using <b>Antigravity</b>, an advanced AI-assisted development environment that orchestrated our multi-tiered microservices.
            <br/><br/>
            <b>Key Technical Highlights:</b>
            • <b>Frontend:</b> Modular React with Vite, zero build errors, fully tree-shaken production bundles.
            <br/>
            • <b>Backend:</b> Modular TypeScript routing with strict separation of concerns—controllers, models, services, and middlewares.
            <br/>
            • <b>Cryptographic Service:</b> Native implementation of KMS Master Key envelope encryption and append-only cryptographic ledger tracking.
            <br/>
            • <b>Cloud Infrastructure:</b> Production deployments across Cloudflare Workers CDN, Render Cloud Web Services, and AWS S3 with server-side encryption."
            """
        },
        {
            "num": 10,
            "title": "Module Description",
            "speaker": "Speaker 2 (Krishna Rishik)",
            "cue": "[Transition to Slide 10. Run through the seven architectural modules concisely.]",
            "content": """
            "Slide 10 details the seven distinct modules powering our system:
            <br/><br/>
            1. <b>User Authentication &amp; RBAC:</b> Provides 4-tier clearance (Investigating Officer, Forensic Verifier, Court Auditor, and System Admin) backed by bcrypt and TOTP.
            <br/>
            2. <b>Direct S3 Upload Pre-Signing:</b> High-speed, private uploads via short-lived, pre-signed AWS URLs.
            <br/>
            3. <b>AI &amp; Multimodal Ingestion:</b> Extracts text, tags IPC/BNS statutory provisions, and scores extraction certainty.
            <br/>
            4. <b>Tamper-Evident Audit Hash-Chain:</b> Chained cryptographic blocks providing an unalterable history of every custody transfer.
            <br/>
            5. <b>Verifier Queue &amp; Dual-Pane Review:</b> Side-by-side split screen comparing raw scans against parsed AI facts.
            <br/>
            6. <b>Interactive Case Timeline:</b> Chronological visual graph linking suspects, FIRs, and seized evidence across cases.
            <br/>
            7. <b>Section 63 BSA Certificate Generator:</b> Generates court-compliant PDF certificates with cryptographic proof of authenticity."
            """
        },
        {
            "num": 11,
            "title": "Testing & UAT Verification Matrix",
            "speaker": "Speaker 1 (Deekshith)",
            "cue": "[Transition to Slide 11. Emphasize the 100% Pass rate across all 8 test cases.]",
            "content": """
            "Excellence in security demands rigorous verification. Slide 11 showcases our formal User Acceptance Testing (UAT) matrix.
            <br/><br/>
            We engineered eight dedicated test cases covering the entire security and functional perimeter:
            • <b>TC-01 (RBAC Clearance):</b> Passed. Role boundaries strictly enforced.
            • <b>TC-02 (Pre-Flight Hashing):</b> Passed. Browser RAM SHA-256 matches server intake bit-for-bit.
            • <b>TC-03 (Envelope AES-256-GCM Vault):</b> Passed. Ephemeral DEKs wrapped by Master KEK with 128-bit authentication tags.
            • <b>TC-04 (Multimodal OCR &amp; Redaction):</b> Passed. Accurate BNS classification and automated PII masking.
            • <b>TC-05 (Dual-Custody Sealing):</b> Passed. Self-approval blocked; verifier verification confirmed.
            • <b>TC-06 (Merkle Ledger Immutability):</b> Passed. Every block chains back to Genesis Block 0.
            • <b>TC-07 (Zero-Tolerance Tamper Alarm):</b> Passed. A single altered bit immediately trips the AES-GCM tag mismatch alarm.
            • <b>TC-08 (Section 63 BSA Certificate):</b> Passed. Valid digital certificate generated with QR audit seal."
            """
        },
        {
            "num": 12,
            "title": "Results: Multi-Role Login & Officer Ingestion",
            "speaker": "Speaker 2 (Krishna Rishik)",
            "cue": "[Transition to Slide 12. Point to the UI screenshots of Login modal and Pre-flight Ingestion screen.]",
            "content": """
            "Moving to our live results!
            <br/><br/>
            <b>On the left:</b> You see our multi-role authentication modal. Officers, Verifiers, and Auditors authenticate with their dedicated credentials and 2FA TOTP code. Notice our Developer Diagnostics panel confirming zero-trust policies are active.
            <br/><br/>
            <b>On the right:</b> This is the Officer Workspace. When an officer selects an FIR or evidence file, the browser instantly computes the SHA-256 checksum in RAM before transmitting the file. This creates an unshakeable evidentiary baseline from second zero."
            """
        },
        {
            "num": 13,
            "title": "Results: Encrypted Vault & Gemini AI Legal Studio",
            "speaker": "Speaker 1 (Deekshith)",
            "cue": "[Transition to Slide 13. Highlight the encrypted files table on the left and the AI extraction studio on the right.]",
            "content": """
            "Slide 13 shows our live evidence repository and AI legal intelligence studio.
            <br/><br/>
            <b>On the left:</b> All stored files are displayed with their unchangeable SHA-256 fingerprints, encryption status badges, and direct links to certificates.
            <br/><br/>
            <b>On the right:</b> This is our Gemini Legal AI &amp; Privacy Redaction Studio. In this sample FIR from Indiranagar Cyber Crime PS, the AI automatically classified the offense under both BNS 2023 Sec 303(2) and IPC Sec 379, extracted accused 'Vikramaditya S', identified seized hardware (Apple MacBook Pro and SanDisk flash drives), and masked sensitive identity data—with an overall AI confidence score of 95.8%."
            """
        },
        {
            "num": 14,
            "title": "Results: Forensic Verifier & Courtroom Merkle Ledger",
            "speaker": "Speaker 2 (Krishna Rishik)",
            "cue": "[Transition to Slide 14. Point to the Dual-Custody queue and the Merkle block explorer.]",
            "content": """
            "Here on Slide 14, we demonstrate our two strongest compliance innovations.
            <br/><br/>
            <b>On the left (Forensic Desk):</b> Shows the Dual-Custody queue. Documents submitted by officers wait here for independent lab examination. Only when the forensic verifier verifies the bit-level hash does the file receive its permanent digital seal.
            <br/><br/>
            <b>On the right (Courtroom Merkle Ledger):</b> You see the actual cryptographic audit trail. Each entry—from upload to verification to certificate export—is hashed with the previous block's digest, creating an unbroken chain anchored to Genesis Block 0."
            """
        },
        {
            "num": 15,
            "title": "Results: Zero-Tolerance Tamper Alarm & BSA Certificate",
            "speaker": "Speaker 1 (Deekshith)",
            "cue": "[Transition to Slide 15. Emphasize the red Tamper Alarm on the left and the green Authentic Certificate on the right.]",
            "content": """
            "Slide 15 proves the mathematical integrity of our platform.
            <br/><br/>
            <b>On the left (Tamper Demonstration):</b> We simulated an attacker secretly modifying a single character inside Block #1 in the database. The moment the courtroom auditor clicks 'Verify Chain Integrity', the system instantly calculates the hash mismatch, throws a bright red <b>'TAMPER ALARM'</b>, and marks the record legally inadmissible!
            <br/><br/>
            <b>On the right (Section 63 Certificate):</b> Shows our statutory court verification desk. When a judge enters Certificate Reference <code>BSA-63-1789336556739-E87ABC36</code>, the ledger confirms 100% chain-of-custody integrity with authorized signatory, device parameters, and QR audit seal."
            """
        },
        {
            "num": 16,
            "title": "Results: Admin Governance & Automated UAT Test Desk",
            "speaker": "Speaker 2 (Krishna Rishik)",
            "cue": "[Transition to Slide 16. Point to the Key Enclave on the left and the interactive green test matrix on the right.]",
            "content": """
            "On Slide 16, we present our governance and administrative capabilities.
            <br/><br/>
            <b>On the left:</b> The System Governance Console allows the Administrator to monitor encryption engines, active user sessions, Speakeasy TOTP health, and master cryptographic keys. It supports zero-downtime key rotation where data encryption keys are wrapped under new master keys without requiring re-encryption of raw files.
            <br/><br/>
            <b>On the right:</b> Our built-in Interactive UAT Test Desk. Evaluators can click 'Execute Live UAT Suite' right inside the application to run all 8 compliance scenarios live in milliseconds, confirming 100% pass rates."
            """
        },
        {
            "num": 17,
            "title": "Conclusion & Future Enhancements",
            "speaker": "Speaker 1 (Deekshith)",
            "cue": "[Transition to Slide 17. Summarize achievements and outline forward-looking research avenues.]",
            "content": """
            "To conclude our presentation:
            <br/><br/>
            <b>Key Accomplishments:</b>
            1. <b>End-to-End Data Confidentiality:</b> Balanced immediate search accessibility with enterprise zero-trust encryption and automated PII protection.
            2. <b>Streamlined Legal Intelligence:</b> Cut document discovery time from hours to seconds using semantic vector search and entity graphs.
            3. <b>Courtroom Auditability:</b> Full statutory compliance with Section 63 BSA 2023 through Merkle-chained immutability.
            <br/><br/>
            <b>Future Enhancements:</b>
            Looking ahead, we aim to implement:
            • <b>Fully Homomorphic Encryption (FHE)</b> to run semantic queries directly over ciphertext without decrypting in RAM.
            • <b>Differential Privacy</b> for fine-grained automated redaction.
            • <b>Autonomous Agentic Synthesis</b> to reconcile complex cross-case discrepancies across multi-volume binders.
            • <b>Decentralized Blockchain Nodes</b> for multi-state inter-agency federation."
            """
        },
        {
            "num": 18,
            "title": "References & Legal Authorities",
            "speaker": "Speaker 2 (Krishna Rishik)",
            "cue": "[Transition to Slide 18. Deliver closing appreciation and invite questions.]",
            "content": """
            "Slide 18 lists our foundational institutional and statutory benchmarks:
            <br/><br/>
            1. <b>CCTNS (Crime and Criminal Tracking Network &amp; Systems):</b> India's nationwide police digitization benchmark under NCRB.
            <br/>
            2. <b>Section 63 of Bharatiya Sakshya Adhiniyam, 2023 &amp; Section 65B of Indian Evidence Act:</b> The statutory legal framework defining the admissibility of electronic records.
            <br/>
            3. <b>HMCTS Common Platform (UK Ministry of Justice):</b> Precedent for RBAC and dual-tier account verification.
            <br/>
            4. <b>FBI National Data Exchange (N-DEx, USA):</b> Architectural reference for criminal link-analysis and non-adjudicating intelligence search.
            <br/><br/>
            We express our deepest gratitude to our project guide <b>Dr. Sesham Anand Sir</b>, our Head of Department, and the faculty of CSE Allied Branches for their invaluable guidance.
            <br/><br/>
            We now invite the honourable panel to ask any questions or request a live demonstration. Thank you very much!"
            """
        }
    ]

    for slide in slides:
        slide_title = f"Slide {slide['num']}: {slide['title']}"
        story.append(Paragraph(slide_title, slide_heading_style))
        story.append(Paragraph(f"<b>Speaker:</b> {slide['speaker']}", badge_style))
        story.append(Paragraph(f"<b>Visual Cue:</b> {slide['cue']}", cue_style))
        story.append(Spacer(1, 4))
        
        # Speech card
        content_table = Table([[Paragraph(slide['content'].strip(), speech_style)]], colWidths=[letter[0]-108])
        content_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
            ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor("#e2e8f0")),
            ('LINELEFT', (0,0), (0,-1), 3, colors.HexColor("#0284c7")),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ]))
        story.append(content_table)
        story.append(Spacer(1, 10))

    # Page Break for Viva Voce Q&A Defense Section
    story.append(PageBreak())
    story.append(Paragraph("EXAMINER DEFENSE: Anticipated Viva Voce Q&amp;A", title_style))
    story.append(Paragraph("Comprehensive technical answers to the most probable questions examiners will ask during your evaluation.", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=14))

    qa_list = [
        (
            "Q1. Why do you specifically cite Section 63 of Bharatiya Sakshya Adhiniyam, 2023 instead of Section 65B of the Indian Evidence Act?",
            "<b>Answer:</b> On July 1, 2024, the Government of India enacted three new criminal laws: the Bharatiya Nyaya Sanhita (BNS), Bharatiya Nagarik Suraksha Sanhita (BNSS), and Bharatiya Sakshya Adhiniyam (BSA). The BSA completely replaced the colonial Indian Evidence Act, 1872. Specifically, Section 63 of the BSA replaces Section 65B, defining the strict modern legal requirements for electronic records, device custody, and cryptographic certificates to be deemed admissible in court. Our project was built ground-up to comply with this current law."
        ),
        (
            "Q2. What is Envelope Encryption, and why not just encrypt the file directly with a single Master Key?",
            "<b>Answer:</b> Direct encryption with a single master key suffers from two critical security flaws: first, if the master key is compromised, all historical files are exposed; second, decrypting massive multi-gigabyte forensic files requires frequent API calls to cloud HSM/KMS services, incurring heavy latency and cost. With <i>Envelope Encryption</i>, we generate an ephemeral 256-bit Data Encryption Key (DEK) for each individual document. The file is encrypted locally using AES-256-GCM. The DEK itself is then encrypted (wrapped) by the Master Key (KEK). When rotating keys, only the tiny 32-byte DEKs are re-wrapped, without touching gigabytes of ciphertext."
        ),
        (
            "Q3. How does your Merkle Hash Ledger detect tampering?",
            "<b>Answer:</b> Each block in our ledger contains: (1) Block Sequence Number, (2) Timestamp, (3) Operator ID & Action, (4) Document SHA-256 Hash, and (5) <i>Previous Block Hash</i>. All these values are hashed together to produce the Current Block Hash: <code>H_current = SHA256(Seq + Time + Action + DocHash + H_previous)</code>. If an attacker alters even one bit in Block #1, its hash changes. Consequently, Block #2's <code>PreviousHash</code> will no longer match Block #1's recalculated hash, causing an immediate cascade failure across the entire chain."
        ),
        (
            "Q4. Why do you calculate the SHA-256 hash in browser RAM using WebCrypto before upload?",
            "<b>Answer:</b> This prevents 'Man-in-the-Middle' tampering and ingestion repudiation. If hashing were only done after uploading to the server, a corrupt network proxy or compromised API could alter the file en route, and the server would calculate a hash for the corrupt file. By computing the hash directly in client browser RAM via <code>crypto.subtle.digest('SHA-256')</code>, the officer creates a binding pre-flight fingerprint that the backend must match bit-for-bit upon arrival."
        ),
        (
            "Q5. How does Dual-Custody Verification work in your system?",
            "<b>Answer:</b> In legal forensics, the principle of 'Separation of Duties' prevents rogue actions. In our RBAC model, an Investigating Officer can upload evidence but has zero permission to certify it. A Forensic Verifier has clearance to inspect documents and verify hashes, but cannot create cases. Only when the independent verifier confirms the recalculation does the record receive the forensic seal. Neither party can act unilaterally."
        ),
        (
            "Q6. How does Vector Semantic Search work with pgvector?",
            "<b>Answer:</b> When a legal document is processed, our NLP transformer model converts text into dense 384-dimensional mathematical vectors that capture semantic meaning. We store these vectors in PostgreSQL using the <code>pgvector</code> extension. When an investigator searches for 'financial extortion', the system doesn't just do keyword matching; it calculates the Cosine Distance between the query vector and document vectors, finding semantically related FIRs citing 'IPC 384' or 'money coercion' even if the exact keyword never appears."
        ),
        (
            "Q7. How do you handle PII (Personally Identifiable Information) masking?",
            "<b>Answer:</b> During AI ingestion, our legal vision engine identifies sensitive personal data like 12-digit Aadhaar numbers, PAN cards, bank account details, and personal phone numbers using regular expressions and Named Entity Recognition (NER). It replaces them with masked tokens (e.g., <code>[AADHAAR_MASKED_XXXX]</code>) in the public view while retaining the raw cryptographically sealed file in the encrypted vault for judges."
        ),
        (
            "Q8. Where is your application hosted and how can the examiners access it?",
            "<b>Answer:</b> Our frontend is deployed on Cloudflare Workers edge network at <code>https://secure-ai-docs.ginnadeekshith7.workers.dev/</code> and on Render CDN at <code>https://secure-ai-docs-frontend.onrender.com/</code>. Our backend REST API is hosted on Render at <code>https://secure-ai-docs.onrender.com/api/v1/health</code>. The examiners can test the live interactive UI right now on their phones or laptops with zero installation."
        )
    ]

    for q, a in qa_list:
        qa_card = Table([[
            Paragraph(q, qa_q_style),
        ], [
            Paragraph(a, qa_a_style)
        ]], colWidths=[letter[0]-108])
        qa_card.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
            ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor("#cbd5e1")),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ]))
        story.append(qa_card)
        story.append(Spacer(1, 8))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated presentation script PDF: {filename}")

if __name__ == '__main__':
    out_path = sys.argv[1] if len(sys.argv) > 1 else "Secure_AI_Docs_Presentation_Script.pdf"
    build_pdf(out_path)
