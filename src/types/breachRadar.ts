export type PlanId = 'starter' | 'business' | 'msp';
export type BillingCycle = 'monthly' | 'yearly';
export type EmailStatus = 'safe' | 'at_risk' | 'breached' | 'scanning';
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';
export type AlertThreshold = 'all' | 'medium' | 'high' | 'critical';
export type UserRole = 'owner' | 'admin' | 'msp_admin';
export type WorkspaceTab = 'dashboard' | 'alerts' | 'reports' | 'msp' | 'billing' | 'security';

export interface StorageSecurityStatus {
  userPasswordHashAlgorithm: string;
  userPasswordHashPreview: string;
  emailEncryptionAlgorithm: string;
  encryptedEmailSample: {
    alg: string;
    keyId: string;
    iv: string;
    ciphertextPreview: string;
  } | null;
  totalEncryptedEmails: number;
  kAnonymityProtocol: string;
  leakedPasswordsStored: number;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  audience: string;
  monthlyPriceInr: number;
  yearlyPriceInr: number; // 2 months free (10x monthly)
  maxEmails: number | null; // null = unlimited
  maxClients: number | null; // null = unlimited
  pdfReports: boolean;
  whatsappTelegramAlerts: boolean;
  whiteLabel: boolean;
  highlights: string[];
}

export interface Organization {
  id: string;
  name: string;
  industry: string;
  city: string;
  domain: string;
  plan: PlanId;
  billingCycle: BillingCycle;
  brandColor: string;
  logoText: string;
  logoDataUrl?: string;
  mspManaged: boolean;
  gstin?: string;
  createdAt: string;
}

export interface User {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface MonitoredEmail {
  id: string;
  organizationId: string;
  email: string;
  ownerName: string;
  department: string;
  status: EmailStatus;
  riskScore: number; // 0 to 100
  lastBreachDate: string | null;
  lastScannedAt: string;
  nextScanSeconds: number;
  breachCount: number;
}

export interface BreachEvent {
  id: string;
  monitoredEmailId: string;
  organizationId: string;
  breachName: string;
  sourceDomain: string;
  breachDate: string;
  discoveredAt: string;
  severity: SeverityLevel;
  /** Strictly metadata descriptions (e.g. "Hashed password (bcrypt)", "Phone number") — never raw passwords. */
  exposedDataTypes: string[];
  summaryPlainLanguage: string;
  recommendedActions: string[];
  resolved: boolean;
  resolvedAt?: string;
}

export interface AlertSettings {
  organizationId: string;
  channels: {
    email: { enabled: boolean; target: string };
    telegram: { enabled: boolean; chatHandle: string };
    whatsapp: { enabled: boolean; phone: string };
  };
  severityThreshold: AlertThreshold;
  digestFrequency: 'instant' | 'daily';
}

export interface AlertDelivery {
  id: string;
  organizationId: string;
  monitoredEmailId: string;
  email: string;
  channel: 'email' | 'telegram' | 'whatsapp';
  severity: SeverityLevel;
  message: string;
  sentAt: string;
  status: 'delivered' | 'queued';
}

export interface ActivityLogEntry {
  id: string;
  organizationId: string;
  timestamp: string;
  severity: SeverityLevel | 'safe' | 'info';
  email: string;
  summary: string;
}

export interface RiskTrendPoint {
  month: string;
  avgRiskScore: number;
  activeBreaches: number;
}

export interface InvoiceRecord {
  id: string;
  organizationId: string;
  invoiceNumber: string;
  date: string;
  planName: string;
  amountInr: number;
  gstInr: number;
  totalInr: number;
  method: string;
  status: 'Paid';
}

export interface MonthlyReportData {
  organization: Organization;
  generatedAt: string;
  reportPeriod: string;
  totalMonitored: number;
  activeBreaches: number;
  highRiskCount: number;
  resolvedThisMonth: number;
  alertsSentThisMonth: number;
  averageRiskScore: number;
  plainLanguageSummary: string;
  trend: RiskTrendPoint[];
  topRiskyAccounts: MonitoredEmail[];
}
