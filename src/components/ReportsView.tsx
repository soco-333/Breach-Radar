import { useEffect, useState } from 'react';
import { Download, FileCheck2 } from 'lucide-react';
import { breachApi } from '../services/breachApi';
import { MonthlyReportData, Organization } from '../types/breachRadar';
import { downloadMonthlyReportPdf } from '../utils/pdfReport';
import { EmailStatusLabel } from './StatusIndicator';

interface ReportsViewProps {
  organization: Organization;
}

export function ReportsView({ organization }: ReportsViewProps) {
  const [report, setReport] = useState<MonthlyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    breachApi.getMonthlyReportData(organization.id).then((data) => {
      if (!active) return;
      setReport(data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [organization.id]);

  if (loading || !report) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
        <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white" />
      </div>
    );
  }

  // SVG Risk Trend Chart coordinates
  const width = 640;
  const height = 220;
  const padLeft = 40;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const points = report.trend.map((pt, i) => {
    const x = padLeft + (i / Math.max(1, report.trend.length - 1)) * plotW;
    const y = padTop + plotH - (Math.min(100, Math.max(0, pt.avgRiskScore)) / 100) * plotH;
    return { ...pt, x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padTop + plotH} L ${points[0].x} ${
    padTop + plotH
  } Z`;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            Monthly security report — {organization.name}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {report.reportPeriod} · Plain-language executive summary for business owners
          </p>
        </div>

        <button
          type="button"
          onClick={() => downloadMonthlyReportPdf(report)}
          style={{ backgroundColor: organization.brandColor }}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 transition-opacity whitespace-nowrap cursor-pointer"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download PDF
        </button>
      </div>

      {/* Plain-Language Executive Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2 text-slate-900">
          <FileCheck2 className="h-5 w-5 text-blue-800" aria-hidden="true" />
          <h2 className="font-display text-base font-semibold">Owner summary</h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">{report.plainLanguageSummary}</p>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">Monitored emails</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {report.totalMonitored}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Active breaches</p>
            <p
              className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${
                report.activeBreaches > 0 ? 'text-red-700' : 'text-emerald-700'
              }`}
            >
              {report.activeBreaches}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Resolved this month</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-emerald-700 tabular-nums">
              {report.resolvedThisMonth}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Average risk score</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {report.averageRiskScore}/100
            </p>
          </div>
        </div>
      </div>

      {/* Risk Trend Chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              6-month organization risk trend
            </h2>
            <p className="text-xs text-slate-500">
              Average credential risk score (0 = safest, 100 = highest exposure)
            </p>
          </div>
          {hoverIndex !== null && points[hoverIndex] && (
            <div className="font-mono text-xs text-slate-700 tabular-nums">
              {points[hoverIndex].month} 2026: Score {points[hoverIndex].avgRiskScore}/100 ·{' '}
              {points[hoverIndex].activeBreaches} active breach
              {points[hoverIndex].activeBreaches === 1 ? '' : 'es'}
            </div>
          )}
        </div>

        <div className="mt-5 w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full min-w-[460px] h-56"
            role="img"
            aria-label="6-month risk score trend chart"
          >
            {[0, 25, 50, 75, 100].map((tick) => {
              const y = padTop + plotH - (tick / 100) * plotH;
              return (
                <g key={tick}>
                  <line
                    x1={padLeft}
                    x2={width - padRight}
                    y1={y}
                    y2={y}
                    stroke="#E2E8F0"
                    strokeDasharray={tick === 0 ? undefined : '4 4'}
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-slate-400 text-[10px] font-mono"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            <path d={areaPath} fill={organization.brandColor} fillOpacity="0.08" />
            <path
              d={linePath}
              fill="none"
              stroke={organization.brandColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {points.map((pt, idx) => (
              <g
                key={pt.month}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={hoverIndex === idx ? 6 : 4}
                  fill="#FFFFFF"
                  stroke={organization.brandColor}
                  strokeWidth="2.5"
                />
                <text
                  x={pt.x}
                  y={height - 10}
                  textAnchor="middle"
                  className="fill-slate-500 text-[11px] font-mono"
                >
                  {pt.month}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Top 5 Risky Accounts */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Top 5 risky accounts
          </h2>
          <p className="text-xs text-slate-500">
            Accounts prioritized for password rotation and 2-step verification review.
          </p>
        </div>

        {report.topRiskyAccounts.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-500">
            No monitored accounts yet for this organization.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <tr>
                  <th className="px-6 py-3">Rank</th>
                  <th className="px-4 py-3">Email address</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Risk score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {report.topRiskyAccounts.map((acc, index) => (
                  <tr key={acc.id}>
                    <td className="px-6 py-3.5 font-mono text-xs text-slate-500 tabular-nums">
                      0{index + 1}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-900">{acc.email}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {acc.ownerName} · {acc.department}
                    </td>
                    <td className="px-4 py-3.5">
                      <EmailStatusLabel status={acc.status} />
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono text-sm font-semibold text-slate-900 tabular-nums">
                      {acc.riskScore}/100
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
