import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { CourtCertificateModal, Bsa63CertificateData } from './CourtCertificateModal';
import {
  History,
  ShieldCheck,
  ShieldAlert,
  Scale,
  RefreshCw,
  Search,
  Link as LinkIcon,
  Clock,
  User,
  Hash,
  RotateCcw,
  CheckCircle2,
  Bug,
} from 'lucide-react';

export interface AuditBlock {
  id: string;
  sequenceNumber: number;
  timestamp: string;
  action:
    | 'GENESIS'
    | 'DOCUMENT_UPLOADED'
    | 'DOCUMENT_VERIFIED'
    | 'DOCUMENT_FLAGGED'
    | 'DOCUMENT_DOWNLOADED'
    | 'USER_LOGIN_2FA'
    | 'CERTIFICATE_EXPORTED';
  userId: string;
  userName: string;
  userRole: string;
  resourceId?: string;
  caseNumber?: string;
  payloadHash: string;
  details?: Record<string, any>;
  previousHash: string;
  currentHash: string;
}

export interface VerificationData {
  isValid: boolean;
  totalBlocks: number;
  verifiedBlocks: number;
  brokenBlockIndex: number | null;
  error?: string;
  genesisHash?: string;
  tipHash?: string;
  checkedAt: string;
}

interface AuditLedgerViewProps {
  currentCaseNumber?: string;
}

