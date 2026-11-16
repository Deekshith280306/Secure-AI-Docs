import { Router, Response, raw } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { DocumentRepository, DocumentCategory } from '../models/Document';
import { StorageService } from '../services/storage';
import { LedgerService } from '../services/ledger';
import path from 'path';

const router = Router();

// 1. REQUEST PRESIGNED UPLOAD URL
router.post(
  '/upload-url',
  requireAuth,
  requireRole(['Officer', 'Admin']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { caseNumber, title, category, fileName, fileSize, mimeType, clientHash } = req.body;

      if (!caseNumber || !fileName || !fileSize || !clientHash) {
        res.status(400).json({
          error: 'Missing required metadata: caseNumber, fileName, fileSize, clientHash are mandatory.',
        });
        return;
      }

      // Sanitize case number & filename
      const cleanCase = caseNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageKey = `cases/${cleanCase}/${Date.now()}-${cleanName}`;

      // Create draft document record in database
      const doc = await DocumentRepository.create({
        caseNumber: caseNumber.trim(),
        title: title ? title.trim() : fileName,
        category: (category as DocumentCategory) || 'First Information Report (FIR)',
        fileName,
        fileSize: Number(fileSize),
        mimeType: mimeType || 'application/octet-stream',
        fileHash: clientHash.toLowerCase(),
        storageKey,
        storageProvider: StorageService.type,
        status: 'DRAFT',
        uploadedBy: req.user!.id,
        uploaderName: req.user!.name,
        uploaderRole: req.user!.role,
      });

      // Generate direct presigned PUT URL (300s expiry)
      const presigned = await StorageService.getPresignedUploadUrl(
        storageKey,
        doc.mimeType,
        clientHash
      );

      res.status(200).json({
        message: 'Presigned upload URL generated successfully.',
        documentId: doc.id,
        storageKey,
        uploadUrl: presigned.uploadUrl,
        provider: presigned.provider,
        headers: presigned.headers,
        expiresIn: 300,
      });
    } catch (error: any) {
      console.error('[Upload-Url Error]:', error);
      res.status(500).json({ error: 'Failed to generate presigned upload URL.' });
    }
  }
);

// 2. LOCAL VAULT UPLOAD RECEIVER (For offline / local fallback)
router.put(
  '/local-upload/:storageKey(*)',
  raw({ type: '*/*', limit: '100mb' }),
  async (req: any, res: Response): Promise<void> => {
    try {
      const storageKey = req.params.storageKey;
      if (!storageKey) {
        res.status(400).json({ error: 'Missing storageKey parameter' });
        return;
      }

      const buffer: Buffer = req.body;
      if (!buffer || buffer.length === 0) {
        res.status(400).json({ error: 'Empty payload received' });
        return;
      }

      await StorageService.saveLocalFile(storageKey, buffer);
      res.status(200).json({
        success: true,
        message: 'Payload stored safely in local vault.',
        bytesReceived: buffer.length,
      });
    } catch (error: any) {
      console.error('[Local-Upload Error]:', error);
      res.status(500).json({ error: 'Failed to save local file.' });
    }
  }
);

