import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { LedgerService } from '../services/ledger';
import { AuditLogRepository } from '../models/AuditLog';
import { DocumentRepository } from '../models/Document';

const router = Router();

// 1. GET AUDIT LEDGER BLOCKS
router.get(
  '/ledger',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { caseNumber, limit } = req.query;
      const maxLimit = limit ? Math.min(Number(limit), 200) : 50;

      let blocks;
      if (caseNumber && typeof caseNumber === 'string') {
        blocks = await AuditLogRepository.findByCaseNumber(caseNumber);
      } else {
        blocks = await AuditLogRepository.findAll(maxLimit);
      }

      const count = await AuditLogRepository.count();

      res.status(200).json({
        total: count,
        returned: blocks.length,
        blocks,
      });
    } catch (error: any) {
      console.error('[Audit-Ledger Error]:', error);
      res.status(500).json({ error: 'Failed to retrieve audit ledger.' });
    }
  }
);

// 2. LIVE CRYPTOGRAPHIC CHAIN VERIFICATION
router.get(
  '/verify-chain',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await LedgerService.verifyChain();
      res.status(200).json({
        verification: result,
      });
    } catch (error: any) {
      console.error('[Verify-Chain Error]:', error);
      res.status(500).json({ error: 'Failed to verify ledger integrity chain.' });
    }
  }
);

// 3. GENERATE SECTION 63 BSA COURT CERTIFICATE
router.get(
  '/certificate',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { caseNumber, documentId } = req.query;

      let targetDocHash: string | undefined;
      if (documentId && typeof documentId === 'string') {
        const doc = await DocumentRepository.findById(documentId);
        if (doc) {
          targetDocHash = doc.fileHash;
        }
      }

      const certificate = await LedgerService.generateBsaCertificate({
        caseNumber: typeof caseNumber === 'string' ? caseNumber : undefined,
        documentId: typeof documentId === 'string' ? documentId : undefined,
        auditorUser: {
          name: req.user!.name,
          role: req.user!.role,
          email: req.user!.email,
        },
        targetDocHash,
      });

      // Record this certificate export in the ledger itself!
      await LedgerService.recordEvent({
        action: 'CERTIFICATE_EXPORTED',
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        resourceId: certificate.certificateId,
        caseNumber: typeof caseNumber === 'string' ? caseNumber : 'SYSTEM',
        payloadHash: certificate.certificateId,
        details: {
          certificateId: certificate.certificateId,
          section: certificate.section,
        },
      });

      res.status(200).json({ certificate });
    } catch (error: any) {
      console.error('[Certificate-Gen Error]:', error);
      res.status(500).json({ error: 'Failed to generate Section 63 BSA certificate.' });
    }
  }
);

// 4. DEMO / SECURITY TEST: SIMULATE DATABASE TAMPER
router.post(
  '/simulate-tamper',
  requireAuth,
  requireRole(['Auditor', 'Admin']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { sequenceNumber } = req.body;
      const seq = sequenceNumber !== undefined ? Number(sequenceNumber) : 1;

      const success = await LedgerService.simulateTamper(seq);
      if (!success) {
        res.status(404).json({
          error: `Block #${seq} not found. Ensure ledger has at least ${seq + 1} blocks.`,
        });
        return;
      }

      res.status(200).json({
        message: `Tampering simulated successfully on Block #${seq}. Out-of-band data modification performed in database layer. Run verification to observe instant detection!`,
        corruptedSequence: seq,
      });
    } catch (error: any) {
      console.error('[Simulate-Tamper Error]:', error);
      res.status(500).json({ error: 'Failed to execute tamper simulation.' });
    }
  }
);

// 5. RESTORE / HEAL LEDGER
router.post(
  '/reset-chain',
  requireAuth,
  requireRole(['Auditor', 'Admin']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await AuditLogRepository.reset();
      const genesis = await LedgerService.initGenesisBlock();

      res.status(200).json({
        message: 'Audit ledger reset to pristine state with freshly initialized Genesis Block.',
        genesis,
      });
    } catch (error: any) {
      console.error('[Reset-Chain Error]:', error);
      res.status(500).json({ error: 'Failed to reset audit ledger.' });
    }
  }
);

// 6. VERIFY COURT CERTIFICATE AGAINST LEDGER
router.post(
  '/verify-certificate',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { certificateId } = req.body;
      if (!certificateId || typeof certificateId !== 'string') {
        res.status(400).json({ error: 'certificateId string is required for verification.' });
        return;
      }

      // Check current blockchain chain integrity
      const chainVerification = await LedgerService.verifyChain();

      // Find the certificate export block in the audit repository
      const allLogs = await AuditLogRepository.findAll(500);
      const certBlock = allLogs.find(
        (l) =>
          l.action === 'CERTIFICATE_EXPORTED' &&
          (l.resourceId === certificateId.trim() ||
            (l.details && l.details.certificateId === certificateId.trim()))
      );

      if (!certBlock) {
        res.status(404).json({
          valid: false,
          verified: false,
          certificateId: certificateId.trim(),
          error: 'Certificate ID not found in the cryptographic audit ledger. Potential forgery or unrecorded document.',
          chainValid: chainVerification.isValid,
        });
        return;
      }

      res.status(200).json({
        valid: true,
        verified: true,
        certificateId: certificateId.trim(),
        issuedAt: certBlock.timestamp,
        issuedBy: {
          name: certBlock.userName,
          role: certBlock.userRole,
          userId: certBlock.userId,
        },
        caseNumber: certBlock.caseNumber,
        ledgerRecord: {
          sequenceNumber: certBlock.sequenceNumber,
          blockHash: certBlock.currentHash,
          previousHash: certBlock.previousHash,
        },
        chainStatus: {
          chainValid: chainVerification.isValid,
          totalBlocksVerified: chainVerification.verifiedBlocks,
          tipHash: chainVerification.tipHash,
        },
        statement:
          chainVerification.isValid
            ? 'VERIFIED ADMISSIBLE: Certificate corresponds to an authentic, un-tampered block in the BSA 2023 Sec 63 ledger.'
            : 'TAMPER WARNING: Certificate was originally issued, but subsequent tampering has broken the cryptographic ledger chain!',
      });
    } catch (error: any) {
      console.error('[Verify-Certificate Error]:', error);
      res.status(500).json({ error: 'Failed to verify certificate.' });
    }
  }
);

export default router;
