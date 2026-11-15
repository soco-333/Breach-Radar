import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { breachApi } from '../services/breachApi';
import {
  ActivityLogEntry,
  BreachEvent,
  EmailStatus,
  MonitoredEmail,
  Organization,
} from '../types/breachRadar';
import { EmailStatusLabel, SeverityLabel } from './StatusIndicator';

interface DashboardViewProps {
  organization: Organization;
  emails: MonitoredEmail[];
  breaches: BreachEvent[];
  activityLogs: ActivityLogEntry[];
  alertsSentCount: number;
  loading: boolean;
  onRefresh: () => Promise<void>;
}

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function DashboardView({
  organization,
  emails,
  breaches,
  activityLogs,
  alertsSentCount,
  loading,
  onRefresh,
}: DashboardViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | EmailStatus>('all');
  const [countdownMap, setCountdownMap] = useState<Record<string, number>>({});
  const [livePaused, setLivePaused] = useState(false);
  const [scanningId, setScanningId] = useState<string | null>(null);

  // Add Email Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [newDept, setNewDept] = useState('Operations');
  const [addError, setAddError] = useState<string | null>(null);
  const [addingEmail, setAddingEmail] = useState(false);

  // Bulk CSV Modal
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvStatus, setCsvStatus] = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [uploadingCsv, setUploadingCsv] = useState(false);

  // Detail Drawer
  const [selectedEmail, setSelectedEmail] = useState<MonitoredEmail | null>(null);
  const [resolvingBreachId, setResolvingBreachId] = useState<string | null>(null);

  // Sync countdown map when emails load
  useEffect(() => {
    setCountdownMap((prev) => {
      const next: Record<string, number> = {};
      emails.forEach((em) => {
        next[em.id] = prev[em.id] ?? em.nextScanSeconds;
      });
      return next;
    });
  }, [emails]);

  // 1-second live countdown ticker
  useEffect(() => {
    if (livePaused) return;
    const timer = setInterval(() => {
      setCountdownMap((prev) => {
        const next: Record<string, number> = {};
        for (const [id, secs] of Object.entries(prev)) {
          next[id] = secs <= 1 ? 300 : secs - 1;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [livePaused]);

  const activeBreaches = useMemo(() => breaches.filter((b) => !b.resolved), [breaches]);
  const highRiskAccounts = useMemo(() => emails.filter((e) => e.riskScore >= 60), [emails]);

  const filteredEmails = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return emails.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesQuery =
        !q ||
        item.email.toLowerCase().includes(q) ||
        item.ownerName.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [emails, searchQuery, statusFilter]);

  const selectedEmailBreaches = useMemo(() => {
    if (!selectedEmail) return [];
    return breaches.filter((b) => b.monitoredEmailId === selectedEmail.id);
  }, [selectedEmail, breaches]);

  // Keep selectedEmail synced after refresh/resolution
  useEffect(() => {
    if (selectedEmail) {
      const fresh = emails.find((e) => e.id === selectedEmail.id);
      if (fresh) setSelectedEmail(fresh);
    }
  }, [emails, selectedEmail]);

  const handleScanNow = async (emailId: string) => {
    setScanningId(emailId);
    try {
      await breachApi.scanEmailNow(organization.id, emailId);
      setCountdownMap((prev) => ({ ...prev, [emailId]: 300 }));
      await onRefresh();
    } finally {
      setScanningId(null);
    }
  };

  const handleAddEmail = async (e: FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
      setAddError('Enter a valid email address (e.g. staff@company.in).');
      return;
    }
    if (newOwner.trim().length < 2) {
      setAddError('Enter the staff member or desk name.');
      return;
    }
    setAddingEmail(true);
    try {
      await breachApi.addMonitoredEmail(organization.id, {
        email: newEmail,
        ownerName: newOwner,
        department: newDept,
      });
      setNewEmail('');
      setNewOwner('');
      setNewDept('Operations');
      setShowAddModal(false);
      await onRefresh();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Unable to add email.');
    } finally {
      setAddingEmail(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const sample = [
      'email,owner_name,department',
      `accounts@${organization.domain},Priya Nair,Finance`,
      `support@${organization.domain},Aravind Menon,Customer Desk`,
      `admin@${organization.domain},Karthik S,IT Administration`,
    ].join('\n');
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'breachradar-sample-emails.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCsvText(reader.result);
      }
    };
    reader.readAsText(file);
  };

  const handleBulkImport = async (e: FormEvent) => {
    e.preventDefault();
    setCsvError(null);
    setCsvStatus(null);

    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setCsvError('Paste CSV rows or select a .csv file first.');
      return;
    }

    const parsedRows = lines
      .filter((line, idx) => !(idx === 0 && line.toLowerCase().startsWith('email')))
      .map((line) => {
        const parts = line.split(',').map((p) => p.trim());
        return {
          email: parts[0] || '',
          ownerName: parts[1] || 'Staff Member',
          department: parts[2] || 'General',
        };
      });

    if (parsedRows.length === 0) {
      setCsvError('No email rows detected below the CSV header.');
      return;
    }

    setUploadingCsv(true);
    try {
      const res = await breachApi.bulkUploadEmails(organization.id, parsedRows);
      setCsvStatus(
        `Imported ${res.added} email${res.added === 1 ? '' : 's'} (${res.breachesFound} exposed, ${res.skipped} skipped as invalid or duplicate).`
      );
      await onRefresh();
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : 'Bulk import failed.');
    } finally {
      setUploadingCsv(false);
    }
  };

  const handleResolveBreach = async (breachId: string) => {
    setResolvingBreachId(breachId);
    try {
      await breachApi.resolveBreachEvent(breachId);
      await onRefresh();
    } finally {
      setResolvingBreachId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            Security Overview — {organization.name}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {organization.industry} · {organization.city} · Powered by India-based monitoring
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setCsvError(null);
              setCsvStatus(null);
              setShowCsvModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Upload className="h-4 w-4 text-slate-600" aria-hidden="true" />
            Bulk CSV upload
          </button>
          <button
            type="button"
            onClick={() => {
              setAddError(null);
              setShowAddModal(true);
            }}
            style={{ backgroundColor: organization.brandColor }}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-95 transition-opacity whitespace-nowrap cursor-pointer"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add email
          </button>
        </div>
      </div>

      {/* Summary KPI Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white p-5">
              <div className="h-3 w-24 rounded bg-slate-200" />
              <div className="mt-4 h-7 w-16 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Monitored emails</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-slate-900 tabular-nums">
              {emails.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">Domain: {organization.domain}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Active breaches</p>
            <p
              className={`mt-2 font-mono text-3xl font-semibold tabular-nums ${
                activeBreaches.length > 0 ? 'text-red-700' : 'text-emerald-700'
              }`}
            >
              {activeBreaches.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {activeBreaches.length > 0 ? 'Unresolved exposures' : 'All exposures resolved'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">High-risk accounts</p>
            <p
              className={`mt-2 font-mono text-3xl font-semibold tabular-nums ${
                highRiskAccounts.length > 0 ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              {highRiskAccounts.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">Risk score 60 or above</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Alerts sent this month</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-slate-900 tabular-nums">
              {alertsSentCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">Email, Telegram &amp; WhatsApp</p>
          </div>
        </div>
      )}

      {/* Main Split: Monitored Emails Table + Live Activity Log */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Monitored Emails Table */}
        <div className="xl:col-span-8 rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search email, staff name, or desk..."
                className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-sm text-slate-900 focus:border-blue-800 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              {(['all', 'breached', 'at_risk', 'safe'] as const).map((tab) => {
                const label =
                  tab === 'all'
                    ? 'All'
                    : tab === 'breached'
                      ? 'Breached'
                      : tab === 'at_risk'
                        ? 'At Risk'
                        : 'Safe';
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setStatusFilter(tab)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      statusFilter === tab
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3, 4].map((row) => (
                <div key={row} className="h-11 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <ShieldCheck className="mx-auto h-9 w-9 text-slate-400" aria-hidden="true" />
              <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
                {emails.length === 0
                  ? 'No team emails monitored yet'
                  : 'No accounts match this filter'}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {emails.length === 0
                  ? 'Add your first staff email or upload a CSV list to start 24/7 credential checks.'
                  : 'Try clearing the search box or switching to All accounts.'}
              </p>
              {emails.length === 0 && (
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add first email
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Account</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Risk score</th>
                    <th className="px-4 py-3">Last breach</th>
                    <th className="px-4 py-3">Next scan</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredEmails.map((row) => {
                    const countdown = countdownMap[row.id] ?? row.nextScanSeconds;
                    const barColor =
                      row.riskScore >= 75
                        ? 'bg-red-600'
                        : row.riskScore >= 40
                          ? 'bg-amber-500'
                          : 'bg-emerald-600';

                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedEmail(row)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-slate-900">{row.email}</div>
                          <div className="text-xs text-slate-500">
                            {row.ownerName} · {row.department}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <EmailStatusLabel status={row.status} />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className={`h-full rounded-full ${barColor}`}
                                style={{ width: `${row.riskScore}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                              {row.riskScore}/100
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                          {row.lastBreachDate || 'None'}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-mono text-xs text-slate-900 tabular-nums">
                            {formatCountdown(countdown)}
                          </div>
                          <div className="text-[11px] text-slate-500 whitespace-nowrap">
                            Scanned {new Date(row.lastScannedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td
                          className="px-5 py-3.5 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleScanNow(row.id)}
                            disabled={scanningId === row.id}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap cursor-pointer"
                          >
                            <RefreshCw
                              className={`h-3 w-3 ${scanningId === row.id ? 'animate-spin' : ''}`}
                              aria-hidden="true"
                            />
                            {scanningId === row.id ? 'Scanning' : 'Scan now'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Live Activity Log */}
        <div className="xl:col-span-4 rounded-xl border border-slate-200 bg-white flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">Activity log</h2>
              <p className="text-xs text-slate-500">Latest breach lookups &amp; alert dispatches</p>
            </div>
            <button
              type="button"
              onClick={() => setLivePaused((p) => !p)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              {livePaused ? (
                <>
                  <Play className="h-3 w-3" /> Resume timers
                </>
              ) : (
                <>
                  <Pause className="h-3 w-3" /> Pause timers
                </>
              )}
            </button>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[460px]">
            {activityLogs.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">No activity recorded yet.</p>
            ) : (
              activityLogs.slice(0, 12).map((entry) => (
                <div key={entry.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <SeverityLabel severity={entry.severity} />
                    <span className="font-mono text-xs text-slate-400 tabular-nums">
                      {entry.timestamp}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs font-semibold text-slate-900 truncate">
                    {entry.email}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{entry.summary}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Email Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-display text-lg font-bold text-slate-900">
                Add monitored email
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {addError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddEmail} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700">Work email address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={`accounts@${organization.domain}`}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Staff member or shared desk
                </label>
                <input
                  type="text"
                  value={newOwner}
                  onChange={(e) => setNewOwner(e.target.value)}
                  placeholder="Priya Nair"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Department</label>
                <input
                  type="text"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  placeholder="Billing / Admin"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-800 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingEmail}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60 cursor-pointer"
                >
                  {addingEmail && <Loader2 className="h-4 w-4 animate-spin" />}
                  Add &amp; scan now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Upload Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-display text-lg font-bold text-slate-900">
                Bulk CSV email import
              </h3>
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-600">
              Upload a CSV file or paste rows formatted as{' '}
              <span className="font-mono text-slate-800">email,owner_name,department</span>. Each
              address is scanned immediately for historical credential exposures.
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100 cursor-pointer">
                <Upload className="h-3.5 w-3.5" />
                Choose .csv file
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvFileChange}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleDownloadSampleCsv}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-800 hover:underline cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Download sample CSV
              </button>
            </div>

            {csvError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {csvError}
              </div>
            )}
            {csvStatus && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                {csvStatus}
              </div>
            )}

            <form onSubmit={handleBulkImport} className="mt-3 space-y-4">
              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={`email,owner_name,department\nfinance@${organization.domain},Meera Nair,Accounts\nsales@${organization.domain},Rahul Menon,Sales`}
                className="w-full rounded-lg border border-slate-300 p-3 font-mono text-xs text-slate-900 focus:border-blue-800 focus:outline-none"
              />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCsvModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={uploadingCsv}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60 cursor-pointer"
                >
                  {uploadingCsv && <Loader2 className="h-4 w-4 animate-spin" />}
                  Import &amp; scan all
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Detail Slide-Over Drawer */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/35">
          <div className="flex h-full w-full max-w-xl flex-col bg-white border-l border-slate-200 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <EmailStatusLabel status={selectedEmail.status} />
                  <span className="font-mono text-xs text-slate-500 tabular-nums">
                    Risk Score: {selectedEmail.riskScore}/100
                  </span>
                </div>
                <h2 className="mt-2 truncate font-display text-xl font-bold text-slate-900">
                  {selectedEmail.email}
                </h2>
                <p className="mt-0.5 text-xs text-slate-600">
                  {selectedEmail.ownerName} · {selectedEmail.department}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmail(null)}
                aria-label="Close drawer"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                BreachRadar displays breach metadata only. Plaintext passwords are never stored or
                retrieved.
              </div>

              {selectedEmailBreaches.length === 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-6 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-700" aria-hidden="true" />
                  <h3 className="mt-2 font-display text-base font-semibold text-slate-900">
                    No credential exposures found
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    This email address has not appeared in any monitored third-party breach databases.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-display text-sm font-semibold text-slate-900">
                    Breach events ({selectedEmailBreaches.length})
                  </h3>

                  {selectedEmailBreaches.map((breach) => (
                    <div
                      key={breach.id}
                      className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h4 className="font-display text-base font-bold text-slate-900">
                            {breach.breachName}
                          </h4>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Breach date: <span className="font-mono">{breach.breachDate}</span> ·
                            Source: {breach.sourceDomain}
                          </p>
                        </div>
                        {breach.resolved ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Resolved
                          </span>
                        ) : (
                          <SeverityLabel severity={breach.severity} />
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-700">Exposed data types</p>
                        <p className="mt-1 text-xs text-slate-600">
                          {breach.exposedDataTypes.join(' · ')}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-700">What this means</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-700">
                          {breach.summaryPlainLanguage}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-700">Recommended actions</p>
                        <ul className="mt-1.5 space-y-1.5 text-xs text-slate-700">
                          {breach.recommendedActions.map((act) => (
                            <li key={act} className="flex items-start gap-2">
                              <AlertTriangle
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600"
                                aria-hidden="true"
                              />
                              <span>{act}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {!breach.resolved && (
                        <div className="border-t border-slate-100 pt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleResolveBreach(breach.id)}
                            disabled={resolvingBreachId === breach.id}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-60 cursor-pointer"
                          >
                            {resolvingBreachId === breach.id && (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            )}
                            Mark password rotated &amp; resolved
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
