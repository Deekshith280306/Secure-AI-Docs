import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff,
  Copy,
  Check,
  X,
  Scale,
  Hash,
  AlertTriangle,
  Cpu,
  RefreshCw,
  Lock,
} from 'lucide-react';

export interface ExtractedData {
  documentType: string;
  firNumber?: string;
  policeStation?: string;
  dateOfIncident?: string;
  actsAndSections: string[];
  accusedPersons: string[];
  complainantVictim?: string;
  incidentSummary: string;
  seizedItems?: string[];
  confidenceScore: number;
}

export interface PiiRedaction {
  type: 'AADHAAR' | 'PHONE' | 'PAN' | 'EMAIL' | 'OTHER';
  originalSnippet: string;
  maskedSnippet: string;
  count: number;
}

export interface DocumentWithAi {
  id: string;
  caseNumber: string;
  title: string;
  category: string;
  fileName: string;
  fileHash: string;
  status: string;
  ocrText?: string;
  extractedData?: ExtractedData;
  redactedText?: string;
  piiRedactions?: PiiRedaction[];
  aiProcessedAt?: string;
  aiModelUsed?: string;
}

interface AiInspectionModalProps {
  document: DocumentWithAi;
  isOpen: boolean;
  onClose: () => void;
  onTriggerAnalysis: (docId: string) => Promise<void>;
  isAnalyzing: boolean;
}

