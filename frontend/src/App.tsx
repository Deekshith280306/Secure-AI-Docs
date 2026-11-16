import { useState, useEffect } from 'react';
import api from './api/client';
import { AuthModal } from './components/AuthModal';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { OfficerUploadZone } from './components/OfficerUploadZone';
import { DocumentList } from './components/DocumentList';
import { VerifierQueue } from './components/VerifierQueue';
import { AuditLedgerView } from './components/AuditLedgerView';
import { CertificateVerificationDesk } from './components/CertificateVerificationDesk';
import { AdminGovernanceConsole } from './components/AdminGovernanceConsole';
import { TestingUatDesk } from './components/TestingUatDesk';
import {
  ShieldCheck,
  Server,
  AlertCircle,
  RefreshCw,
  LogIn,
  LogOut,
  Sparkles,
  Layers,
  Terminal,
  FileText,
  Lock,
  Sun,
  Moon,
  ChevronDown,
  UserCheck,
  FileCheck,
  Scale,
  Award,
  Upload,
  FolderOpen,
  HelpCircle,
  X,
  CheckCircle2,
  XCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Activity,
  Fingerprint,
  Menu,
} from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'Officer' | 'Verifier' | 'Admin' | 'Auditor';
  isVerified: boolean;
}

interface SystemHealth {
  status: string;
  system: string;
  version: string;
  timestamp: string;
  dbConnected: boolean;
  dbState: string;
  complianceStandard: string;
}

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  // Navigation & Workspace State
  const [activeTab, setActiveTab] = useState<'upload' | 'documents' | 'review' | 'court' | 'testing' | 'admin'>('upload');
  const [courtSubTab, setCourtSubTab] = useState<'ledger' | 'verify-desk'>('ledger');
  const [docsRefreshCounter, setDocsRefreshCounter] = useState(0);
  const [isHelpOpen, setIsHelpOpen] = useState(true);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  
  // Collapsible Sidebar State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // RBAC test state in diagnostics
  const [testingRbac, setTestingRbac] = useState(false);
  const [testZone, setTestZone] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ status: number; message: string; granted: boolean } | null>(null);

  const checkHealth = async () => {
    setLoadingHealth(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/health');
      setHealth(res.data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Server connection refused');
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setLoadingHealth(false);
    }
  };

  const handleSwitchRole = async (newRole: 'Officer' | 'Verifier' | 'Admin' | 'Auditor', targetTab?: 'upload' | 'documents' | 'review' | 'court' | 'admin') => {
    try {
      const res = await api.post('/auth/demo-login', { role: newRole });
      localStorage.setItem('dms_auth_token', res.data.token);
      setCurrentUser(res.data.user);
      setDocsRefreshCounter((prev) => prev + 1);
      if (targetTab) {
        setActiveTab(targetTab);
      }
    } catch (e) {
      console.error('Failed to switch role', e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dms_auth_token');
    setCurrentUser(null);
    setIsAuthModalOpen(true);
  };

  const testClearance = async (endpoint: string, label: string) => {
    setTestingRbac(true);
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
        message: err.response?.data?.error || 'Access request rejected by security policy.',
        granted: false,
      });
    } finally {
      setTestingRbac(false);
    }
  };

  useEffect(() => {
    checkHealth();

    const params = new URLSearchParams(window.location.search);
    if (params.get('modal') === 'auth') {
      setIsAuthModalOpen(true);
    }
    const demoParam = params.get('demo') as any;
    if (demoParam && ['Officer', 'Verifier', 'Admin', 'Auditor'].includes(demoParam)) {
      handleSwitchRole(demoParam);
    } else {
      handleSwitchRole('Officer');
    }

    const tabParam = params.get('tab') as any;
    if (tabParam && ['upload', 'documents', 'review', 'court', 'admin', 'testing'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    if (params.get('diag') === 'true') {
      setIsDiagnosticsOpen(true);
    }

    const interval = setInterval(checkHealth, 25000);
    return () => clearInterval(interval);
  }, []);

  const roles = [
    {
      id: 'Officer',
      label: 'Police Officer',
      shortLabel: 'Officer',
      desc: 'Evidence intake & pre-flight fingerprints',
      icon: FileText,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      activeTab: 'upload' as const,
    },
    {
      id: 'Verifier',
      label: 'Forensic Verifier',
      shortLabel: 'Verifier',
      desc: 'Dual-custody re-hashing & digital seal',
      icon: FileCheck,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      activeTab: 'review' as const,
    },
    {
      id: 'Auditor',
      label: 'Court / Auditor',
      shortLabel: 'Judge / Audit',
      desc: 'Merkle audit trail & Section 63 BSA cert',
      icon: Scale,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      activeTab: 'court' as const,
    },
    {
      id: 'Admin',
      label: 'Administrator',
      shortLabel: 'Admin',
      desc: 'Security policies & key management',
      icon: UserCheck,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      activeTab: 'admin' as const,
    },
  ] as const;

  const navItems = [
    {
      id: 'upload' as const,
      label: '1. Ingest Evidence',
      badge: 'Pre-Flight',
      icon: Upload,
      accent: 'emerald',
    },
    {
      id: 'documents' as const,
      label: '2. Case Vault',
      badge: 'Encrypted',
      icon: FolderOpen,
      accent: 'emerald',
    },
    {
      id: 'review' as const,
      label: '3. Forensic Desk',
      badge: 'Dual-Custody',
      icon: FileCheck,
      accent: 'cyan',
    },
    {
      id: 'court' as const,
      label: '4. Court Proof & Audit',
      badge: 'BSA § 63',
      icon: Scale,
      accent: 'purple',
    },
    {
      id: 'testing' as const,
      label: '5. Testing & UAT Desk',
      badge: 'TC-01..08',
      icon: CheckCircle2,
      accent: 'emerald',
    },
    {
      id: 'admin' as const,
      label: '6. Governance Console',
      badge: 'Admin Only',
      icon: UserCheck,
      accent: 'amber',
      adminOnly: true,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex font-sans cyber-grid-bg transition-colors duration-200">
      
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* ======================================================== */}
      {/* LEFT COLLAPSIBLE CYBER DEFENSE SIDEBAR                   */}
      {/* ======================================================== */}
      <aside
        className={`fixed md:sticky top-0 h-screen z-50 flex flex-col justify-between transition-all duration-300 ease-in-out border-r ${
          isSidebarCollapsed ? 'w-20' : 'w-72'
        } ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } cyber-glass dark:bg-[#0a0f1d]/90 bg-white/95 border-slate-200 dark:border-slate-800/80 shadow-2xl backdrop-blur-xl`}
      >
        {/* Sidebar Header & Brand */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/60">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 cyber-glow-emerald shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              {!isSidebarCollapsed && (
                <div className="truncate animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white uppercase font-mono">
                      SECURE AI DOCS
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono tracking-wide">
                      BSA 2023 § 63 VAULT
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Collapse / Expand Toggle Button */}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition hidden md:flex items-center justify-center shrink-0"
              title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-emerald-500" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
            
            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active Operator Badge & 1-Click Persona Switcher */}
          {!isSidebarCollapsed ? (
            <div className="mt-4 p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">
                  Active Clearance
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                  {currentUser?.role || 'Officer'}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {currentUser?.name || 'Officer Ramanathan'}
              </div>
              
              {/* Quick Persona Grid */}
              <div className="grid grid-cols-2 gap-1.5 mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                {roles.map((r) => {
                  const Icon = r.icon;
                  const isActive = currentUser?.role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSwitchRole(r.id, r.activeTab)}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition truncate ${
                        isActive
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-300 dark:border-slate-700'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
                      }`}
                      title={r.desc}
                    >
                      <Icon className={`w-3 h-3 shrink-0 ${isActive ? 'text-emerald-500' : 'text-slate-400'}`} />
                      <span className="truncate">{r.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-2">
              <div
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-emerald-500"
                title={`Role: ${currentUser?.role}`}
              >
                <Fingerprint className="w-5 h-5" />
              </div>
            </div>
          )}
        </div>

        {/* Navigation Modules */}
        <div className="p-3 space-y-1.5 overflow-y-auto flex-1">
          {!isSidebarCollapsed && (
            <div className="px-3 py-1 text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">
              Forensic Modules
            </div>
          )}
          {navItems.map((item) => {
            if (item.adminOnly && currentUser?.role !== 'Admin') return null;
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative group ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/20 cyber-glow-emerald'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/60'
                }`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'}`} />
                {!isSidebarCollapsed && (
                  <div className="flex items-center justify-between w-full">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
                {isSidebarCollapsed && isActive && (
                  <div className="absolute right-1 w-1.5 h-6 bg-emerald-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer & Live Telemetry Node */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/60 space-y-2">
          {!isSidebarCollapsed && (
            <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-emerald-500 animate-pulse" /> Node Status
                </span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  PORT 5001 ONLINE
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>Vault Engine</span>
                <span className="text-slate-700 dark:text-slate-300">AES-256-GCM</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>Ledger Root</span>
                <span className="text-emerald-600 dark:text-emerald-400">Genesis Block 0</span>
              </div>
            </div>
          )}

          {/* Action Row: Theme + Diagnostics + Sign Out */}
          <div className={`flex items-center ${isSidebarCollapsed ? 'flex-col gap-2' : 'justify-between gap-1'} pt-1`}>
            {/* Diagnostics Quick-Trigger */}
            <button
              type="button"
              onClick={() => setIsDiagnosticsOpen((prev) => !prev)}
              className={`p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-emerald-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition ${
                isDiagnosticsOpen ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : ''
              }`}
              title="Toggle Developer & RBAC Diagnostics"
            >
              <Terminal className="w-4 h-4" />
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              title={theme === 'dark' ? 'Switch to Light Courtroom Mode' : 'Switch to Cyber Defense Dark Glass'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {/* User Login / Logout */}
            {currentUser ? (
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="p-2 rounded-xl text-emerald-500 hover:bg-emerald-500/10 transition"
                title="Sign In"
              >
                <LogIn className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* MAIN EXPANSIVE WORKSPACE VIEWPORT                       */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Sleek Glassmorphic Workspace Top Bar */}
        <header className="h-16 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#070b14]/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 hidden sm:inline">Workspace</span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                {currentUser?.role || 'Officer'}
              </span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span className="font-extrabold text-slate-900 dark:text-white capitalize">
                {activeTab === 'upload' && 'Evidence Intake & Pre-Flight Hash'}
                {activeTab === 'documents' && 'Encrypted Case Files Vault'}
                {activeTab === 'review' && 'Forensic Lab Dual-Custody Desk'}
                {activeTab === 'court' && 'Courtroom Merkle Ledger & BSA § 63 Cert'}
                {activeTab === 'testing' && 'Academic UAT & System Testing Desk (TC-01..08)'}
                {activeTab === 'admin' && 'Security Governance & Policies'}
              </span>
            </div>
          </div>

          {/* Right Status Controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-600 dark:text-slate-300">Case FIR:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">0142/2026</span>
            </div>

            {currentUser ? (
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-500/10 text-slate-600 hover:text-rose-500 dark:bg-slate-900 dark:hover:bg-rose-500/20 dark:text-slate-300 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-800 text-xs font-semibold transition"
                title="Switch Account or Sign In with Credentials"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden sm:inline">Sign Out / Login</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20 cyber-glow-emerald"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In Portal</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsHelpOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">{isHelpOpen ? 'Hide Guide' : 'How it Works'}</span>
            </button>
          </div>
        </header>

        {/* Workspace Main Scrollable Content */}
        <main className="p-4 sm:p-8 flex-1 space-y-6 max-w-7xl mx-auto w-full">
          
          {/* Beginner-Friendly 3-Step Explanation Card */}
          {isHelpOpen && (
            <div className="cyber-glass-card rounded-2xl p-5 relative shadow-xl border border-emerald-500/20 animate-in fade-in">
              <button
                onClick={() => setIsHelpOpen(false)}
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-200 p-1"
                title="Close guide"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2 font-mono">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>HOW SECTION 63 BSA ELECTRONIC EVIDENCE MANAGEMENT WORKS IN 3 STEPS</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
                <div className="p-3.5 bg-white/70 dark:bg-slate-950/80 border border-emerald-500/30 rounded-xl space-y-1">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-mono">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">1</span>
                    Police Officer Uploads
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    Client browser computes an unchangeable <strong>SHA-256 pre-flight fingerprint</strong> before transmission. The file is sealed in AES-256-GCM vault storage.
                  </p>
                </div>

                <div className="p-3.5 bg-white/70 dark:bg-slate-950/80 border border-cyan-500/30 rounded-xl space-y-1">
                  <div className="font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5 font-mono">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">2</span>
                    Lab Verifier Reviews & Seals
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    Under dual custody, forensic examiners verify bit-level hash integrity and attach a digital verification stamp, preventing rogue evidence modification.
                  </p>
                </div>

                <div className="p-3.5 bg-white/70 dark:bg-slate-950/80 border border-purple-500/30 rounded-xl space-y-1">
                  <div className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5 font-mono">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px]">3</span>
                    Courtroom Verifies Certificate
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    Judges and attorneys audit the Merkle chain, run live tamper detection, and export certified <strong>Section 63 BSA Court Certificates</strong> with QR validation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: UPLOAD DOCUMENT */}
          {activeTab === 'upload' && (
            <div className="space-y-4 animate-in fade-in">
              {currentUser?.role !== 'Officer' && currentUser?.role !== 'Admin' && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs text-amber-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      Separation of Duties Notice (BSA 2023)
                    </div>
                    <p className="text-xs text-slate-400">
                      You are viewing as <strong>{currentUser?.role}</strong>. In statutory proceedings, evidence intake is initiated by Police Officers.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSwitchRole('Officer')}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shrink-0 transition"
                  >
                    Switch to Police Officer (1-Click)
                  </button>
                </div>
              )}

              <div className="cyber-glass-card rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
                <OfficerUploadZone
                  onUploadSuccess={() => {
                    setDocsRefreshCounter((prev) => prev + 1);
                    setActiveTab('documents');
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB 2: CASE DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="cyber-glass-card rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
                <DocumentList refreshTrigger={docsRefreshCounter} />
              </div>
            </div>
          )}

          {/* TAB 3: REVIEW & SEAL */}
          {activeTab === 'review' && (
            <div className="space-y-6 animate-in fade-in">
              {currentUser?.role !== 'Verifier' && currentUser?.role !== 'Admin' && (
                <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs text-cyan-400 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-cyan-500" />
                      Forensic Lab Verifier Workspace
                    </div>
                    <p className="text-xs text-slate-400">
                      Officers cannot self-certify evidence. Switch to <strong>Lab Verifier</strong> mode to independently inspect and seal exhibits.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSwitchRole('Verifier')}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shrink-0 transition"
                  >
                    Switch to Lab Verifier (1-Click)
                  </button>
                </div>
              )}

              <div className="cyber-glass-card rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
                <VerifierQueue onCertified={() => setDocsRefreshCounter((prev) => prev + 1)} />
                <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                  <DocumentList refreshTrigger={docsRefreshCounter} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COURT PROOF & AUDIT */}
          {activeTab === 'court' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => setCourtSubTab('ledger')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                    courtSubTab === 'ledger'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-purple-500/40'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Audit Trail & Tamper Alarm</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCourtSubTab('verify-desk')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                    courtSubTab === 'verify-desk'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-purple-500/40'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Courtroom Certificate Verification Desk</span>
                </button>
              </div>

              <div className="cyber-glass-card rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
                {courtSubTab === 'ledger' ? (
                  <AuditLedgerView />
                ) : (
                  <CertificateVerificationDesk />
                )}
                <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                  <DocumentList refreshTrigger={docsRefreshCounter} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: TESTING & UAT DESK */}
          {activeTab === 'testing' && (
            <div className="space-y-6 animate-in fade-in">
              <TestingUatDesk />
            </div>
          )}

          {/* TAB 5: ADMIN CONSOLE */}
          {activeTab === 'admin' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="cyber-glass-card rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
                <AdminGovernanceConsole />
                <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                  <DocumentList refreshTrigger={docsRefreshCounter} />
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* DEVELOPER & COMPLIANCE DIAGNOSTICS DRAWER               */}
          {/* ======================================================== */}
          <div className="cyber-glass-card rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl transition-all">
            <button
              type="button"
              onClick={() => setIsDiagnosticsOpen((prev) => !prev)}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition border-b border-transparent"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 font-mono">
                    ⚙️ DEVELOPER & COMPLIANCE DIAGNOSTICS
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-medium border border-emerald-500/20">
                      All 6 Phases Completed
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Inspect backend telemetry, test RBAC 403 access control policies, and view the full 6-phase engineering architecture.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                  {isDiagnosticsOpen ? 'COLLAPSE' : 'EXPAND'}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    isDiagnosticsOpen ? 'rotate-180 text-emerald-500' : ''
                  }`}
                />
              </div>
            </button>

            {isDiagnosticsOpen && (
              <div className="p-6 space-y-6 border-t border-slate-200 dark:border-slate-800 animate-in fade-in">
                
                {/* Live Backend Health Bar */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Server className="w-3.5 h-3.5 text-emerald-500" /> Live Backend Diagnostics
                    </h4>
                    <div className="flex items-center gap-2">
                      {lastChecked && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          Last checked: {lastChecked}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={checkHealth}
                        disabled={loadingHealth}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition"
                        title="Refresh Backend Status"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin text-emerald-500' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {errorMsg ? (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-xs font-semibold text-rose-700 dark:text-rose-300">Connection Error</h5>
                        <p className="text-xs text-rose-600 dark:text-rose-400/90 mt-0.5">{errorMsg}</p>
                      </div>
                    </div>
                  ) : health ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                        <div className="text-slate-500 dark:text-slate-400 text-[11px]">System Target</div>
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate">{health.system}</div>
                      </div>
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                        <div className="text-slate-500 dark:text-slate-400 text-[11px]">API Gateway Status</div>
                        <div className="font-mono text-emerald-600 dark:text-emerald-400 uppercase font-semibold">{health.status}</div>
                      </div>
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                        <div className="text-slate-500 dark:text-slate-400 text-[11px]">Database Mode</div>
                        <div className="font-mono text-amber-600 dark:text-amber-400 uppercase font-semibold">{health.dbState}</div>
                      </div>
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                        <div className="text-slate-500 dark:text-slate-400 text-[11px]">Evidentiary Standard</div>
                        <div className="font-mono text-slate-700 dark:text-slate-300">{health.complianceStandard}</div>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* RBAC Live Guard Tester */}
                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Lock className="w-3.5 h-3.5 text-emerald-500" /> Zero-Trust Access Control (RBAC) Guard Test
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Test that non-authorized clearance zones return HTTP 403 Forbidden under current user ({currentUser?.role || 'Guest'}).
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <button
                      type="button"
                      onClick={() => testClearance('officer-zone', 'Officer Evidence Zone')}
                      disabled={testingRbac}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 transition text-left space-y-1"
                    >
                      <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono">Officer Zone</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Requires Officer / Admin</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => testClearance('verifier-zone', 'Verifier Review Queue')}
                      disabled={testingRbac}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 transition text-left space-y-1"
                    >
                      <div className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 font-mono">Verifier Zone</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Requires Verifier / Admin</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => testClearance('auditor-zone', 'Auditor Ledger Console')}
                      disabled={testingRbac}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 transition text-left space-y-1"
                    >
                      <div className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 font-mono">Auditor Zone</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Requires Auditor / Admin</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => testClearance('admin-zone', 'Admin Governance Console')}
                      disabled={testingRbac}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 transition text-left space-y-1"
                    >
                      <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 font-mono">Admin Zone</div>
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

                {/* 6-Phase Engineering Roadmap Grid */}
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <Layers className="w-3.5 h-3.5 text-emerald-500" /> Architectural Roadmap Execution (Phases 1 - 6)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    {/* Phase 1 */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-400 text-[10px]">PHASE 01</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold font-mono">ACTIVE</span>
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Server className="w-3.5 h-3.5 text-slate-500" /> Monorepo Foundation & Dual Storage
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                        Production Node.js API + React 18, dual S3/local vault, and automatic fallback stores.
                      </p>
                    </div>

                    {/* Phase 2 */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-400 text-[10px]">PHASE 02</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold font-mono">ACTIVE</span>
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-slate-500" /> Zero-Trust RBAC & TOTP 2FA
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                        Strict 4-tier separation of duties (Officer, Verifier, Admin, Auditor) with Speakeasy TOTP.
                      </p>
                    </div>

                    {/* Phase 3 */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-400 text-[10px]">PHASE 03</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold font-mono">ACTIVE</span>
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5 text-slate-500" /> WebCrypto Pre-Flight Hashing
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                        Client-side SHA-256 fingerprinting before upload and AES-256-GCM authenticated vault storage.
                      </p>
                    </div>

                    {/* Phase 4 */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-400 text-[10px]">PHASE 04</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold font-mono">ACTIVE</span>
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Scale className="w-3.5 h-3.5 text-slate-500" /> Immutable Merkle Audit Ledger
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                        Blockchain-style cryptographic hash chaining with automatic tamper detection.
                      </p>
                    </div>

                    {/* Phase 5 */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border border-indigo-200 dark:border-indigo-500/30 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-[10px]">PHASE 05</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold font-mono">ACTIVE</span>
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Gemini AI & Privacy Redaction
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                        Multimodal legal extraction (IPC/BNS), citizen privacy masking (Aadhaar/Phone), and semantic search.
                      </p>
                    </div>

                    {/* Phase 6 */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border border-emerald-200 dark:border-emerald-500/30 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-[10px]">PHASE 06</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold font-mono">ACTIVE</span>
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Award className="w-3.5 h-3.5 text-emerald-500" /> Multi-Role Portals & Court Exports
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                        Officer Upload, Verifier Forensic Queue with 1-click seal, and Section 63 BSA Certificate generator.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </main>

        {/* Modern Footer */}
        <footer className="border-t border-slate-200/80 dark:border-slate-800/80 py-4 px-6 bg-white/50 dark:bg-[#070b14]/50 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-mono">
            <div>
              SECURE AI DOCS · Bharatiya Sakshya Adhiniyam, 2023 Compliant Repository
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                Zero-Trust AES-256-GCM Vault Active
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(user) => setCurrentUser(user)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
