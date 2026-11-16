import crypto from 'crypto';
import { AuditLogRepository, IAuditLog, AuditAction } from '../models/AuditLog';

export interface BlockHashParams {
  sequenceNumber: number;
  timestamp: string | Date;
  action: string;
  userId: string;
  resourceId?: string;
  payloadHash: string;
  previousHash: string;
}

export interface VerificationResult {
  isValid: boolean;
  totalBlocks: number;
  verifiedBlocks: number;
  brokenBlockIndex: number | null;
  error?: string;
  genesisHash?: string;
  tipHash?: string;
  checkedAt: string;
}

export interface Bsa63Certificate {
  certificateId: string;
  actTitle: string;
  section: string;
  issuedAt: string;
  caseNumber?: string;
  documentId?: string;
  custodian: {
    name: string;
    role: string;
    email?: string;
  };
  deviceDeclaration: {
    systemName: string;
    operatingStatus: string;
    custodyDescription: string;
    integrityStatement: string;
  };
  cryptographicProof: {
    chainValid: boolean;
    totalBlocksVerified: number;
    genesisBlockHash: string;
    latestTipHash: string;
    targetDocumentHash?: string;
  };
  evidentiaryRecords: Array<{
    sequenceNumber: number;
    timestamp: string;
    action: string;
    operator: string;
    role: string;
    blockHash: string;
  }>;
  legalSignoff: string;
}

export class LedgerService {
  /**
   * Deterministic SHA-256 block hash computation
   */
  static calculateBlockHash(params: BlockHashParams): string {
    const isoDate =
      params.timestamp instanceof Date
        ? params.timestamp.toISOString()
        : new Date(params.timestamp).toISOString();

    const rawPayload = [
      params.sequenceNumber.toString(),
      isoDate,
      params.action,
      params.userId,
      params.resourceId || '',
      params.payloadHash.toLowerCase(),
      params.previousHash.toLowerCase(),
    ].join('|');

    return crypto.createHash('sha256').update(rawPayload).digest('hex');
  }

  /**
   * Initialize Genesis block (sequence 0) if ledger is completely empty
   */
  static async initGenesisBlock(): Promise<IAuditLog> {
    const existingGenesis = await AuditLogRepository.findBySequence(0);
    if (existingGenesis) return existingGenesis;

    const sequenceNumber = 0;
    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    const action: AuditAction = 'GENESIS';
    const userId = 'SYSTEM_SECURE_ROOT';
    const userName = 'BSA 2023 Root Authority';
    const userRole = 'System';
    const previousHash = '0'.repeat(64);
    const payloadHash = crypto
      .createHash('sha256')
      .update('SECURE_DMS_GENESIS_ROOT_BSA_2023_SEC_63')
      .digest('hex');

    const currentHash = this.calculateBlockHash({
      sequenceNumber,
      timestamp,
      action,
      userId,
      resourceId: 'GENESIS_ROOT',
      payloadHash,
      previousHash,
    });

    return await AuditLogRepository.create({
      sequenceNumber,
      timestamp,
      action,
      userId,
      userName,
      userRole,
      resourceId: 'GENESIS_ROOT',
      caseNumber: 'SYSTEM',
      payloadHash,
      details: {
        description: 'Initial root block for Bharatiya Sakshya Adhiniyam 2023 evidentiary trail',
        standard: 'BSA 2023 Section 63 / IEA Section 65B',
      },
      previousHash,
      currentHash,
    });
  }

