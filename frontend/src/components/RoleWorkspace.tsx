import React, { useState } from 'react';
import api from '../api/client';
import { OfficerUploadZone } from './OfficerUploadZone';
import { DocumentList } from './DocumentList';
import { AuditLedgerView } from './AuditLedgerView';
import { VerifierQueue } from './VerifierQueue';
import { CertificateVerificationDesk } from './CertificateVerificationDesk';
import { AdminGovernanceConsole } from './AdminGovernanceConsole';
import {
  Lock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  FileText,
  FolderOpen,
  Scale,
  ShieldCheck,
} from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'Officer' | 'Verifier' | 'Admin' | 'Auditor';
  isVerified: boolean;
}

interface RoleWorkspaceProps {
  user: UserProfile;
  onLogout: () => void;
  onSwitchRole: (newRole: 'Officer' | 'Verifier' | 'Admin' | 'Auditor') => void;
}

export const RoleWorkspace: React.FC<RoleWorkspaceProps> = ({ user, onLogout, onSwitchRole }) => {
  const [testZone, setTestZone] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ status: number; message: string; granted: boolean } | null>(null);
  const [testing, setTesting] = useState(false);
  const [docsRefreshCounter, setDocsRefreshCounter] = useState(0);
  const [isRbacOpen, setIsRbacOpen] = useState(false);
  const [officerTab, setOfficerTab] = useState<'upload' | 'repository'>('upload');
  const [auditorTab, setAuditorTab] = useState<'ledger' | 'verify-desk'>(
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab') === 'verify-desk'
      ? 'verify-desk'
      : 'ledger'
  );

  const testClearance = async (endpoint: string, label: string) => {
    setTesting(true);
    setTestZone(label);
    setTestResult(null);
    try {
      const res = await api.get(`/test/${endpoint}`);
      setTestResult({
        status: res.status,
        message: res.data.message,
        granted: true,
      });
    } catch (err: any) {
      setTestResult({
        status: err.response?.status || 500,
        message: err.response?.data?.error || 'Access request rejected by RBAC policy.',
        granted: false,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* User Header Profile Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-600 dark:text-emerald-400 text-lg shadow-sm">
            {user.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900 dark:text-white text-base">{user.name}</span>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                  user.role === 'Officer'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : user.role === 'Verifier'
                    ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'
                    : user.role === 'Auditor'
                    ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                }`}
              >
                {user.role} Clearance
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono">
                <CheckCircle2 className="w-3 h-3" /> 2FA Active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">{user.email}</p>
          </div>
        </div>

        {/* Quick Role Switcher + Logout */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px]">
            <span className="text-slate-500 px-2 font-medium">Clearance:</span>
            {(['Officer', 'Verifier', 'Auditor', 'Admin'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onSwitchRole(r)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  user.role === r
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-300 dark:border-slate-700'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="text-xs px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20 transition font-semibold"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Collapsible RBAC Live Clearance Guard Tester */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-colors">
        <button
          type="button"
          onClick={() => setIsRbacOpen((prev) => !prev)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-850/50 transition"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                Zero-Trust Role-Based Access Control (RBAC) Guard Test
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                  Express Policy Middleware
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Click to verify that non-authorized clearance zones return HTTP 403 Forbidden.
              </p>
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isRbacOpen ? 'rotate-180 text-emerald-500' : ''
            }`}
          />
        </button>

        {isRbacOpen && (
          <div className="p-5 pt-1 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => testClearance('officer-zone', 'Officer Evidence Zone')}
                disabled={testing}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 transition text-left space-y-1 group"
              >
                <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Officer Zone</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Requires Officer / Admin</div>
              </button>

              <button
                type="button"
                onClick={() => testClearance('verifier-zone', 'Verifier Review Queue')}
                disabled={testing}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 transition text-left space-y-1 group"
              >
                <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Verifier Zone</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Requires Verifier / Admin</div>
              </button>

              <button
                type="button"
                onClick={() => testClearance('auditor-zone', 'Auditor Ledger Console')}
                disabled={testing}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 transition text-left space-y-1 group"
              >
                <div className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">Auditor Zone</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Requires Auditor / Admin</div>
              </button>

              <button
                type="button"
                onClick={() => testClearance('admin-zone', 'Admin Governance Console')}
                disabled={testing}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 transition text-left space-y-1 group"
              >
                <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Admin Zone</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Requires Admin Only</div>
              </button>
            </div>

            {testResult && (
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 text-xs transition animate-in fade-in ${
                  testResult.granted
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300'
                }`}
              >
                {testResult.granted ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between font-mono font-bold">
                    <span>Tested: {testZone}</span>
                    <span>HTTP {testResult.status} {testResult.granted ? 'OK (GRANTED)' : 'FORBIDDEN (DENIED)'}</span>
                  </div>
                  <p className="font-sans">{testResult.message}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Role-Specific Workspaces Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-6 transition-colors">
        
        {/* Officer View with Sub-Tabs */}
        {user.role === 'Officer' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOfficerTab('upload')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    officerTab === 'upload'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Upload & Ingestion</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOfficerTab('repository')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    officerTab === 'repository'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Case Evidence Repository</span>
                </button>
              </div>

              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                WebCrypto SHA-256 Pre-Flight Active
              </span>
            </div>

            {officerTab === 'upload' ? (
              <OfficerUploadZone
                onUploadSuccess={() => {
                  setDocsRefreshCounter((prev) => prev + 1);
                  setOfficerTab('repository');
                }}
              />
            ) : (
              <DocumentList refreshTrigger={docsRefreshCounter} />
            )}
          </div>
        )}

        {/* Verifier View */}
        {user.role === 'Verifier' && (
          <div className="space-y-6">
            <VerifierQueue onCertified={() => setDocsRefreshCounter((prev) => prev + 1)} />
            <DocumentList refreshTrigger={docsRefreshCounter} />
          </div>
        )}

        {/* Auditor View with Sub-Tabs */}
        {user.role === 'Auditor' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setAuditorTab('ledger')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  auditorTab === 'ledger'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Merkle Ledger Explorer</span>
              </button>
              <button
                type="button"
                onClick={() => setAuditorTab('verify-desk')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  auditorTab === 'verify-desk'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Courtroom Certificate Verification Desk</span>
              </button>
            </div>

            {auditorTab === 'ledger' ? (
              <AuditLedgerView />
            ) : (
              <CertificateVerificationDesk />
            )}
            <DocumentList refreshTrigger={docsRefreshCounter} />
          </div>
        )}

        {/* Admin View */}
        {user.role === 'Admin' && (
          <div className="space-y-6">
            <AdminGovernanceConsole />
            <DocumentList refreshTrigger={docsRefreshCounter} />
          </div>
        )}
      </div>
    </div>
  );
};
