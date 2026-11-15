import { ChangeEvent, FormEvent, useState } from 'react';
import {
  ArrowRightLeft,
  Check,
  Download,
  Loader2,
  Palette,
  Plus,
  Upload,
  X,
} from 'lucide-react';
import { breachApi } from '../services/breachApi';
import { MonitoredEmail, Organization } from '../types/breachRadar';
import { downloadMonthlyReportPdf } from '../utils/pdfReport';

interface MspViewProps {
  organizations: Organization[];
  activeOrg: Organization;
  allEmails: MonitoredEmail[];
  onSwitchOrganization: (orgId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const PRESET_COLORS = ['#1E40AF', '#0F4C81', '#0F766E', '#334155', '#7C2D12'];

export function MspView({
  organizations,
  activeOrg,
  allEmails,
  onSwitchOrganization,
  onRefresh,
}: MspViewProps) {
  const [brandName, setBrandName] = useState(activeOrg.name);
  const [brandColor, setBrandColor] = useState(activeOrg.brandColor);
  const [logoText, setLogoText] = useState(activeOrg.logoText);
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(activeOrg.logoDataUrl);
  const [savingBrand, setSavingBrand] = useState(false);
  const [brandSavedMsg, setBrandSavedMsg] = useState<string | null>(null);
  const [exportingOrgId, setExportingOrgId] = useState<string | null>(null);

  // Add client modal
  const [showAddClient, setShowAddClient] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientIndustry, setClientIndustry] = useState('Healthcare & Diagnostics');
  const [clientCity, setClientCity] = useState('');
  const [clientDomain, setClientDomain] = useState('');
  const [clientColor, setClientColor] = useState('#1E40AF');
  const [clientError, setClientError] = useState<string | null>(null);
  const [creatingClient, setCreatingClient] = useState(false);

  const handleSyncActiveBrand = (org: Organization) => {
    setBrandName(org.name);
    setBrandColor(org.brandColor);
    setLogoText(org.logoText);
    setLogoDataUrl(org.logoDataUrl);
    setBrandSavedMsg(null);
  };

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = async (e: FormEvent) => {
    e.preventDefault();
    setSavingBrand(true);
    setBrandSavedMsg(null);
    try {
      await breachApi.updateOrgBranding(activeOrg.id, {
        name: brandName.trim() || activeOrg.name,
        brandColor,
        logoText: logoText.trim().slice(0, 3).toUpperCase() || activeOrg.logoText,
        logoDataUrl,
      });
      await onRefresh();
      setBrandSavedMsg('White-label branding updated for active client & PDF reports.');
    } finally {
      setSavingBrand(false);
    }
  };

  const handleDownloadClientReport = async (org: Organization) => {
    setExportingOrgId(org.id);
    try {
      const data = await breachApi.getMonthlyReportData(org.id);
      downloadMonthlyReportPdf(data, `${org.name} Security Report`);
    } finally {
      setExportingOrgId(null);
    }
  };

  const handleCreateClient = async (e: FormEvent) => {
    e.preventDefault();
    setClientError(null);
    if (clientName.trim().length < 2) {
      setClientError('Enter client organization name.');
      return;
    }
    if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(clientDomain.trim())) {
      setClientError('Enter a valid company domain (e.g. apexclinic.in).');
      return;
    }
    setCreatingClient(true);
    try {
      const created = await breachApi.createClientOrganization({
        name: clientName,
        industry: clientIndustry,
        city: clientCity || 'Bengaluru, Karnataka',
        domain: clientDomain,
        brandColor: clientColor,
      });
      setClientName('');
      setClientCity('');
      setClientDomain('');
      setShowAddClient(false);
      await onRefresh();
      await onSwitchOrganization(created.id);
      handleSyncActiveBrand(created);
    } finally {
      setCreatingClient(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            MSP multi-client console
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage client organizations, switch active workspaces, customize white-label branding,
            and export per-client monthly reports.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setClientError(null);
            setShowAddClient(true);
          }}
          style={{ backgroundColor: activeOrg.brandColor }}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-95 whitespace-nowrap cursor-pointer"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add client organization
        </button>
      </div>

      {/* Client Organizations Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Managed client organizations ({organizations.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
              <tr>
                <th className="px-6 py-3">Client organization</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Monitored emails</th>
                <th className="px-4 py-3">Avg risk</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {organizations.map((org) => {
                const orgEmails = allEmails.filter((e) => e.organizationId === org.id);
                const avgRisk =
                  orgEmails.length > 0
                    ? Math.round(
                        orgEmails.reduce((sum, e) => sum + e.riskScore, 0) / orgEmails.length
                      )
                    : 0;
                const isActive = org.id === activeOrg.id;

                return (
                  <tr key={org.id} className={isActive ? 'bg-blue-50/40' : 'hover:bg-slate-50'}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {org.logoDataUrl ? (
                          <img
                            src={org.logoDataUrl}
                            alt={org.name}
                            className="h-9 w-9 rounded-lg object-cover border border-slate-200"
                          />
                        ) : (
                          <div
                            style={{ backgroundColor: org.brandColor }}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-display text-xs font-bold text-white"
                          >
                            {org.logoText}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 font-semibold text-slate-900">
                            <span>{org.name}</span>
                            {isActive && (
                              <span className="text-xs font-semibold text-blue-800">Active</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">
                            {org.industry} · {org.domain}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-600">{org.city}</td>
                    <td className="px-4 py-4 font-mono text-xs font-semibold text-slate-900 tabular-nums">
                      {orgEmails.length}
                    </td>
                    <td className="px-4 py-4 font-mono text-xs font-semibold tabular-nums">
                      <span
                        className={
                          avgRisk >= 60
                            ? 'text-red-700'
                            : avgRisk >= 35
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                        }
                      >
                        {avgRisk}/100
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadClientReport(org)}
                          disabled={exportingOrgId === org.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {exportingOrgId === org.id ? 'Exporting...' : 'Client PDF'}
                        </button>
                        {!isActive && (
                          <button
                            type="button"
                            onClick={async () => {
                              await onSwitchOrganization(org.id);
                              handleSyncActiveBrand(org);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap cursor-pointer"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                            Switch client
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* White-Label Branding Customizer */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <Palette className="h-5 w-5 text-blue-800" aria-hidden="true" />
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                White-label branding for {activeOrg.name}
              </h2>
              <p className="text-xs text-slate-500">
                Customize the workspace accent colour and client logo shown in the portal and monthly
                PDF reports.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSyncActiveBrand(activeOrg)}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Sync with active client
          </button>
        </div>

        {brandSavedMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800">
            <Check className="h-4 w-4" />
            {brandSavedMsg}
          </div>
        )}