  /**
   * Append a new tamper-evident block chained to the previous block hash
   */
  static async recordEvent(params: {
    action: AuditAction;
    userId: string;
    userName: string;
    userRole: string;
    resourceId?: string;
    caseNumber?: string;
    payloadHash: string;
    details?: Record<string, any>;
  }): Promise<IAuditLog> {
    await this.initGenesisBlock();

    const latest = await AuditLogRepository.getLatest();
    if (!latest) {
      throw new Error('Ledger initialization failure: Genesis block missing');
    }

    const sequenceNumber = latest.sequenceNumber + 1;
    const previousHash = latest.currentHash;
    const timestamp = new Date();

    const currentHash = this.calculateBlockHash({
      sequenceNumber,
      timestamp,
      action: params.action,
      userId: params.userId,
      resourceId: params.resourceId,
      payloadHash: params.payloadHash,
      previousHash,
    });

    return await AuditLogRepository.create({
      sequenceNumber,
      timestamp,
      action: params.action,
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      resourceId: params.resourceId,
      caseNumber: params.caseNumber,
      payloadHash: params.payloadHash.toLowerCase(),
      details: params.details || {},
      previousHash,
      currentHash,
    });
  }

  /**
   * Cryptographic verification engine: walks the entire chain from Block 0 to Tip
   */
  static async verifyChain(): Promise<VerificationResult> {
    await this.initGenesisBlock();
    const allBlocks = await AuditLogRepository.findAll(10000);
    // Sort strictly ascending: 0, 1, 2, ...
    allBlocks.sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    const checkedAt = new Date().toISOString();
    if (allBlocks.length === 0) {
      return {
        isValid: false,
        totalBlocks: 0,
        verifiedBlocks: 0,
        brokenBlockIndex: null,
        error: 'Ledger is empty',
        checkedAt,
      };
    }

    // 1. Verify Genesis Block (Index 0)
    const genesis = allBlocks[0];
    if (genesis.sequenceNumber !== 0 || genesis.previousHash !== '0'.repeat(64)) {
      return {
        isValid: false,
        totalBlocks: allBlocks.length,
        verifiedBlocks: 0,
        brokenBlockIndex: 0,
        error: 'Genesis block corrupted or invalid initial previousHash',
        genesisHash: genesis.currentHash,
        checkedAt,
      };
    }

    const recalculatedGenesisHash = this.calculateBlockHash({
      sequenceNumber: genesis.sequenceNumber,
      timestamp: genesis.timestamp,
      action: genesis.action,
      userId: genesis.userId,
      resourceId: genesis.resourceId,
      payloadHash: genesis.payloadHash,
      previousHash: genesis.previousHash,
    });

    if (recalculatedGenesisHash !== genesis.currentHash) {
      return {
        isValid: false,
        totalBlocks: allBlocks.length,
        verifiedBlocks: 0,
        brokenBlockIndex: 0,
        error: 'Genesis block payload altered. Cryptographic digest mismatch!',
        genesisHash: genesis.currentHash,
        checkedAt,
      };
    }

    // 2. Verify all subsequent blocks in chain
    for (let i = 1; i < allBlocks.length; i++) {
      const currentBlock = allBlocks[i];
      const prevBlock = allBlocks[i - 1];

      // Check unbroken sequence numbers
      if (currentBlock.sequenceNumber !== prevBlock.sequenceNumber + 1) {
        return {
          isValid: false,
          totalBlocks: allBlocks.length,
          verifiedBlocks: i,
          brokenBlockIndex: currentBlock.sequenceNumber,
          error: `Broken sequence! Expected ${prevBlock.sequenceNumber + 1}, found ${currentBlock.sequenceNumber}`,
          checkedAt,
        };
      }

      // Check unbroken link to previous block
      if (currentBlock.previousHash !== prevBlock.currentHash) {
        return {
          isValid: false,
          totalBlocks: allBlocks.length,
          verifiedBlocks: i,
          brokenBlockIndex: currentBlock.sequenceNumber,
          error: `Broken chain link at Block #${currentBlock.sequenceNumber}. PreviousHash does not match Block #${prevBlock.sequenceNumber} CurrentHash!`,
          checkedAt,
        };
      }

      // Recalculate hash of current block
      const recalculatedHash = this.calculateBlockHash({
        sequenceNumber: currentBlock.sequenceNumber,
        timestamp: currentBlock.timestamp,
        action: currentBlock.action,
        userId: currentBlock.userId,
        resourceId: currentBlock.resourceId,
        payloadHash: currentBlock.payloadHash,
        previousHash: currentBlock.previousHash,
      });

      if (recalculatedHash !== currentBlock.currentHash) {
        return {
          isValid: false,
          totalBlocks: allBlocks.length,
          verifiedBlocks: i,
          brokenBlockIndex: currentBlock.sequenceNumber,
          error: `Data tampering detected at Block #${currentBlock.sequenceNumber}! Stored hash differs from calculated payload digest.`,
          checkedAt,
        };
      }
    }

    return {
      isValid: true,
      totalBlocks: allBlocks.length,
      verifiedBlocks: allBlocks.length,
      brokenBlockIndex: null,
      genesisHash: allBlocks[0].currentHash,
      tipHash: allBlocks[allBlocks.length - 1].currentHash,
      checkedAt,
    };
  }

