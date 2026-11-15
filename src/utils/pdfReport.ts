import { jsPDF } from 'jspdf';
import { MonthlyReportData } from '../types/breachRadar';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [30, 64, 175];
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [Number.isNaN(r) ? 30 : r, Number.isNaN(g) ? 64 : g, Number.isNaN(b) ? 175 : b];
}

export function downloadMonthlyReportPdf(report: MonthlyReportData, whiteLabelName?: string): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const [r, g, b] = hexToRgb(report.organization.brandColor || '#1E40AF');

  // Top brand accent strip
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(whiteLabelName || 'BreachRadar', 48, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Monthly Credential Exposure & Security Summary', 48, 70);
  doc.text(`Period: ${report.reportPeriod}`, pageWidth - 48, 52, { align: 'right' });
  doc.text(`Generated: ${new Date(report.generatedAt).toLocaleDateString('en-IN')}`, pageWidth - 48, 68, {
    align: 'right',
  });

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(48, 86, pageWidth - 48, 86);

  // Organization Block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(report.organization.name, 48, 112);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `${report.organization.industry}  |  ${report.organization.city}  |  Domain: ${report.organization.domain}`,
    48,
    129
  );

  // KPI Grid (4 clean boxes)
  const kpis = [
    { label: 'Monitored Emails', value: String(report.totalMonitored) },
    { label: 'Active Breaches', value: String(report.activeBreaches) },
    { label: 'High-Risk Accounts', value: String(report.highRiskCount) },
    { label: 'Org Risk Score', value: `${report.averageRiskScore}/100` },
  ];

  const boxWidth = (pageWidth - 96 - 36) / 4;
  kpis.forEach((kpi, i) => {
    const x = 48 + i * (boxWidth + 12);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, 150, boxWidth, 62, 6, 6, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 12, 170);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, x + 12, 196);
  });

  // Plain-Language Owner Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Owner Summary (Plain Language)', 48, 244);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(51, 65, 85);
  const summaryLines = doc.splitTextToSize(report.plainLanguageSummary, pageWidth - 96);
  doc.text(summaryLines, 48, 264);

  let cursorY = 264 + summaryLines.length * 15 + 24;

  // Top 5 Risky Accounts Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Top 5 Risky Accounts Requiring Action', 48, cursorY);
  cursorY += 16;

  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(48, cursorY, pageWidth - 96, 24, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Email Address', 58, cursorY + 15);
  doc.text('Staff Member', 235, cursorY + 15);
  doc.text('Status', 360, cursorY + 15);
  doc.text('Risk Score', pageWidth - 58, cursorY + 15, { align: 'right' });
  cursorY += 24;

  report.topRiskyAccounts.forEach((acc) => {
    doc.setDrawColor(226, 232, 240);
    doc.line(48, cursorY + 26, pageWidth - 48, cursorY + 26);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(acc.email, 58, cursorY + 17);
    doc.setTextColor(71, 85, 105);
    doc.text(`${acc.ownerName} (${acc.department})`, 235, cursorY + 17);

    const statusLabel =
      acc.status === 'breached' ? 'Breached' : acc.status === 'at_risk' ? 'At Risk' : 'Safe';
    if (acc.status === 'breached') doc.setTextColor(185, 28, 28);
    else if (acc.status === 'at_risk') doc.setTextColor(180, 83, 9);
    else doc.setTextColor(21, 128, 61);

    doc.setFont('helvetica', 'bold');
    doc.text(statusLabel, 360, cursorY + 17);
    doc.setTextColor(15, 23, 42);
    doc.text(`${acc.riskScore}/100`, pageWidth - 58, cursorY + 17, { align: 'right' });
    cursorY += 26;
  });

  // Footer DPDP Compliance Notice
  cursorY += 32;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(48, cursorY, pageWidth - 96, 60, 6, 6, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('DPDP Act 2023 Safeguard & Zero-Password Notice', 60, cursorY + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'This report is generated by India-based credential monitoring. BreachRadar never stores or displays plaintext passwords—only breach metadata to assist with timely remediation and DPDP compliance documentation.',
    60,
    cursorY + 35,
    { maxWidth: pageWidth - 120 }
  );

  const safeSlug = report.organization.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  doc.save(`breach-report-${safeSlug}-nov-2026.pdf`);
}
