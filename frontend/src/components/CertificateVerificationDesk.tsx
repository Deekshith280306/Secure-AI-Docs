import React, { useState } from 'react';
import api from '../api/client';
import {
  Scale,
  ShieldCheck,
  ShieldAlert,
  Search,
  Hash,
  Clock,
  User,
  Award,
  RefreshCw,
} from 'lucide-react';

interface VerificationDeskResult {
  valid: boolean;
  verified: boolean;
  certificateId: string;
  issuedAt?: string;
  issuedBy?: {
    name: string;
    role: string;
    userId: string;
  };
  caseNumber?: string;
  ledgerRecord?: {
    sequenceNumber: number;
    blockHash: string;
    previousHash: string;
  };
  chainStatus?: {
    chainValid: boolean;
    totalBlocksVerified: number;
    tipHash: string;
  };
  statement?: string;
  error?: string;
}

export const CertificateVerificationDesk: React.FC = () => {
  const [certInput, setCertInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationDeskResult | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const certParam = new URLSearchParams(window.location.search).get('cert');
      if (certParam) {
        setCertInput(certParam);
        handleVerify(certParam);
      }
    }
  }, []);

  const handleVerify = async (idToVerify?: string) => {
    const id = (idToVerify || certInput).trim();
    if (!id) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await api.post('/audit/verify-certificate', { certificateId: id });
      setResult(res.data);
    } catch (err: any) {
      setResult(
        err.response?.data || {
          valid: false,
          verified: false,
          certificateId: id,
          error: 'Certificate validation failed. Record could not be retrieved.',
        }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 animate-in fade-in shadow-sm transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-900">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-600 dark:text-purple-400">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Courtroom Certificate Verification Desk
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 font-mono font-medium">
                BSA 2023 Sec 63
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Independent judicial validator for Section 63 Evidentiary Certificates against the live cryptographic blockchain ledger.
            </p>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          Statutory Admissibility: <span className="text-emerald-600 dark:text-emerald-400 font-bold">Automatic</span>
        </div>
      </div>

      {/* Input Box */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
          Enter Certificate Reference ID:
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="e.g. BSA-63-1789377808026-03C43DAB"
              value={certInput}
              onChange={(e) => setCertInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono placeholder-slate-400 focus:outline-none focus:border-purple-500 transition shadow-inner"
            />
          </div>

          <button
            type="button"
            onClick={() => handleVerify()}
            disabled={loading || !certInput.trim()}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-md shadow-purple-600/20 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>Verify</span>
          </button>
        </div>
      </div>

      {/* Verification Result Display */}
      {result && (
        <div
          className={`p-6 rounded-2xl border transition animate-in fade-in space-y-4 shadow-sm ${
            result.valid
              ? 'bg-emerald-50/70 dark:bg-emerald-500/5 border-emerald-300 dark:border-emerald-500/30'
              : 'bg-rose-50/70 dark:bg-rose-500/5 border-rose-300 dark:border-rose-500/30'
          }`}
        >
          {/* Status Banner */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              {result.valid ? (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  <ShieldAlert className="w-6 h-6" />
                </div>
              )}
              <div>
                <h4
                  className={`text-sm font-bold flex items-center gap-2 ${
                    result.valid ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {result.valid ? 'AUTHENTIC SECTION 63 CERTIFICATE' : 'CERTIFICATE INVALID / NOT RECORDED'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-mono">
                  Ref: <span className="text-slate-900 dark:text-white font-bold">{result.certificateId}</span>
                </p>
              </div>
            </div>

            <span
              className={`text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${
                result.valid
                  ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/30'
              }`}
            >
              {result.valid ? 'Court Admissible' : 'Rejected'}
            </span>
          </div>

          {/* Statement */}
          <div className="p-3 bg-white dark:bg-slate-900/90 rounded-xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans border border-slate-200 dark:border-slate-800 shadow-inner">
            {result.statement || result.error}
          </div>

          {/* Details Grid if valid */}
          {result.valid && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-mono flex items-center gap-1">
                  <User className="w-3 h-3 text-emerald-500" /> Authorized Signatory
                </div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {result.issuedBy?.name} ({result.issuedBy?.role})
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 text-purple-500" /> Export Timestamp
                </div>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  {result.issuedAt ? new Date(result.issuedAt).toLocaleString() : 'N/A'}
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-mono flex items-center gap-1">
                  <Award className="w-3 h-3 text-blue-500" /> Ledger Block
                </div>
                <div className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  Block #{result.ledgerRecord?.sequenceNumber} (Verified)
                </div>
              </div>
            </div>
          )}

          {/* Cryptographic Block Checksum */}
          {result.valid && result.ledgerRecord && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[11px] space-y-1">
              <div className="text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Cryptographic Block Hash:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">100% Chain Custody Confirmed</span>
              </div>
              <p className="text-slate-800 dark:text-slate-200 break-all">{result.ledgerRecord.blockHash}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