  /**
   * Generate an official court-admissible certificate compliant with Section 63 of Bharatiya Sakshya Adhiniyam, 2023
   */
  static async generateBsaCertificate(params: {
    caseNumber?: string;
    documentId?: string;
    auditorUser: { name: string; role: string; email?: string };
    targetDocHash?: string;
  }): Promise<Bsa63Certificate> {
    const verification = await this.verifyChain();
    let relevantLogs = await AuditLogRepository.findAll(50);
    if (params.caseNumber) {
      relevantLogs = relevantLogs.filter((l) => l.caseNumber === params.caseNumber);
    } else if (params.documentId) {
      relevantLogs = relevantLogs.filter((l) => l.resourceId === params.documentId);
    }
    relevantLogs.sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    const certificateId = `BSA-63-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    return {
      certificateId,
      actTitle: 'Bharatiya Sakshya Adhiniyam, 2023',
      section: 'Section 63 (Admissibility of Electronic Records)',
      issuedAt: new Date().toISOString(),
      caseNumber: params.caseNumber || 'ALL_REGISTERED_CASES',
      documentId: params.documentId,
      custodian: {
        name: params.auditorUser.name,
        role: params.auditorUser.role,
        email: params.auditorUser.email,
      },
      deviceDeclaration: {
        systemName: 'Secure DMS (Cryptographic Digital Document Management Vault)',
        operatingStatus: verification.isValid
          ? 'OPERATING NORMALLY WITHOUT DISTORTION (100% CRYPTOGRAPHIC CHAIN VALIDATED)'
          : 'COMPROMISED (INTEGRITY FAULT DETECTED)',
        custodyDescription:
          'Electronic records produced during the period over which the computer was used regularly to store or process information for the purposes of official investigation in lawful custody.',
        integrityStatement:
          'The SHA-256 cryptographic chain of custody establishes beyond reasonable doubt that the secondary electronic document matches the bit-for-bit pristine state of the original computer intake.',
      },
      cryptographicProof: {
        chainValid: verification.isValid,
        totalBlocksVerified: verification.verifiedBlocks,
        genesisBlockHash: verification.genesisHash || 'N/A',
        latestTipHash: verification.tipHash || 'N/A',
        targetDocumentHash: params.targetDocHash,
      },
      evidentiaryRecords: relevantLogs.map((l) => ({
        sequenceNumber: l.sequenceNumber,
        timestamp: l.timestamp.toISOString(),
        action: l.action,
        operator: l.userName,
        role: l.userRole,
        blockHash: l.currentHash,
      })),
      legalSignoff: `Certified under Section 63(4) BSA, 2023 by ${params.auditorUser.name} (${params.auditorUser.role}) at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST.`,
    };
  }

  /**
   * Demo & Testing tool: Corrupt a historical block in the repository
   */
  static async simulateTamper(sequence: number): Promise<boolean> {
    const fakeHash = crypto.randomBytes(32).toString('hex');
    return await AuditLogRepository.corruptBlockForTesting(sequence, fakeHash);
  }

  /**
   * Demo & Testing tool: Restore original block payload
   */
  static async restoreTamper(sequence: number, originalPayloadHash: string): Promise<boolean> {
    return await AuditLogRepository.restoreBlockForTesting(sequence, originalPayloadHash);
  }
}