export const AuditLedgerView: React.FC<AuditLedgerViewProps> = ({ currentCaseNumber }) => {
  const [blocks, setBlocks] = useState<AuditBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [certificateData, setCertificateData] = useState<Bsa63CertificateData | null>(null);
  const [loadingCert, setLoadingCert] = useState(false);
  const [simulatingTamper, setSimulatingTamper] = useState(false);

  const fetchLedger = async () => {
    if (!localStorage.getItem('dms_auth_token')) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/audit/ledger', {
        params: currentCaseNumber ? { caseNumber: currentCaseNumber } : {},
      });
      setBlocks(res.data.blocks || []);
    } catch (err: any) {
      if (err.response?.status === 401 && !localStorage.getItem('dms_auth_token')) {
        return;
      }
      console.error('Fetch ledger error:', err);
      setError(err.response?.data?.error || 'Failed to fetch audit ledger.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyChain = async () => {
    if (!localStorage.getItem('dms_auth_token')) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    setVerifying(true);
    setError(null);
    try {
      const res = await api.get('/audit/verify-chain');
      setVerificationResult(res.data.verification);
    } catch (err: any) {
      if (err.response?.status === 401 && !localStorage.getItem('dms_auth_token')) {
        return;
      }
      console.error('Verify chain error:', err);
      setError(err.response?.data?.error || 'Verification request failed.');
    } finally {
      setVerifying(false);
    }
  };

  const handleGenerateCertificate = async () => {
    setLoadingCert(true);
    try {
      const res = await api.get('/audit/certificate', {
        params: currentCaseNumber ? { caseNumber: currentCaseNumber } : {},
      });
      setCertificateData(res.data.certificate);
      fetchLedger(); // Certificate export appends an entry to the ledger!
    } catch (err: any) {
      alert(`Certificate generation failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoadingCert(false);
    }
  };

  const handleSimulateTamper = async () => {
    if (blocks.length < 2) {
      alert('Upload at least 1 document first to generate Block #1 for tampering demonstration!');
      return;
    }

    setSimulatingTamper(true);
    try {
      await api.post('/audit/simulate-tamper', { sequenceNumber: 1 });
      await fetchLedger();
      // Immediately run chain verification to show the red alarm!
      await handleVerifyChain();
    } catch (err: any) {
      alert(`Simulate tamper failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setSimulatingTamper(false);
    }
  };

  const handleResetLedger = async () => {
    if (!confirm('Are you sure you want to reset the ledger back to pristine state with Genesis Block 0?')) {
      return;
    }
    setLoading(true);
    try {
      await api.post('/audit/reset-chain');
      setVerificationResult(null);
      await fetchLedger();
    } catch (err: any) {
      alert(`Reset failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
    handleVerifyChain();
  }, [currentCaseNumber]);

  const filteredBlocks = blocks.filter((b) => {
    const q = searchQuery.toLowerCase();
    return (
      b.action.toLowerCase().includes(q) ||
      b.userName.toLowerCase().includes(q) ||
      b.userRole.toLowerCase().includes(q) ||
      (b.caseNumber && b.caseNumber.toLowerCase().includes(q)) ||
      b.currentHash.toLowerCase().includes(q) ||
      b.previousHash.toLowerCase().includes(q)
    );
  });

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'GENESIS':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'DOCUMENT_UPLOADED':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'DOCUMENT_VERIFIED':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'DOCUMENT_FLAGGED':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'DOCUMENT_DOWNLOADED':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'USER_LOGIN_2FA':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'CERTIFICATE_EXPORTED':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-purple-600 dark:text-purple-400" /> Audit Trail & Courtroom Proof
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Every file upload, review, and download is permanently recorded in an unchangeable chain. If anyone tampers with a record, the alarm triggers immediately.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleVerifyChain}
            disabled={verifying}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-purple-600/20 active:scale-95 disabled:opacity-50"
          >
            <ShieldCheck className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
            {verifying ? 'Checking Integrity...' : 'Verify Chain Integrity'}
          </button>

          <button
            type="button"
            onClick={handleGenerateCertificate}
            disabled={loadingCert}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
          >
            <Scale className="w-4 h-4" />
            {loadingCert ? 'Generating...' : 'Download Court Certificate (Sec 63)'}
          </button>

          <button
            type="button"
            onClick={fetchLedger}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs animate-in fade-in">
          {error}
        </div>
      )}

      {/* Verification Status Banner */}
      {verificationResult && (
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-in fade-in ${
            verificationResult.isValid
              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-start gap-3">
            {verificationResult.isValid ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                {verificationResult.isValid
                  ? 'All Evidence Records Are 100% Original & Untampered'
                  : '🚨 TAMPER ALARM: Unauthorized Modification Detected!'}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                {verificationResult.isValid ? (
                  <>
                    All <strong>{verificationResult.totalBlocks} sequential records</strong> verified in unbroken order. Zero broken links found. Fully admissible in court under Section 63 BSA 2023.
                  </>
                ) : (
                  <>
                    Tampered record: <span className="font-mono text-slate-900 dark:text-white font-bold">Block #{verificationResult.brokenBlockIndex}</span>. Error: {verificationResult.error}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] self-end sm:self-auto">
            {verificationResult.isValid ? (
              <span className="px-2.5 py-1 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-bold">
                0 ALTERATIONS
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResetLedger}
                className="px-3 py-1 rounded bg-rose-100 dark:bg-rose-500/20 hover:bg-rose-200 dark:hover:bg-rose-500/30 border border-rose-300 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 font-bold flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3 h-3" /> Restore Ledger
              </button>
            )}
          </div>
        </div>
      )}

      {/* Demo Controls Bar */}
      <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-slate-700 dark:text-slate-300">
            <strong>🧪 Test the Tamper Alarm (Demo for Judges):</strong> Corrupt a database entry to see the instant detection alarm.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSimulateTamper}
            disabled={simulatingTamper}
            className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px] font-semibold transition flex items-center gap-1"
          >
            {simulatingTamper ? 'Corrupting...' : 'Simulate Database Tamper'}
          </button>
          <button
            type="button"
            onClick={handleResetLedger}
            className="px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter ledger by Action, Operator, Case FIR, or Block Hash..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:border-purple-500 transition"
        />
      </div>

      {/* Block Sequence Explorer */}
      <div className="space-y-4">
        {filteredBlocks.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            No ledger blocks matching current query.
          </div>
        ) : (
          filteredBlocks.map((block, idx) => {
            const isCorrupted =
              verificationResult &&
              !verificationResult.isValid &&
              verificationResult.brokenBlockIndex === block.sequenceNumber;

            return (
              <div key={block.id || block.sequenceNumber} className="relative">
                {/* Block Card */}
                <div
                  className={`p-4 rounded-xl border transition space-y-3 ${
                    isCorrupted
                      ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/50 shadow-lg shadow-rose-500/10'
                      : 'bg-slate-50/80 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                          block.sequenceNumber === 0
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : isCorrupted
                            ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                        }`}
                      >
                        #{block.sequenceNumber}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold border uppercase ${getActionBadgeClass(
                            block.action
                          )}`}
                        >
                          {block.action}
                        </span>
                        {block.caseNumber && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                            {block.caseNumber}
                          </span>
                        )}
                        {isCorrupted && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500 text-white font-bold animate-pulse">
                            ⚠️ CORRUPTED BLOCK
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        {block.userName} ({block.userRole})
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        {new Date(block.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Cryptographic Linkage Display */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2 bg-white dark:bg-slate-900/90 rounded-lg border border-slate-200 dark:border-slate-800/80 overflow-hidden">
                      <div className="text-slate-500 text-[10px] flex items-center gap-1">
                        <LinkIcon className="w-3 h-3" /> Previous Block Hash (Parent):
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 truncate select-all">{block.previousHash}</div>
                    </div>

                    <div
                      className={`p-2 rounded-lg border overflow-hidden ${
                        isCorrupted
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-500/40'
                          : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800/80'
                      }`}
                    >
                      <div className="text-slate-500 text-[10px] flex items-center gap-1">
                        <Hash className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Current Block SHA-256 Digest:
                      </div>
                      <div
                        className={`truncate select-all font-semibold ${
                          isCorrupted ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {block.currentHash}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Connecting Chain Line */}
                {idx < filteredBlocks.length - 1 && (
                  <div className="flex justify-center -my-1">
                    <div className="w-0.5 h-3 bg-slate-300 dark:bg-slate-700/80" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal for Section 63 BSA Certificate */}
      {certificateData && (
        <CourtCertificateModal
          certificate={certificateData}
          onClose={() => setCertificateData(null)}
        />
      )}
    </div>
  );
};
export default AuditLedgerView;
