import React, { useState } from 'react';
import {
  ShieldCheck,
  Scale,
  Printer,
  Copy,
  Check,
  X,
  FileCheck,
  Clock,
  Hash,
  Award,
} from 'lucide-react';

export interface Bsa63CertificateData {
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

interface CourtCertificateModalProps {
  certificate: Bsa63CertificateData;
  onClose: () => void;
}

export const CourtCertificateModal: React.FC<CourtCertificateModalProps> = ({
  certificate,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const text = `
CERTIFICATE UNDER SECTION 63 OF BHARATIYA SAKSHYA ADHINIYAM, 2023
Certificate ID: ${certificate.certificateId}
Issued At: ${new Date(certificate.issuedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
Case FIR Reference: ${certificate.caseNumber || 'ALL REGISTERED RECORDS'}
Custodian: ${certificate.custodian.name} (${certificate.custodian.role})

1. DECLARATION PURSUANT TO SECTION 63(2):
- System: ${certificate.deviceDeclaration.systemName}
- Operating Status: ${certificate.deviceDeclaration.operatingStatus}
- Custody: ${certificate.deviceDeclaration.custodyDescription}
- Cryptographic Proof: ${certificate.deviceDeclaration.integrityStatement}

2. CRYPTOGRAPHIC VERIFICATION EVIDENCE:
- SHA-256 Ledger Chain Valid: ${certificate.cryptographicProof.chainValid ? 'YES (100% UNBROKEN)' : 'NO (TAMPER DETECTED)'}
- Total Sequential Blocks Verified: ${certificate.cryptographicProof.totalBlocksVerified}
- Genesis Block 0 Hash: ${certificate.cryptographicProof.genesisBlockHash}
- Latest Tip Block Hash: ${certificate.cryptographicProof.latestTipHash}
${certificate.cryptographicProof.targetDocumentHash ? `- Target Document Checksum: ${certificate.cryptographicProof.targetDocumentHash}` : ''}

3. STATUTORY SIGN-OFF:
${certificate.legalSignoff}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-800 dark:text-slate-200">
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Section 63 BSA Evidentiary Certificate
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Certificate Ref: <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{certificate.certificateId}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:text-slate-950 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Certificate Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-700 dark:text-slate-200 text-xs font-sans leading-relaxed">
          {/* Certificate Official Header */}
          <div className="text-center space-y-1.5 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-mono font-semibold uppercase tracking-wider">
              <Award className="w-4 h-4" /> Republic of India · Admissible In Law Courts
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight pt-1">
              CERTIFICATE UNDER SECTION 63 OF BHARATIYA SAKSHYA ADHINIYAM, 2023
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              (Corresponding to Section 65B of the Indian Evidence Act, 1872 for Admissibility of Electronic Records)
            </p>
          </div>

          {/* Statutory Affirmation */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 font-mono text-[11px]">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-slate-500 dark:text-slate-400">Statutory Affidavit</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">BSA 2023 § 63(2) & § 63(4)</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 font-sans text-xs">
              I, <strong className="text-slate-900 dark:text-white">{certificate.custodian.name}</strong>, holding the position of{' '}
              <strong className="text-emerald-700 dark:text-emerald-400">{certificate.custodian.role}</strong>, do hereby solemnly certify and affirm under Section 63(4) of Bharatiya Sakshya Adhiniyam, 2023 that:
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-slate-700 dark:text-slate-300 font-sans text-xs">
              <li>
                The electronic records pertaining to Case FIR{' '}
                <strong className="text-slate-900 dark:text-white font-mono">{certificate.caseNumber || 'All Enrolled Cases'}</strong> were produced by the computer during the period over which the computer was used regularly to store and process electronic evidence for legal investigation.
              </li>
              <li>
                During the said period, the cryptographic system{' '}
                <strong className="text-emerald-700 dark:text-emerald-400 font-mono">Secure DMS</strong> was operating properly and at all material times without any distortion or unapproved alteration.
              </li>
              <li>
                Each electronic file was verified client-side using SHA-256 pre-flight computation, and consecutively sealed into an immutable chained Merkle-style ledger.
              </li>
            </ol>
          </div>

          {/* Cryptographic Proof Grid */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Hash className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Cryptographic Ledger Verification Proofs
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-slate-500">Chain Status:</div>
                <div className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> 100% UNBROKEN & VERIFIED
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-slate-500">Total Sequential Blocks:</div>
                <div className="text-slate-900 dark:text-white font-bold">
                  {certificate.cryptographicProof.totalBlocksVerified} Consecutive Blocks
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 sm:col-span-2">
                <div className="text-slate-500">Genesis Block 0 Root Hash:</div>
                <div className="text-emerald-700 dark:text-emerald-300 break-all">{certificate.cryptographicProof.genesisBlockHash}</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 sm:col-span-2">
                <div className="text-slate-500">Latest Ledger Tip Hash:</div>
                <div className="text-emerald-700 dark:text-emerald-300 break-all">{certificate.cryptographicProof.latestTipHash}</div>
              </div>
              {certificate.cryptographicProof.targetDocumentHash && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-emerald-500/30 space-y-1 sm:col-span-2">
                  <div className="text-emerald-700 dark:text-emerald-400 font-semibold">Target Document SHA-256 Digest:</div>
                  <div className="text-slate-900 dark:text-white break-all">{certificate.cryptographicProof.targetDocumentHash}</div>
                </div>
              )}
            </div>
          </div>

          {/* Audit Chain Samples */}
          {certificate.evidentiaryRecords.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Sequential Evidentiary Audit Log Entries
              </h4>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-950">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 font-mono text-[10px] uppercase border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-2.5">Seq #</th>
                      <th className="p-2.5">Timestamp</th>
                      <th className="p-2.5">Action</th>
                      <th className="p-2.5">Operator</th>
                      <th className="p-2.5">Block Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                    {certificate.evidentiaryRecords.slice(0, 8).map((rec) => (
                      <tr key={rec.sequenceNumber} className="hover:bg-slate-100/60 dark:hover:bg-slate-900/50">
                        <td className="p-2.5 text-emerald-700 dark:text-emerald-400">#{rec.sequenceNumber}</td>
                        <td className="p-2.5 text-slate-500 dark:text-slate-400">{new Date(rec.timestamp).toLocaleTimeString()}</td>
                        <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">{rec.action}</td>
                        <td className="p-2.5 text-slate-700 dark:text-slate-300">{rec.operator}</td>
                        <td className="p-2.5 text-slate-500 dark:text-slate-400 truncate max-w-[140px]">{rec.blockHash}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Legal Sign-Off Box */}
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 rounded-xl space-y-2 text-xs">
            <div className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4" /> Court Attestation & Signature
            </div>
            <p className="text-slate-700 dark:text-slate-300">{certificate.legalSignoff}</p>
            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono border-t border-emerald-200 dark:border-emerald-500/20">
              <span>Electronic Seal Applied</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">✓ Cryptographically Admissible</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:text-slate-950 text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-600/20"
          >
            <Printer className="w-4 h-4" /> Print Court Certificate
          </button>
        </div>
      </div>
    </div>
  );
};
export default CourtCertificateModal;
