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
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#475569"))
        
        # Header (Top of each page)
        self.drawString(54, letter[1] - 36, "APPENDIX - II : BPR&D RESEARCH PROPOSAL")
        self.setFont("Helvetica", 8)
        self.drawRightString(letter[0] - 54, letter[1] - 36, "MHA / BPR&D Guidelines | Secure AI Docs")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(54, letter[1] - 42, letter[0] - 54, letter[1] - 42)
        
        # Footer
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 54, 30, page_text)
        self.drawString(54, 30, "Bureau of Police Research & Development (BPR&D) — Ministry of Home Affairs, New Delhi")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(54, 40, letter[0] - 54, 40)
        
        self.restoreState()

def build_bprd_pdf(filename):
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
    header_box_style = ParagraphStyle(
        'HeaderBox',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#0f172a"),
        alignment=1
    )

    h1_style = ParagraphStyle(
        'BPRD_H1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'BPRD_H2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BPRD_Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14.5,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BPRD_Bullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=colors.HexColor("#334155"),
        leftIndent=15,
        spaceAfter=3
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=1
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#1e293b")
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0f172a")
    )

    story = []

    # Title Banner Block
    top_banner = """
    <b>APPENDIX - II</b><br/>
    <b>BPR&amp;D’S GUIDELINE FOR DRAFTING RESEARCH PROPOSAL</b><br/>
    <font size="9" color="#475569">BUREAU OF POLICE RESEARCH &amp; DEVELOPMENT — MINISTRY OF HOME AFFAIRS, GOVERNMENT OF INDIA</font>
    """
    banner_table = Table([[Paragraph(top_banner, header_box_style)]], colWidths=[letter[0]-108])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f1f5f9")),
        ('BOX', (0,0), (-1,-1), 1.25, colors.HexColor("#0284c7")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 12))

    # 1. Project Title
    story.append(Paragraph("1. The Title of Project", h1_style))
    p1 = """
    <b>Secure AI Docs:</b> An AI-Powered Secure Digital Document Management System and Cryptographic Evidence Vault for Police and Investigative Agencies, Ensuring Chain-of-Custody Admissibility under Section 63 of Bharatiya Sakshya Adhiniyam (BSA), 2023.
    """
    story.append(Paragraph(p1, body_style))
    story.append(Spacer(1, 6))

    # 2. Aim of the Project
    story.append(Paragraph("2. Aim of the Project", h1_style))
    p2 = """
    The broad aim of this investigation is to design, develop, and empirically evaluate a zero-trust, cloud-native digital evidence management platform engineered specifically for Indian police forces, state commissionerates, and central investigative agencies (CBI, NIA, ED). The platform integrates automated multimodal Optical Character Recognition (OCR), legal Named Entity Recognition (NER), semantic cross-case vector discovery (384D pgvector), and an immutable append-only SHA-256 Merkle blockchain ledger. The core thrust is to guarantee strict evidentiary non-repudiation, eliminate manual cross-FIR discovery bottlenecks, mask sensitive citizen Personally Identifiable Information (PII), and automate the issuance of statutory digital certificates required under Section 63 of the newly enacted Bharatiya Sakshya Adhiniyam (BSA), 2023.
    """
    story.append(Paragraph(p2, body_style))
    story.append(Spacer(1, 6))

    # 3. Statement of the Problem
    story.append(Paragraph("3. Statement of the Problem", h1_style))
    p3 = """
    Law enforcement agencies across India process millions of evidentiary records annually—including handwritten First Information Reports (FIRs), scene-of-crime seizure memos (Panchnamas), forensic extraction dumps (UFED/Cellebrite), ballistic reports, and CCTV surveillance logs. In the prevailing policing workflow, physical records and fragmented digital scans are stored in siloed police station archives. This operational reality presents severe systemic vulnerabilities:
    """
    story.append(Paragraph(p3, body_style))

    story.append(Paragraph("• <b>Broken Chain-of-Custody &amp; Judicial Repudiation:</b> Electronic evidence is frequently challenged or dismissed in criminal courts due to inability to establish an unbroken, tamper-evident audit trail between the point of seizure by the Investigating Officer (IO), forensic lab analysis, and courtroom presentation under Section 63 of BSA 2023 (formerly Section 65B of Indian Evidence Act, 1872).", bullet_style))
    story.append(Paragraph("• <b>Manual &amp; Siloed Cross-Case Discovery:</b> Inter-state criminal syndicates, cyber fraud networks, and economic offenders exploit jurisdictional silos. Traditional databases rely on exact keyword matches, failing to connect common suspects, phone numbers, IMEI numbers, and shell accounts across different police stations.", bullet_style))
    story.append(Paragraph("• <b>Degraded Scans &amp; High-Volume Backlogs:</b> Police station scanners produce rotated, low-contrast, degraded documents with ink-bleeds. Manual data entry causes massive backlogs and clerical errors.", bullet_style))
    story.append(Paragraph("• <b>Citizen Privacy &amp; Data Spillage:</b> Unredacted FIRs containing sensitive Aadhaar IDs, mobile numbers, and victim residential details leak into public domains during judicial filing, violating national privacy benchmarks.", bullet_style))

    p3_context = """
    <b>Theoretical Context &amp; National Relevance:</b> Located at the intersection of Forensic Computer Science, Applied Cryptography, and Criminal Jurisprudence, this research establishes a verifiable, standardized bridge between police field procedures and courtroom evidence admissibility. It directly supports the Ministry of Home Affairs' national mandate for modernized criminal justice infrastructure under the new criminal laws (BNS, BNSS, BSA 2023).
    """
    story.append(Spacer(1, 3))
    story.append(Paragraph(p3_context, body_style))
    story.append(Spacer(1, 6))

    # 4. Overview of Literature
    story.append(Paragraph("4. Overview of Literature", h1_style))
    p4 = """
    A comprehensive literature review was undertaken examining international and domestic digital evidence ecosystems:
    <br/><br/>
    <b>1. National Crime Records Bureau (NCRB) &amp; CCTNS Framework (India):</b> While the Crime and Criminal Tracking Network &amp; Systems (CCTNS) successfully digitized basic FIR registration, existing evaluations (NCRB, 2022; MHA Task Force on Police Reforms) highlight that CCTNS operates primarily as a relational data-entry warehouse. It lacks automated multimodal optical extraction, semantic vector search, client-side pre-flight cryptographic hashing, and automated Section 63 BSA certificate generation.
    <br/><br/>
    <b>2. FBI National Data Exchange (N-DEx, USA):</b> N-DEx provides investigative link-analysis across federal, state, and tribal agencies. However, literature shows its proprietary architecture is cost-prohibitive for developing jurisdictions and relies on centralized trust models rather than decentralized, tamper-evident cryptographic hash chains.
    <br/><br/>
    <b>3. HMCTS Common Platform (UK Ministry of Justice):</b> The UK HMCTS implements strict Role-Based Access Control (RBAC) and dual-tier verification between police and Crown Prosecution Services. However, its document ingestion pipeline lacks automated statutory penal code mapping and native privacy redaction for Indian statutory identifiers (Aadhaar, PAN).
    <br/><br/>
    <b>4. Applied Cryptography in Digital Forensics:</b> Academic benchmarks (Casey, 2018; Carrier, 2020) emphasize that cryptographic hashing (NIST FIPS 180-4) combined with Merkle trees (Merkle, 1987) provides mathematical immutability. However, practical field implementation has been impeded by complex key management. Envelope Encryption (NIST SP 800-57) via AWS Key Management Service (KMS) with ephemeral Data Encryption Keys (DEKs) resolves this performance-security dilemma.
    <br/><br/>
    <i>Insufficiency of Current Literature:</i> No unified open-architecture framework currently exists that integrates browser-RAM pre-flight hashing, multimodal legal OCR, BNS 2023 statutory taxonomy, and automated Section 63 BSA compliance into a zero-installation web interface.
    """
    story.append(Paragraph(p4, body_style))
    story.append(Spacer(1, 6))

    # 5. The Conceptual Framework
    story.append(Paragraph("5. The Conceptual Framework", h1_style))
    p5 = """
    The study's conceptual framework is grounded in four theoretical pillars:
    <br/><br/>
    <b>I. Zero-Trust Security Architecture (NIST SP 800-207):</b> 'Never trust, always verify.' Enforces strict granular 4-role clearances (Investigating Officer, Forensic Verifier, Court Auditor, Administrator), mandatory Speakeasy TOTP 2FA, and short-lived 15-minute cryptographically signed JWT sessions.
    <br/><br/>
    <b>II. Client-Side Pre-FlightRAM Fingerprinting:</b> Computing a file's SHA-256 digest in client browser RAM via WebCrypto API <i>before</i> network transit creates a binding baseline preventing man-in-the-middle alteration.
    <br/><br/>
    <b>III. FIPS 140-2 Level 3 Envelope Encryption:</b> Files are encrypted using AES-256-GCM with unique ephemeral Data Encryption Keys (DEKs). Plaintext DEKs reside in volatile RAM only during processing, while encrypted DEKs are wrapped under an AWS KMS Customer Master Key (KEK).
    <br/><br/>
    <b>IV. High-Dimensional Vector Embeddings (Semantic Space):</b> Transforming legal narratives into 384-dimensional dense vectors stored in PostgreSQL (<code>pgvector</code>) allows semantic discovery based on Cosine Similarity rather than rigid lexical keywords.
    """
    story.append(Paragraph(p5, body_style))
    story.append(Spacer(1, 6))

    # 6. Research Questions or Objectives or Hypotheses
    story.append(Paragraph("6. Research Questions, Objectives & Hypotheses", h1_style))
    story.append(Paragraph("<b>Primary Research Questions:</b>", h2_style))
    story.append(Paragraph("1. Can client-side pre-flight hashing coupled with an append-only Merkle ledger guarantee non-repudiation of digital evidence under Section 63 BSA 2023?", bullet_style))
    story.append(Paragraph("2. Does multimodal legal OCR with confidence scoring achieve ≥95% accuracy in parsing degraded police records and BNS penal provisions?", bullet_style))
    story.append(Paragraph("3. Does 384-dimensional semantic vector search reduce cross-case intelligence retrieval time by >80% compared to keyword-based searching?", bullet_style))

    story.append(Paragraph("<b>Specific Project Objectives:</b>", h2_style))
    story.append(Paragraph("• Objective 1: Architect and deploy an end-to-end cloud-ready evidentiary platform accessible via any browser with zero client hardware.", bullet_style))
    story.append(Paragraph("• Objective 2: Implement an automated multimodal OCR & Legal NER engine with confidence scoring and automated Aadhaar/phone PII masking.", bullet_style))
    story.append(Paragraph("• Objective 3: Engineer an immutable SHA-256 Merkle Blockchain ledger chained to Genesis Block 0 with instant 1-bit tamper detection.", bullet_style))
    story.append(Paragraph("• Objective 4: Establish a Dual-Custody forensic verification desk enforcing the legal principle of 'Separation of Duties'.", bullet_style))
    story.append(Paragraph("• Objective 5: Automate generation of official Section 63 BSA 2023 Digital Certificates with interactive QR validation seals.", bullet_style))

    story.append(Paragraph("<b>Empirical Hypotheses:</b>", h2_style))
    story.append(Paragraph("• <b>H1 (Tamper Resiliency):</b> The Merkle hash-chaining engine will detect unauthorized 1-bit database alterations with 100% sensitivity, triggering automated judicial tamper alarms.", bullet_style))
    story.append(Paragraph("• <b>H2 (Retrieval Efficiency):</b> Cosine semantic search using 384D dense embeddings will demonstrate a statistically significant increase in Mean Reciprocal Rank (MRR ≥ 0.88) compared to lexical search.", bullet_style))
    story.append(Paragraph("• <b>H3 (Evidentiary Acceptance):</b> Forensic verifiers and judicial officers will report a >90% usability and trust score under standardized SUS/TAM evaluation.", bullet_style))
    story.append(Spacer(1, 6))

    # 7. Research Methodology
    story.append(Paragraph("7. Research Methodology", h1_style))
    
    story.append(Paragraph("7.1. Coverage", h2_style))
    p71 = """
    <b>1. Universe of Study:</b> Police Commissionerates, District Cyber Crime Police Stations, State Forensic Science Laboratories (FSLs), and District &amp; Sessions Courts across Telangana, Karnataka, and Delhi NCT.
    <br/>
    <b>2. Sampling Frame:</b> An anonymized corpus of 5,000 legal and evidentiary documents spanning First Information Reports (FIRs), Seizure Panchnamas, Charge Sheets, Cellebrite/UFED forensic dumps, CCTV logs, and financial vouchers.
    <br/>
    <b>3. Sampling Procedure:</b> Stratified Purposive Sampling across 5 document categories: (a) Degraded physical scans, (b) Digital-native PDFs, (c) High-resolution mobile crime scene photos, (d) Technical forensic logs, and (e) Multimedia CCTV/Audio manifests.
    <br/>
    <b>4. Units of Observation &amp; Sample Size:</b>
    • Documents Evaluated: N = 1,000 test records.
    • Operational Personnel: N = 120 respondents (60 Investigating Officers, 30 Forensic Examiners, 20 Judicial Magistrates/Public Prosecutors, 10 System Administrators).
    """
    story.append(Paragraph(p71, body_style))

    story.append(Paragraph("7.2. Data Collection Tools &amp; Techniques", h2_style))
    p72 = """
    Data collection employs a mixed-methods design integrating automated system telemetry and structured empirical evaluation instruments:
    <br/><br/>
    • <b>Structured Questionnaire &amp; Schedule:</b>
      (i) <i>Distribution:</i> Section A: Officer Demographic &amp; Technological Literacy; Section B: Evidence Custody Integrity Assessment; Section C: AI Extraction Accuracy &amp; PII Trust; Section D: System Usability Scale (SUS) &amp; Technology Acceptance Model (TAM).<br/>
      (ii) <i>Item Count:</i> 32 structured questions per respondent.<br/>
      (iii) <i>Scaling:</i> 5-point Likert scale (1 = Strongly Disagree to 5 = Strongly Agree).<br/>
      (iv) <i>Projective Tests:</i> Simulated Blind Tamper Tests (presenting officers with corrupted vs authentic hash chains).<br/>
      (v) <i>Interview Time:</i> Approximately 25 minutes per respondent.
    <br/><br/>
    • <b>Observational &amp; Experimental Techniques:</b>
      (i) <i>Type:</i> Quasi-participant observation during simulated FIR intake and forensic verification.<br/>
      (ii) <i>Units of Observation:</i> Latency (seconds), keystroke counts, error rectification frequency.<br/>
      (iii) <i>Index Construction:</i> <b>Evidence Integrity Index (EII)</b> composite metric:
      EII = 0.40(Hash Consistency) + 0.35(Ledger Continuity) + 0.25(KMS Key Rotation Validity).
    """
    story.append(Paragraph(p72, body_style))

    story.append(Paragraph("7.3. Data Processing &amp; Analytical Framework", h2_style))
    p73 = """
    System telemetry and empirical test data will be processed via an automated Python/Pandas analytics pipeline:
    • <b>Cryptographic Verification:</b> Batch verification of SHA-256 Merkle chain linkages across 10,000 simulated block additions.
    • <b>Confusion Matrices:</b> Evaluating legal NER precision, recall, and F1-score across 15 BNS/IPC penal classifications.
    • <b>Cosine Distance Matrices:</b> Calculating nearest-neighbor clusters for cross-case semantic retrieval.
    • <b>Statistical Tests:</b> Paired t-tests comparing manual review time versus AI-assisted dual-pane review time.
    """
    story.append(Paragraph(p73, body_style))

    story.append(Paragraph("7.4. Tentative Outcomes", h2_style))
    p74 = """
    1. A fully operational, cloud-deployed digital evidence management platform (deployed on Cloudflare Workers edge &amp; Render Cloud).
    2. Zero-tolerance automated tamper alarms catching 100% of unauthorized database modifications.
    3. Automated Section 63 BSA 2023 court certificate generator with QR-code cryptographic provenance.
    4. Reduction in legal document intake and verification cycle time by >75%.
    5. Standardized procedural standard operating procedure (SOP) manual for state police digitization.
    """
    story.append(Paragraph(p74, body_style))
    story.append(Spacer(1, 6))

    # 8. Stage Wise Detailed Time Frame
    story.append(Paragraph("8. Stage Wise Detailed Time Frame (12-Month Project)", h1_style))
    
    stages_data = [
        [Paragraph("Stage / Work Package", table_header), Paragraph("Description of Milestones & Activities", table_header), Paragraph("Duration", table_header), Paragraph("Target Month", table_header)],
        [Paragraph("(i) Preparatory Work", table_cell_bold), Paragraph("Project kick-off, research staff recruitment, cloud infrastructure setup (AWS/Render/Cloudflare), and police liaison.", table_cell), Paragraph("1.5 Months", table_cell), Paragraph("Month 1 – 2", table_cell)],
        [Paragraph("(ii) Pilot Study", table_cell_bold), Paragraph("Benchmarking pilot deployment across 100 sample FIRs at designated Cyber Crime Police Station.", table_cell), Paragraph("1.5 Months", table_cell), Paragraph("Month 2 – 3", table_cell)],
        [Paragraph("(iii) Drawing of Sample", table_cell_bold), Paragraph("Curating 5,000 multi-format legal documents across participating commissionerates and FSL archives.", table_cell), Paragraph("1.0 Month", table_cell), Paragraph("Month 3 – 4", table_cell)],
        [Paragraph("(iv) Tool Construction", table_cell_bold), Paragraph("Developing and pre-testing survey schedules, automated UAT test desks, and blind tamper simulation suites.", table_cell), Paragraph("1.5 Months", table_cell), Paragraph("Month 4 – 5", table_cell)],
        [Paragraph("(v) Data Collection", table_cell_bold), Paragraph("Executing system stress tests, officer ingestion trials, verifier desk evaluations, and field questionnaires.", table_cell), Paragraph("2.5 Months", table_cell), Paragraph("Month 5 – 8", table_cell)],
        [Paragraph("(vi) Data Processing", table_cell_bold), Paragraph("Computer-assisted coding, OCR error analysis, telemetry sorting, and cryptographic ledger verification.", table_cell), Paragraph("1.5 Months", table_cell), Paragraph("Month 8 – 9", table_cell)],
        [Paragraph("(vii) Data Analysis", table_cell_bold), Paragraph("Statistical modeling (paired t-tests, ANOVA, SUS scores), precision-recall evaluation, and hypothesis testing.", table_cell), Paragraph("1.5 Months", table_cell), Paragraph("Month 9 – 11", table_cell)],
        [Paragraph("(viii) Report Writing", table_cell_bold), Paragraph("Drafting final BPR&D research monograph, police SOP guidelines, code open-sourcing, and policy brief.", table_cell), Paragraph("1.0 Month", table_cell), Paragraph("Month 11 – 12", table_cell)],
    ]
    st_table = Table(stages_data, colWidths=[100, 240, 75, 85])
    st_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(st_table)
    story.append(Spacer(1, 10))

    # 9. Organization Infrastructure Available
    story.append(Paragraph("9. Organization Infrastructure Available for Head-Wise Study", h1_style))
    p9 = """
    The study will be housed at the **Department of Computer Science and Engineering (Allied Branches)**, Matrusri Engineering College (Affiliated to Osmania University), Hyderabad, in collaboration with participating State Police Commissionerates.
    <br/><br/>
    <b>Organizational Chart &amp; Personnel Deployment:</b>
    """
    story.append(Paragraph(p9, body_style))

    org_data = [
        [Paragraph("Role / Position", table_header), Paragraph("Key Assigned Tasks", table_header), Paragraph("Required Qualifications & Training", table_header), Paragraph("Headcount", table_header)],
        [Paragraph("Project Director / PI", table_cell_bold), Paragraph("Overall project governance, architecture oversight, police liaison, legal compliance audits.", table_cell), Paragraph("Ph.D. / M.Tech in CSE / Cyber Security, 10+ yrs academic & forensic experience.", table_cell), Paragraph("1", table_cell)],
        [Paragraph("Lead Systems Architect", table_cell_bold), Paragraph("Core development: WebCrypto hashing, Merkle ledger engine, AWS KMS envelope encryption, cloud CI/CD.", table_cell), Paragraph("B.E. CSE (AI & ML), Full-stack expertise in React/TS, Node.js, and Cloud Security.", table_cell), Paragraph("1", table_cell)],
        [Paragraph("Senior ML / NLP Engineer", table_cell_bold), Paragraph("PaddleOCR/Tesseract fine-tuning, Gemini multimodal vision integration, pgvector semantic search.", table_cell), Paragraph("B.E. CSE (AI & ML), Kaggle ML Certified, expertise in Transformers & Vector DBs.", table_cell), Paragraph("1", table_cell)],
        [Paragraph("Forensic Field Investigators", table_cell_bold), Paragraph("Administering field questionnaires, executing blind tamper trials at police stations, data collection.", table_cell), Paragraph("Graduate degree in Cyber Forensics / Criminology / Law / IT.", table_cell), Paragraph("2", table_cell)],
        [Paragraph("Research Assistant / Analyst", table_cell_bold), Paragraph("Data processing, statistical analysis in Python/R, transcript preparation, report formatting.", table_cell), Paragraph("B.Tech / MCA with strong proficiency in Python, Pandas, and Statistics.", table_cell), Paragraph("1", table_cell)],
    ]
    org_table = Table(org_data, colWidths=[110, 190, 160, 40])
    org_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(org_table)
    story.append(Spacer(1, 10))

    # 10. Cost Estimation
    story.append(Paragraph("10. Cost Estimation", h1_style))
    p10_intro = """
    The total project budget is estimated based on required man-months, computational cloud resources, field travel across police commissionerates, and statutory dissemination requirements:
    """
    story.append(Paragraph(p10_intro, body_style))

    cost_personnel_data = [
        [Paragraph("Position", table_header), Paragraph("No. of Persons", table_header), Paragraph("Salary / Wages (p.m.)", table_header), Paragraph("Duration", table_header), Paragraph("Amount (INR)", table_header)],
        [Paragraph("Project Director / PI (Honorarium)", table_cell_bold), Paragraph("1", table_cell), Paragraph("₹ 35,000", table_cell), Paragraph("12 Months", table_cell), Paragraph("₹ 4,20,000", table_cell)],
        [Paragraph("Lead Systems Architect", table_cell_bold), Paragraph("1", table_cell), Paragraph("₹ 45,000", table_cell), Paragraph("12 Months", table_cell), Paragraph("₹ 5,40,000", table_cell)],
        [Paragraph("Senior ML / NLP Engineer", table_cell_bold), Paragraph("1", table_cell), Paragraph("₹ 45,000", table_cell), Paragraph("12 Months", table_cell), Paragraph("₹ 5,40,000", table_cell)],
        [Paragraph("Forensic Field Investigators", table_cell_bold), Paragraph("2", table_cell), Paragraph("₹ 25,000 each", table_cell), Paragraph("6 Months", table_cell), Paragraph("₹ 3,00,000", table_cell)],
        [Paragraph("Research Assistant / Analyst", table_cell_bold), Paragraph("1", table_cell), Paragraph("₹ 22,000", table_cell), Paragraph("8 Months", table_cell), Paragraph("₹ 1,76,000", table_cell)],
        [Paragraph("Sub-Total (i) Personnel", table_cell_bold), Paragraph("6 Persons", table_cell_bold), Paragraph("-", table_cell), Paragraph("-", table_cell), Paragraph("<b>₹ 19,76,000</b>", table_cell_bold)],
    ]
    cost_table = Table(cost_personnel_data, colWidths=[150, 70, 90, 80, 110])
    cost_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-2), [colors.white, colors.HexColor("#f8fafc")]),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(cost_table)
    story.append(Spacer(1, 8))

    budget_summary_data = [
        [Paragraph("Budget Head", table_header), Paragraph("Basis / Justification", table_header), Paragraph("Amount (INR)", table_header)],
        [Paragraph("(i) Personnel", table_cell_bold), Paragraph("Technical developers, field researchers, and project oversight (6 personnel)", table_cell), Paragraph("₹ 19,76,000", table_cell)],
        [Paragraph("(ii) Travel & Field Visits", table_cell_bold), Paragraph("On-site data collection and trials across Cyber Crime PS in Hyderabad, Bengaluru & Delhi", table_cell), Paragraph("₹ 2,40,000", table_cell)],
        [Paragraph("(iii) Data Processing & Compute", table_cell_bold), Paragraph("AWS KMS Master Keys, S3 Vault, pgvector serverless instances, Gemini Multimodal API", table_cell), Paragraph("₹ 3,20,000", table_cell)],
        [Paragraph("(iv) Stationery & Printing", table_cell_bold), Paragraph("Questionnaire printing (120 respondents), training manuals, and Section 63 BSA audit folios", table_cell), Paragraph("₹ 60,000", table_cell)],
        [Paragraph("(v) Books, Journals & Standards", table_cell_bold), Paragraph("Legal commentary on BSA 2023, ISO 27037 digital evidence standards (<= 5% limit)", table_cell), Paragraph("₹ 80,000", table_cell)],
        [Paragraph("(vi) Contingency & Postage", table_cell_bold), Paragraph("Courier of physical forensic seals, unexpected hardware peripherals, secure backups", table_cell), Paragraph("₹ 95,000", table_cell)],
        [Paragraph("(vii) Hardware & Peripherals", table_cell_bold), Paragraph("Dedicated secure test tablets (4 units) and hardware security tokens for pilot trials", table_cell), Paragraph("₹ 1,80,000", table_cell)],
        [Paragraph("<b>Sub-Total (Items 1 through 7)</b>", table_cell_bold), Paragraph("Base Direct Project Cost", table_cell_bold), Paragraph("<b>₹ 29,51,000</b>", table_cell_bold)],
        [Paragraph("(viii) Institutional Overhead Charges", table_cell_bold), Paragraph("Permissible institutional overhead capped at 5% of direct project cost", table_cell), Paragraph("₹ 1,47,550", table_cell)],
        [Paragraph("<b>GRAND TOTAL (Inclusive of all heads)</b>", table_cell_bold), Paragraph("<b>Estimated Overall Project Budget (12 Months)</b>", table_cell_bold), Paragraph("<b>₹ 30,98,550</b>", table_cell_bold)],
    ]
    bs_table = Table(budget_summary_data, colWidths=[150, 240, 110])
    bs_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0284c7")),
        ('BOX', (0,0), (-1,-1), 1.25, colors.HexColor("#0f172a")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-3), [colors.white, colors.HexColor("#f8fafc")]),
        ('BACKGROUND', (0,-3), (-1,-3), colors.HexColor("#e2e8f0")),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor("#fef3c7")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(bs_table)
    story.append(Spacer(1, 10))

    # Budget Rationale
    p10_rationale = """
    <b>Rationale for Allocation of Time and Money:</b><br/>
    The proposed budget directly maps to the rigorous 12-month timeline and multi-state investigative scope. Personnel represents 63.7% of total cost, reflecting the high-specialization requirement for full-stack cryptographic engineering, multimodal machine learning, and on-ground forensic field research. Travel and cloud infrastructure allocations ensure continuous stress-testing across diverse police environments without latency or service interruptions. Overhead charges are strictly held to the mandated 5% institutional ceiling.
    <br/><br/>
    <b>Endorsement &amp; Compliance Statement:</b><br/>
    This research proposal adheres in full to the official guidelines promulgated under Appendix-II by the Bureau of Police Research &amp; Development (BPR&amp;D), Ministry of Home Affairs, Government of India.
    """
    story.append(Paragraph(p10_rationale, body_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated BPR&D Proposal PDF: {filename}")

if __name__ == '__main__':
    out_path = sys.argv[1] if len(sys.argv) > 1 else "BPRD_Research_Proposal_Secure_AI_Docs.pdf"
    build_bprd_pdf(out_path)