// 3. CONFIRM UPLOAD & VALIDATE BIT-FOR-BIT HASH
router.post(
  '/confirm-upload',
  requireAuth,
  requireRole(['Officer', 'Admin']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { documentId } = req.body;
      if (!documentId) {
        res.status(400).json({ error: 'documentId is required.' });
        return;
      }

      const doc = await DocumentRepository.findById(documentId);
      if (!doc) {
        res.status(404).json({ error: 'Document record not found.' });
        return;
      }

      // Verify file presence & SHA-256 bit-for-bit integrity
      const verification = await StorageService.verifyFileHash(doc.storageKey, doc.fileHash);
      if (!verification.valid) {
        await DocumentRepository.update(doc.id, { status: 'FLAGGED' });

        // Record tamper violation event in immutable cryptographic ledger
        await LedgerService.recordEvent({
          action: 'DOCUMENT_FLAGGED',
          userId: req.user!.id,
          userName: req.user!.name,
          userRole: req.user!.role,
          resourceId: doc.id,
          caseNumber: doc.caseNumber,
          payloadHash: verification.actualHash,
          details: {
            reason: 'Tampering violation: stored file hash does not match pre-flight client hash',
            expectedHash: doc.fileHash,
            actualHash: verification.actualHash,
          },
        });

        res.status(422).json({
          error:
            'Cryptographic Integrity Violation: The uploaded file SHA-256 does not match the pre-flight client hash!',
          expectedHash: doc.fileHash,
          actualHash: verification.actualHash,
        });
        return;
      }

      // Mark as UPLOADED
      const updated = await DocumentRepository.update(doc.id, {
        status: 'UPLOADED',
      });

      // Record successful tamper-evident upload in immutable cryptographic ledger
      await LedgerService.recordEvent({
        action: 'DOCUMENT_UPLOADED',
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        resourceId: doc.id,
        caseNumber: doc.caseNumber,
        payloadHash: doc.fileHash,
        details: {
          title: doc.title,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          category: doc.category,
        },
      });

      res.status(200).json({
        message: 'Evidence upload confirmed and cryptographic integrity verified.',
        document: updated,
      });
    } catch (error: any) {
      console.error('[Confirm-Upload Error]:', error);
      res.status(500).json({ error: 'Failed to confirm document upload.' });
    }
  }
);

// 4. LIST CASE DOCUMENTS
router.get(
  '/',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { caseNumber } = req.query;
      let docs = [];

      if (caseNumber && typeof caseNumber === 'string') {
        docs = await DocumentRepository.findByCaseNumber(caseNumber);
      } else {
        docs = await DocumentRepository.findAll();
      }

      res.status(200).json({
        total: docs.length,
        documents: docs,
      });
    } catch (error: any) {
      console.error('[Get-Docs Error]:', error);
      res.status(500).json({ error: 'Failed to fetch documents.' });
    }
  }
);

// 5. GET SINGLE DOCUMENT METADATA
router.get(
  '/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const docId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const doc = await DocumentRepository.findById(docId);
      if (!doc) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }
      res.status(200).json({ document: doc });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch document' });
    }
  }
);

// 6. GET PRESIGNED DOWNLOAD URL
router.get(
  '/:id/download-url',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const docId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const doc = await DocumentRepository.findById(docId);
      if (!doc) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }

      const downloadUrl = await StorageService.getPresignedDownloadUrl(
        doc.storageKey,
        doc.fileName
      );

      // Record access / download inspection in immutable cryptographic ledger
      await LedgerService.recordEvent({
        action: 'DOCUMENT_DOWNLOADED',
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        resourceId: doc.id,
        caseNumber: doc.caseNumber,
        payloadHash: doc.fileHash,
        details: {
          fileName: doc.fileName,
          accessType: 'Presigned Download Ticket Requested',
        },
      });

      res.status(200).json({
        downloadUrl,
        fileName: doc.fileName,
        fileHash: doc.fileHash,
        mimeType: doc.mimeType,
        expiresIn: 300,
      });
    } catch (error: any) {
      console.error('[Download-Url Error]:', error);
      res.status(500).json({ error: 'Failed to generate download URL' });
    }
  }
);

// 7. LOCAL DOWNLOAD & INLINE PREVIEW STREAM RECEIVER
router.get(
  '/local-download/:storageKey(*)',
  async (req: any, res: Response): Promise<void> => {
    try {
      const storageKey = req.params.storageKey;
      const filePath = StorageService.getLocalFilePath(storageKey);

      if (!filePath) {
        res.status(404).json({ error: 'File not found in local vault' });
        return;
      }

      const fileName = path.basename(storageKey);
      const isInline = req.query.inline === 'true' || req.query.inline === '1';
      const ext = path.extname(filePath).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.txt': 'text/plain',
        '.rtf': 'application/rtf',
      };
      const contentType = mimeMap[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      if (isInline) {
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        res.sendFile(filePath);
      } else {
        res.download(filePath, fileName);
      }
    } catch (error: any) {
      console.error('[Local-Download Error]:', error);
      res.status(500).json({ error: 'Failed to stream file from local vault' });
    }
  }
);

