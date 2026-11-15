import { AlertTriangle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import { EmailStatus, SeverityLevel } from '../types/breachRadar';

export function EmailStatusLabel({ status }: { status: EmailStatus }) {
  if (status === 'breached') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 whitespace-nowrap">
        <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Breached
      </span>
    );
  }
  if (status === 'at_risk') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 whitespace-nowrap">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        At Risk
      </span>
    );
  }
  if (status === 'scanning') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800 whitespace-nowrap">
        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Scanning
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 whitespace-nowrap">
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Safe
    </span>
  );
}

export function SeverityLabel({ severity }: { severity: SeverityLevel | 'safe' | 'info' }) {
  switch (severity) {
    case 'critical':
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 whitespace-nowrap">
          Critical
        </span>
      );
    case 'high':
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50/70 px-2 py-0.5 text-xs font-medium text-red-700 whitespace-nowrap">
          High
        </span>
      );
    case 'medium':
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 whitespace-nowrap">
          Medium
        </span>
      );
    case 'low':
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 whitespace-nowrap">
          Low
        </span>
      );
    case 'safe':
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 whitespace-nowrap">
          Safe
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800 whitespace-nowrap">
          Notice
        </span>
      );
  }
}

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}