        <form onSubmit={handleSaveBranding} className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Display organization / white-label name
              </label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-800 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Logo initials (2–3 letters)
                </label>
                <input
                  type="text"
                  maxLength={3}
                  value={logoText}
                  onChange={(e) => setLogoText(e.target.value.toUpperCase())}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 font-mono text-sm text-slate-900 focus:border-blue-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Upload custom logo (PNG/JPG)
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100 cursor-pointer">
                    <Upload className="h-3.5 w-3.5" />
                    Choose image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {logoDataUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoDataUrl(undefined)}
                      className="text-xs text-red-700 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Brand accent colour</label>
              <div className="mt-2 flex flex-wrap items-center gap-2.5">
                {PRESET_COLORS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setBrandColor(hex)}
                    style={{ backgroundColor: hex }}
                    aria-label={`Select color ${hex}`}
                    className={`h-8 w-8 rounded-lg border transition-transform cursor-pointer ${
                      brandColor.toLowerCase() === hex.toLowerCase()
                        ? 'ring-2 ring-offset-2 ring-slate-900 scale-105'
                        : 'border-slate-300'
                    }`}
                  />
                ))}
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  aria-label="Custom brand color picker"
                  className="h-8 w-12 rounded border border-slate-300 bg-white p-0.5 cursor-pointer"
                />
                <span className="font-mono text-xs text-slate-500">{brandColor}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingBrand}
              style={{ backgroundColor: brandColor }}
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60 cursor-pointer"
            >
              {savingBrand && <Loader2 className="h-4 w-4 animate-spin" />}
              Apply white-label theme
            </button>
          </div>

          {/* Live Portal Header Preview */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-slate-50 p-5 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Client portal &amp; PDF preview</p>
              <div className="mt-3 rounded-lg border border-slate-200 bg-white overflow-hidden">
                <div className="h-2 w-full" style={{ backgroundColor: brandColor }} />
                <div className="p-4 flex items-center gap-3">
                  {logoDataUrl ? (
                    <img
                      src={logoDataUrl}
                      alt="White-label preview"
                      className="h-10 w-10 rounded-lg object-cover border border-slate-200"
                    />
                  ) : (
                    <div
                      style={{ backgroundColor: brandColor }}
                      className="flex h-10 w-10 items-center justify-center rounded-lg font-display text-sm font-bold text-white"
                    >
                      {logoText || 'BR'}
                    </div>
                  )}
                  <div>
                    <p className="font-display text-sm font-bold text-slate-900">
                      {brandName || activeOrg.name}
                    </p>
                    <p className="text-xs text-slate-500">Credential Breach Monitoring Portal</p>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Changes apply immediately to this client&apos;s workspace buttons, charts, and exported
              PDF cover strip.
            </p>
          </div>
        </form>
      </div>

      {/* Add Client Modal */}
      {showAddClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-display text-lg font-bold text-slate-900">
                Onboard client organization
              </h3>
              <button
                type="button"
                onClick={() => setShowAddClient(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {clientError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {clientError}
              </div>
            )}

            <form onSubmit={handleCreateClient} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700">Client name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Apex Dental Studio"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Primary domain</label>
                <input
                  type="text"
                  value={clientDomain}
                  onChange={(e) => setClientDomain(e.target.value)}
                  placeholder="apexdental.in"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 font-mono text-sm text-slate-900 focus:border-blue-800 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Industry</label>
                  <select
                    value={clientIndustry}
                    onChange={(e) => setClientIndustry(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    <option>Healthcare &amp; Diagnostics</option>
                    <option>Chartered Accountants &amp; Tax</option>
                    <option>Manufacturing &amp; Exports</option>
                    <option>Retail &amp; Logistics</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">City</label>
                  <input
                    type="text"
                    value={clientCity}
                    onChange={(e) => setClientCity(e.target.value)}
                    placeholder="Kochi, Kerala"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Brand colour</label>
                <input
                  type="color"
                  value={clientColor}
                  onChange={(e) => setClientColor(e.target.value)}
                  className="mt-1 h-9 w-16 rounded border border-slate-300 p-0.5 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddClient(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingClient}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60 cursor-pointer"
                >
                  {creatingClient && <Loader2 className="h-4 w-4 animate-spin" />}
                  Add client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
