import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';

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

export default router;