// 8. FORENSICALLY CERTIFY EVIDENCE (Verifier & Admin Role Only)
router.post(
  '/certify/:id',
  requireAuth,
  requireRole(['Verifier', 'Admin']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const docId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const doc = await DocumentRepository.findById(docId);
      if (!doc) {
        res.status(404).json({ error: 'Document record not found in repository.' });
        return;
      }

      // Re-verify physical storage file integrity before certifying
      const verification = await StorageService.verifyFileHash(doc.storageKey, doc.fileHash);
      if (!verification.valid) {
        await DocumentRepository.update(doc.id, { status: 'FLAGGED' });
        await LedgerService.recordEvent({
          action: 'DOCUMENT_FLAGGED',
          userId: req.user!.id,
          userName: req.user!.name,
          userRole: req.user!.role,
          resourceId: doc.id,
          caseNumber: doc.caseNumber,
          payloadHash: verification.actualHash,
          details: {
            reason: 'Forensic certification rejected: stored file hash does not match initial checksum',
            expectedHash: doc.fileHash,
            actualHash: verification.actualHash,
          },
        });
        res.status(422).json({
          error: 'Forensic Certification Failed: Physical storage file integrity violation detected!',
          expectedHash: doc.fileHash,
          actualHash: verification.actualHash,
        });
        return;
      }

      // Transition status to VERIFIED
      const updated = await DocumentRepository.update(doc.id, {
        status: 'VERIFIED',
      });

      // Record DOCUMENT_VERIFIED in immutable ledger
      const block = await LedgerService.recordEvent({
        action: 'DOCUMENT_VERIFIED',
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        resourceId: doc.id,
        caseNumber: doc.caseNumber,
        payloadHash: doc.fileHash,
        details: {
          title: doc.title,
          fileName: doc.fileName,
          verifierNotes: req.body.notes || 'Bit-for-bit cryptographic checksum verified by Forensic Lab',
          certifiedAt: new Date().toISOString(),
          category: doc.category,
        },
      });

      res.status(200).json({
        message: 'Evidence forensically certified and sealed with cryptographic integrity.',
        document: updated,
        ledgerBlock: {
          sequenceNumber: block.sequenceNumber,
          currentHash: block.currentHash,
          timestamp: block.timestamp,
        },
      });
    } catch (error: any) {
      console.error('[Certify-Doc Error]:', error);
      res.status(500).json({ error: 'Failed to certify evidence document.' });
    }
  }
);

// 9. DELETE / DISPOSE CASE EVIDENCE (Officer & Admin Role Only)
router.delete(
  '/:id',
  requireAuth,
  requireRole(['Officer', 'Admin']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const docId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const doc = await DocumentRepository.findById(docId);
      if (!doc) {
        res.status(404).json({ error: 'Document not found in repository.' });
        return;
      }

      // 1. Delete physical file from storage vault
      await StorageService.deleteFile(doc.storageKey);

      // 2. Remove document record from database / repository
      await DocumentRepository.delete(doc.id);

      // 3. Record legal disposal / deletion in immutable cryptographic ledger
      const block = await LedgerService.recordEvent({
        action: 'DOCUMENT_DELETED',
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        resourceId: doc.id,
        caseNumber: doc.caseNumber,
        payloadHash: doc.fileHash,
        details: {
          title: doc.title,
          fileName: doc.fileName,
          reason: req.body?.reason || 'Investigative case file purged by authorized officer',
          deletedAt: new Date().toISOString(),
        },
      });

      res.status(200).json({
        success: true,
        message: `Case document "${doc.title}" deleted from vault and recorded in audit ledger.`,
        deletedDocumentId: doc.id,
        ledgerBlock: {
          sequenceNumber: block.sequenceNumber,
          currentHash: block.currentHash,
        },
      });
    } catch (error: any) {
      console.error('[Delete-Doc Error]:', error);
      res.status(500).json({ error: 'Failed to delete case document.' });
    }
  }
);

export default router;
