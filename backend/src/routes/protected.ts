import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { KmsService } from '../services/kms';

const router = Router();

// Test Officer Route
router.get(
  '/officer-zone',
  requireAuth,
  requireRole(['Officer', 'Admin']),
  (req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({
      message: `Welcome Officer ${req.user?.name}. You have clearance to upload and register legal evidence.`,
      role: req.user?.role,
      accessGranted: true,
    });
  }
);

// Test Verifier Route
router.get(
  '/verifier-zone',
  requireAuth,
  requireRole(['Verifier', 'Admin']),
  (req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({
      message: `Welcome Verifier ${req.user?.name}. You have clearance to review case evidence and verify AI extractions.`,
      role: req.user?.role,
      accessGranted: true,
    });
  }
);

// Test Auditor Route
router.get(
  '/auditor-zone',
  requireAuth,
  requireRole(['Auditor', 'Admin']),
  (req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({
      message: `Welcome Auditor ${req.user?.name}. You have clearance to inspect the SHA-256 chained audit ledger and export BSA Section 63 certificates.`,
      role: req.user?.role,
      accessGranted: true,
    });
  }
);

// Test Admin Route
router.get(
  '/admin-zone',
  requireAuth,
  requireRole(['Admin']),
  (req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({
      message: `Welcome Admin ${req.user?.name}. Full system governance granted.`,
      role: req.user?.role,
      accessGranted: true,
    });
  }
);

// KMS Master Key Diagnostics & Envelope Encryption Verification
router.get(
  '/kms-status',
  requireAuth,
  requireRole(['Admin', 'Auditor']),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const diagnostics = await KmsService.getDiagnostics();
      res.status(200).json({
        success: true,
        kms: diagnostics,
        compliance: 'AWS KMS Managed Cryptographic Baseline (Software-backed CMK, not CloudHSM)',
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to query KMS diagnostics', details: e.message });
    }
  }
);

router.post(
  '/kms-test-envelope',
  requireAuth,
  requireRole(['Admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sampleText = req.body.plaintext || 'CONFIDENTIAL EVIDENTIARY RECORD - SECTION 63 BSA 2023';
      const envelope = await KmsService.encryptEnvelope(sampleText, {
        operator: req.user?.name || 'Administrator',
        purpose: 'Envelope Encryption Verification',
      });
      const decrypted = await KmsService.decryptEnvelope(envelope, {
        operator: req.user?.name || 'Administrator',
        purpose: 'Envelope Encryption Verification',
      });

      res.status(200).json({
        success: true,
        masterKeyId: envelope.keyId,
        algorithm: envelope.algorithm,
        envelope: {
          iv: envelope.iv,
          authTag: envelope.authTag,
          ciphertextSnippet: envelope.ciphertext.substring(0, 32) + '...',
          encryptedDataKeySnippet: envelope.encryptedDataKey.substring(0, 32) + '...',
        },
        decryptedMatchesOriginal: decrypted === sampleText,
      });
    } catch (e: any) {
      res.status(500).json({ error: 'KMS test envelope operation failed', details: e.message });
    }
  }
);

export default router;
