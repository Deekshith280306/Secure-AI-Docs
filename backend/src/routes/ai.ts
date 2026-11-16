import { Router, Response } from 'express';
import crypto from 'crypto';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { DocumentRepository } from '../models/Document';
import { GeminiService } from '../services/gemini';
import { StorageService } from '../services/storage';
import { LedgerService } from '../services/ledger';

const router = Router();

/**
 * GET /api/ai/status
 * Check if live Gemini API is configured and operational.
 */
router.get('/status', (_req, res: Response) => {
  const isLive = GeminiService.isApiKeyConfigured();
  res.json({
    status: 'online',
    isLive,
    engine: isLive
      ? 'Gemini 2.5 Flash (Google Cloud AI)'
      : 'Built-in Legal Rule Engine (Offline Forensic Standard)',
    capabilities: [
      'Multi-modal Document & Image OCR',
      'Indian Legal Structure Extraction (FIR / BNS 2023 / IPC)',
      'Aadhaar / Mobile / PAN Privacy Redaction',
      'Semantic Case & Evidence Search',
      'Cryptographically Chained Audit Logging (BSA 2023 § 63)',
    ],
  });
});

/**
 * POST /api/ai/analyze/:id
 * Trigger Gemini AI / OCR extraction on an existing document in the vault.
 */
router.post(
  '/analyze/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const docId = String(req.params.id);
      const doc = await DocumentRepository.findById(docId);

      if (!doc) {
        res.status(404).json({ error: 'Document not found in evidence vault.' });
        return;
      }

      // Read file buffer from storage vault if available
      let fileBuffer: Buffer | undefined;
      try {
        const buf = await StorageService.getFileBuffer(doc.storageKey);
        if (buf) fileBuffer = buf;
      } catch (err) {
        console.warn(`[AI Route] Could not read file buffer for ${doc.storageKey}:`, err);
      }

      // Run AI / OCR Extraction
      const extraction = await GeminiService.analyzeDocument(doc, fileBuffer);

      // Run PII Redaction on extracted text
      const redactionResult = GeminiService.redactPii(extraction.ocrText);

      // Calculate SHA-256 payload hash of the AI output for legal proof
      const aiPayloadString = JSON.stringify({
        docHash: doc.fileHash,
        extractedData: extraction.extractedData,
        redactionsCount: redactionResult.redactions.length,
        modelUsed: extraction.modelUsed,
      });
      const aiPayloadHash = crypto.createHash('sha256').update(aiPayloadString).digest('hex');

      // Update document record with AI findings
      const updatedDoc = await DocumentRepository.update(doc.id, {
        extractedData: extraction.extractedData,
        ocrText: extraction.ocrText,
        redactedText: redactionResult.sanitizedText,
        piiRedactions: redactionResult.redactions,
        aiProcessedAt: new Date(),
        aiModelUsed: extraction.modelUsed,
      });

      // Chain the AI extraction event into the immutable SHA-256 ledger
      const auditEntry = await LedgerService.recordEvent({
        action: 'AI_METADATA_EXTRACTED',
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        resourceId: doc.id,
        caseNumber: doc.caseNumber,
        payloadHash: aiPayloadHash,
        details: {
          caseNumber: doc.caseNumber,
          title: doc.title,
          documentType: extraction.extractedData.documentType,
          firNumber: extraction.extractedData.firNumber,
          actsAndSections: extraction.extractedData.actsAndSections,
          accusedPersons: extraction.extractedData.accusedPersons,
          piiRedactedItems: redactionResult.redactions.length,
          modelUsed: extraction.modelUsed,
          confidenceScore: extraction.extractedData.confidenceScore,
        },
      });

      res.status(200).json({
        message: 'Legal document successfully processed by AI extraction engine.',
        document: updatedDoc,
        auditBlock: {
          sequenceNumber: auditEntry.sequenceNumber,
          currentHash: auditEntry.currentHash,
          previousHash: auditEntry.previousHash,
          action: auditEntry.action,
          timestamp: auditEntry.timestamp,
        },
      });
    } catch (err: any) {
      console.error('[AI Route Error]:', err);
      res.status(500).json({ error: err.message || 'Internal AI processing error' });
    }
  }
);

/**
 * POST /api/ai/redact/:id
 * Generate / refresh PII redaction on document text.
 */
router.post(
  '/redact/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const docId = String(req.params.id);
      const doc = await DocumentRepository.findById(docId);
      if (!doc) {
        res.status(404).json({ error: 'Document not found.' });
        return;
      }

      const textToRedact = req.body.text || doc.ocrText || doc.title;
      const result = GeminiService.redactPii(textToRedact);

      // Save updated redactions
      const updatedDoc = await DocumentRepository.update(doc.id, {
        redactedText: result.sanitizedText,
        piiRedactions: result.redactions,
      });

      // Log redaction event in ledger
      const redactionHash = crypto.createHash('sha256').update(result.sanitizedText).digest('hex');
      const auditEntry = await LedgerService.recordEvent({
        action: 'AI_PII_REDACTED',
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        resourceId: doc.id,
        caseNumber: doc.caseNumber,
        payloadHash: redactionHash,
        details: {
          redactionsCount: result.redactions.length,
          categories: result.redactions.map((r) => r.type),
        },
      });

      res.json({
        message: 'PII Redaction applied successfully.',
        sanitizedText: result.sanitizedText,
        redactions: result.redactions,
        document: updatedDoc,
        auditBlock: {
          sequenceNumber: auditEntry.sequenceNumber,
          currentHash: auditEntry.currentHash,
          previousHash: auditEntry.previousHash,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Redaction failed' });
    }
  }
);

/**
 * POST /api/ai/search
 * Natural Language / Semantic Case Search across evidence vault
 */
router.post(
  '/search',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== 'string' || query.trim() === '') {
        res.status(400).json({ error: 'Search query is required.' });
        return;
      }

      const allDocs = await DocumentRepository.findAll();
      const searchResults = GeminiService.searchDocuments(query, allDocs);

      res.json({
        query: query.trim(),
        totalMatches: searchResults.length,
        results: searchResults,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Search failed' });
    }
  }
);

export default router;