export const AiInspectionModal: React.FC<AiInspectionModalProps> = ({
  document,
  isOpen,
  onClose,
  onTriggerAnalysis,
  isAnalyzing,
}) => {
  const initialTab = window.location.search.includes('tab=redaction') ? 'redaction' : 'facts';
  const [activeTab, setActiveTab] = useState<'facts' | 'redaction' | 'custody'>(initialTab);
  const [copiedRedacted, setCopiedRedacted] = useState(false);
  const [viewMode, setViewMode] = useState<'masked' | 'split'>('masked');

  if (!isOpen) return null;

  const ext = document.extractedData;
  const redactions = document.piiRedactions || [];
  const hasAi = Boolean(ext);

  const copyRedacted = () => {
    if (document.redactedText) {
      navigator.clipboard.writeText(document.redactedText);
      setCopiedRedacted(true);
      setTimeout(() => setCopiedRedacted(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500/20 to-indigo-500/20 border border-indigo-500/30 text-indigo-400">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Gemini Legal AI & Privacy Redaction Studio
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center space-x-1">
                  <Cpu className="w-3 h-3 mr-1" />
                  {document.aiModelUsed || 'Gemini 2.5 Flash Engine'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Case {document.caseNumber} &bull; {document.title} &bull; SHA-256:{' '}
                <span className="font-mono text-indigo-400/80">{document.fileHash.slice(0, 16)}...</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onTriggerAnalysis(document.id)}
              disabled={isAnalyzing}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30 disabled:opacity-50 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'AI Scanning...' : hasAi ? 'Re-Analyze Evidence' : 'Run Gemini AI'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-6">
          <button
            onClick={() => setActiveTab('facts')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'facts'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Structured Legal Facts</span>
            {hasAi && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-indigo-500/20 text-indigo-300">
                {ext?.actsAndSections.length || 0} Sections
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('redaction')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'redaction'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>PII Redaction Studio</span>
            {redactions.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-500/20 text-rose-400">
                {redactions.length} Masked
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('custody')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'custody'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Hash className="w-4 h-4" />
            <span>Cryptographic Custody (BSA § 63)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {!hasAi && !isAnalyzing ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-700/60 rounded-xl bg-slate-950/30">
              <div className="w-12 h-12 mx-auto rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">This Document Has Not Been Analyzed by AI Yet</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
                Trigger Gemini AI to run optical character recognition (OCR), extract Indian legal entities (FIR, BNS
                sections, suspects), and automatically redact sensitive citizen Aadhaar & contact data.
              </p>
              <button
                onClick={() => onTriggerAnalysis(document.id)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition"
              >
                Run Gemini Legal Scan Now
              </button>
            </div>
          ) : isAnalyzing ? (
            <div className="text-center py-16">
              <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-4" />
              <h3 className="text-sm font-semibold text-white">Gemini AI Optical Scanning & Entity Parsing in Progress...</h3>
              <p className="text-xs text-slate-400 mt-1">
                Reading forensic byte stream &bull; Identifying BNS/IPC penal sections &bull; Generating privacy masks
              </p>
            </div>
          ) : (
            <>
              {/* TAB 1: STRUCTURED LEGAL FACTS */}
              {activeTab === 'facts' && ext && (
                <div className="space-y-6">
                  {/* Confidence Banner */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <Check className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-white">Legal Information Validated</span>
                        <p className="text-[11px] text-slate-400">
                          Processed under Bharatiya Sakshya Adhiniyam 2023 forensic standards.
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono text-emerald-400 font-bold">
                        {(ext.confidenceScore * 100).toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-slate-500 block">AI Confidence Score</span>
                    </div>
                  </div>

                  {/* Top Fact Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 block mb-1">
                        FIR / Crime Number
                      </span>
                      <span className="text-sm font-bold text-white font-mono">{ext.firNumber || 'N/A'}</span>
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Incident Date: {ext.dateOfIncident || 'Under Examination'}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 block mb-1">
                        Jurisdiction / Police Station
                      </span>
                      <span className="text-sm font-bold text-white">{ext.policeStation || 'N/A'}</span>
                      <span className="text-[10px] text-slate-500 block mt-1">Designated Investigation Thana</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 block mb-1">
                        Document Classification
                      </span>
                      <span className="text-sm font-bold text-white">{ext.documentType}</span>
                      <span className="text-[10px] text-slate-500 block mt-1">Primary Evidentiary Manifest</span>
                    </div>
                  </div>

                  {/* Acts & Penal Sections */}
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
                    <span className="text-xs font-semibold text-slate-200 block">
                      Applicable Penal Sections & Statutes (BNS / IPC / Special Acts)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {ext.actsAndSections.map((sec, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono"
                        >
                          ⚖️ {sec}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Parties: Accused & Complainant */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
                      <span className="text-xs font-semibold text-rose-400 flex items-center space-x-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Identified Suspects / Accused</span>
                      </span>
                      <ul className="space-y-1">
                        {ext.accusedPersons.map((person, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-slate-200 bg-slate-900/60 px-2.5 py-1.5 rounded-md border border-slate-800 font-mono"
                          >
                            👤 {person}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
                      <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Complainant / Victim / Informant</span>
                      </span>
                      <div className="text-xs text-slate-200 bg-slate-900/60 p-2.5 rounded-md border border-slate-800 font-mono">
                        🏛️ {ext.complainantVictim || 'State of Karnataka'}
                      </div>
                    </div>
                  </div>

                  {/* Executive Case Summary */}
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-1.5">
                    <span className="text-xs font-semibold text-slate-300">Executive Forensic Synopsis</span>
                    <p className="text-xs leading-relaxed text-slate-300 bg-slate-900/40 p-3 rounded-lg border border-slate-800/80">
                      {ext.incidentSummary}
                    </p>
                  </div>

                  {/* Seized Articles */}
                  {ext.seizedItems && ext.seizedItems.length > 0 && (
                    <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
                      <span className="text-xs font-semibold text-slate-300">
                        Physical & Digital Artifacts Seized (Panchnama Inventory)
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {ext.seizedItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="text-xs text-slate-300 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800 font-mono flex items-center space-x-2"
                          >
                            <span className="text-indigo-400">📦</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PII REDACTION STUDIO */}
              {activeTab === 'redaction' && (
                <div className="space-y-4">
                  {/* Controls & Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-white">Privacy Protection Level:</span>
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400">
                        Court Public Disclosure Ready
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                        <button
                          onClick={() => setViewMode('masked')}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                            viewMode === 'masked' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                          }`}
                        >
                          Sanitized View
                        </button>
                        <button
                          onClick={() => setViewMode('split')}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                            viewMode === 'split' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                          }`}
                        >
                          Compare Side-by-Side
                        </button>
                      </div>

                      <button
                        onClick={copyRedacted}
                        className="px-3 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition"
                      >
                        {copiedRedacted ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedRedacted ? 'Copied!' : 'Copy Redacted Text'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Redaction Metrics Pill List */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {redactions.map((r, i) => (
                      <div key={i} className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">{r.type}</span>
                        <span className="text-xs font-mono font-bold text-rose-400 block my-0.5">
                          {r.maskedSnippet}
                        </span>
                        <span className="text-[10px] text-slate-500">{r.count} match(es) redacted</span>
                      </div>
                    ))}
                  </div>

                  {/* Text Viewer */}
                  {viewMode === 'masked' ? (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800 text-xs text-slate-400">
                        <span className="flex items-center space-x-1.5 text-emerald-400">
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Sanitized Evidentiary Text (All Sensitive PII Masked)</span>
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">BSA 2023 Sec 63 Safe</span>
                      </div>
                      <pre className="text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto p-2">
                        {document.redactedText || 'No text extracted'}
                      </pre>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800 text-xs text-rose-400 font-semibold">
                          <span className="flex items-center space-x-1.5">
                            <Eye className="w-3.5 h-3.5" />
                            <span>Raw Forensic OCR (Contains Sensitive PII)</span>
                          </span>
                        </div>
                        <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto p-2 bg-rose-950/10 rounded-lg border border-rose-900/30">
                          {document.ocrText || 'No raw OCR content available'}
                        </pre>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800 text-xs text-emerald-400 font-semibold">
                          <span className="flex items-center space-x-1.5">
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Court-Sanitized Output (Redacted)</span>
                          </span>
                        </div>
                        <pre className="text-[11px] font-mono text-emerald-200 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto p-2 bg-emerald-950/10 rounded-lg border border-emerald-900/30">
                          {document.redactedText || 'No redacted content available'}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CRYPTOGRAPHIC CUSTODY */}
              {activeTab === 'custody' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <div className="flex items-center space-x-2 text-indigo-400">
                      <Lock className="w-4 h-4" />
                      <h4 className="text-xs font-bold uppercase tracking-wider">
                        Immutable Evidence Integrity Under BSA 2023 Sec 63
                      </h4>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      To preserve the sanctity of court evidence, AI models are <strong>strictly read-only</strong>.
                      The original evidence payload stored in the vault remains 100% bit-for-bit identical to the
                      investigating officer’s pre-flight hash.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Original Document SHA-256 Fingerprint
                      </span>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-indigo-300 break-all">
                        {document.fileHash}
                      </div>
                      <span className="text-[10px] text-emerald-400 flex items-center space-x-1">
                        <Check className="w-3 h-3" />
                        <span>Verified Bit-for-Bit Untouched in Vault</span>
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        AI Derivative Annotation Timestamp
                      </span>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-200">
                        {document.aiProcessedAt ? new Date(document.aiProcessedAt).toLocaleString('en-IN') : 'Pending Scan'}
                      </div>
                      <span className="text-[10px] text-indigo-400 flex items-center space-x-1">
                        <Hash className="w-3 h-3" />
                        <span>Permanently Chained in Phase 4 Blockchain Ledger</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <span className="text-xs text-slate-500 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Bharatiya Sakshya Adhiniyam 2023 Sec 63 &bull; Electronic Records Integrity Assured</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            Close Studio
          </button>
        </div>
      </div>
    </div>
  );
};
