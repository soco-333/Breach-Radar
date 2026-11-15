import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Mail, MessageSquare, Send } from 'lucide-react';
import { breachApi } from '../services/breachApi';
import {
  AlertDelivery,
  AlertSettings,
  AlertThreshold,
  Organization,
} from '../types/breachRadar';
import { SeverityLabel } from './StatusIndicator';

interface AlertsSettingsViewProps {
  organization: Organization;
  onRefresh: () => Promise<void>;
}

export function AlertsSettingsView({ organization, onRefresh }: AlertsSettingsViewProps) {
  const [settings, setSettings] = useState<AlertSettings | null>(null);
  const [deliveries, setDeliveries] = useState<AlertDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      breachApi.getAlertSettings(organization.id),
      breachApi.listAlertDeliveries(organization.id),
    ]).then(([loadedSettings, loadedDeliveries]) => {
      if (!active) return;
      setSettings(loadedSettings);
      setDeliveries(loadedDeliveries);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [organization.id]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setBanner(null);

    if (
      settings.channels.email.enabled &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.channels.email.target.trim())
    ) {
      setBanner({ type: 'error', text: 'Enter a valid email address for Email alerts.' });
      return;
    }
    if (
      settings.channels.telegram.enabled &&
      settings.channels.telegram.chatHandle.trim().length < 3
    ) {
      setBanner({ type: 'error', text: 'Enter a Telegram handle or group chat ID.' });
      return;
    }
    if (
      settings.channels.whatsapp.enabled &&
      settings.channels.whatsapp.phone.replace(/\D/g, '').length < 10
    ) {
      setBanner({ type: 'error', text: 'Enter a valid 10-digit Indian WhatsApp number (+91).' });
      return;
    }

    setSaving(true);
    try {
      await breachApi.updateAlertSettings(settings);
      setBanner({ type: 'success', text: 'Alert routing rules saved for ' + organization.name + '.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (channel: 'email' | 'telegram' | 'whatsapp') => {
    setTestingChannel(channel);
    setBanner(null);
    try {
      const delivery = await breachApi.sendTestAlert(organization.id, channel);
      setDeliveries((prev) => [delivery, ...prev]);
      setBanner({
        type: 'success',
        text: `Test notification sent via ${
          channel === 'whatsapp' ? 'WhatsApp' : channel === 'telegram' ? 'Telegram' : 'Email'
        }.`,
      });
      await onRefresh();
    } finally {
      setTestingChannel(null);
    }
  };

  if (loading || !settings) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
        <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
          Alert settings — {organization.name}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Choose who gets notified when a staff credential surfaces in a breach and set your severity
          threshold.
        </p>
      </div>

      {banner && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium ${
            banner.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{banner.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Channels */}
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-200">
          <div className="px-6 py-4">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Notification channels
            </h2>
            <p className="text-xs text-slate-500">
              Plain-language alerts with zero technical jargon.
            </p>
          </div>

          {/* Email */}
          <div className="p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-700">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-sm font-semibold text-slate-900">
                    Email alerts
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.channels.email.enabled}
                    onClick={() =>
                      setSettings({
                        ...settings,
                        channels: {
                          ...settings.channels,
                          email: {
                            ...settings.channels.email,
                            enabled: !settings.channels.email.enabled,
                          },
                        },
                      })
                    }
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                      settings.channels.email.enabled ? 'bg-blue-800' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        settings.channels.email.enabled ? 'translate-x-4.5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Sent to the business owner or designated IT administrator.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:w-80">
              <input
                type="email"
                disabled={!settings.channels.email.enabled}
                value={settings.channels.email.target}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    channels: {
                      ...settings.channels,
                      email: { ...settings.channels.email, target: e.target.value },
                    },
                  })
                }
                placeholder={`owner@${organization.domain}`}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 focus:border-blue-800 focus:outline-none"
              />
              <button
                type="button"
                disabled={!settings.channels.email.enabled || testingChannel === 'email'}
                onClick={() => handleTest('email')}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap cursor-pointer"
              >
                {testingChannel === 'email' ? 'Sending...' : 'Test'}
              </button>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg border border-slate-200 bg-slate-50 p-2 text-emerald-700">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-sm font-semibold text-slate-900">
                    WhatsApp alerts
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.channels.whatsapp.enabled}
                    onClick={() =>
                      setSettings({
                        ...settings,
                        channels: {
                          ...settings.channels,
                          whatsapp: {
                            ...settings.channels.whatsapp,
                            enabled: !settings.channels.whatsapp.enabled,
                          },
                        },
                      })
                    }
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                      settings.channels.whatsapp.enabled ? 'bg-blue-800' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        settings.channels.whatsapp.enabled ? 'translate-x-4.5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Instant WhatsApp message to Indian mobile numbers (+91).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:w-80">
              <input
                type="tel"
                disabled={!settings.channels.whatsapp.enabled}
                value={settings.channels.whatsapp.phone}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    channels: {
                      ...settings.channels,
                      whatsapp: { ...settings.channels.whatsapp, phone: e.target.value },
                    },
                  })
                }
                placeholder="+91 98470 41290"
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-sm text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 focus:border-blue-800 focus:outline-none"
              />
              <button
                type="button"
                disabled={!settings.channels.whatsapp.enabled || testingChannel === 'whatsapp'}
                onClick={() => handleTest('whatsapp')}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap cursor-pointer"
              >
                {testingChannel === 'whatsapp' ? 'Sending...' : 'Test'}
              </button>
            </div>
          </div>

          {/* Telegram */}
          <div className="p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg border border-slate-200 bg-slate-50 p-2 text-blue-700">
                <Send className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-sm font-semibold text-slate-900">
                    Telegram alerts
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.channels.telegram.enabled}
                    onClick={() =>
                      setSettings({
                        ...settings,
                        channels: {
                          ...settings.channels,
                          telegram: {
                            ...settings.channels.telegram,
                            enabled: !settings.channels.telegram.enabled,
                          },
                        },
                      })
                    }
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                      settings.channels.telegram.enabled ? 'bg-blue-800' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        settings.channels.telegram.enabled ? 'translate-x-4.5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Route breach alerts into your IT team&apos;s Telegram group or bot.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:w-80">
              <input
                type="text"
                disabled={!settings.channels.telegram.enabled}
                value={settings.channels.telegram.chatHandle}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    channels: {
                      ...settings.channels,
                      telegram: { ...settings.channels.telegram, chatHandle: e.target.value },
                    },
                  })
                }
                placeholder="@your_it_alerts"
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-sm text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 focus:border-blue-800 focus:outline-none"
              />
              <button
                type="button"
                disabled={!settings.channels.telegram.enabled || testingChannel === 'telegram'}
                onClick={() => handleTest('telegram')}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap cursor-pointer"
              >
                {testingChannel === 'telegram' ? 'Sending...' : 'Test'}
              </button>
            </div>
          </div>
        </div>

        {/* Severity Threshold */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Alert threshold by severity
            </h2>
            <p className="text-xs text-slate-500">
              Avoid alert fatigue by choosing which breach levels trigger instant pings.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                {
                  id: 'critical',
                  title: 'Critical only',
                  desc: 'Plain/weak passwords or stealer logs',
                },
                {
                  id: 'high',
                  title: 'High & Critical',
                  desc: 'Password hashes or sensitive records',
                },
                {
                  id: 'medium',
                  title: 'Medium & above',
                  desc: 'Includes phone & address leaks',
                },
                {
                  id: 'all',
                  title: 'All breaches',
                  desc: 'Every match including newsletters',
                },
              ] as Array<{ id: AlertThreshold; title: string; desc: string }>
            ).map((opt) => {
              const selected = settings.severityThreshold === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSettings({ ...settings, severityThreshold: opt.id })}
                  className={`rounded-lg border p-3.5 text-left transition-colors cursor-pointer ${
                    selected
                      ? 'border-blue-800 bg-blue-50/50 ring-1 ring-blue-800'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{opt.title}</p>
                  <p className="mt-1 text-xs text-slate-600">{opt.desc}</p>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col justify-between gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium text-slate-700">Delivery cadence:</span>
              <select
                value={settings.digestFrequency}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    digestFrequency: e.target.value as 'instant' | 'daily',
                  })
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-800 focus:outline-none"
              >
                <option value="instant">Instant (under 60 seconds)</option>
                <option value="daily">Daily morning summary (09:00 IST)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{ backgroundColor: organization.brandColor }}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60 cursor-pointer"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save alert settings
            </button>
          </div>
        </div>
      </form>

      {/* Recent Deliveries */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Recent alert deliveries
          </h2>
        </div>

        {deliveries.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-500">
            No alerts dispatched yet for this organization. Use the Test buttons above to verify a
            channel.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <tr>
                  <th className="px-6 py-3">Channel</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-6 py-3 text-right">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {deliveries.map((d) => (
                  <tr key={d.id}>
                    <td className="px-6 py-3 font-medium capitalize text-slate-900">{d.channel}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{d.email}</td>
                    <td className="px-4 py-3">
                      <SeverityLabel severity={d.severity} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{d.message}</td>
                    <td className="px-6 py-3 text-right font-mono text-xs text-slate-500 whitespace-nowrap tabular-nums">
                      {new Date(d.sentAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
