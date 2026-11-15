import {
  INITIAL_ACTIVITY_LOGS,
  INITIAL_ALERT_DELIVERIES,
  INITIAL_ALERT_SETTINGS,
  INITIAL_BREACH_EVENTS,
  INITIAL_INVOICES,
  INITIAL_MONITORED_EMAILS,
  INITIAL_ORGANIZATIONS,
  INITIAL_USER,
  PLANS,
  RISK_TREND_BY_ORG,
} from '../data/mockSeed';
import {
  ActivityLogEntry,
  AlertDelivery,
  AlertSettings,
  BillingCycle,
  BreachEvent,
  InvoiceRecord,
  MonitoredEmail,
  MonthlyReportData,
  Organization,
  PlanId,
  SeverityLevel,
  StorageSecurityStatus,
  User,
} from '../types/breachRadar';
import {
  Aes256EncryptedField,
  KAnonymityLookupResult,
  decryptEmailAes256,
  encryptEmailAes256,
  hashUserPasswordArgon2id,
  lookupPasswordKAnonymity,
  verifyUserPasswordArgon2id,
} from './cryptoSecurity';

/**
 * Clean async API boundary for BreachRadar.
 * Security controls enforced across storage & lookups:
 *   1. User authentication passwords hashed with Argon2id (RFC 9106 PHC format).
 *   2. Monitored email addresses encrypted at rest using AES-256-GCM (unique 96-bit IV per record).
 *   3. Leaked-password checks use SHA-1 k-anonymity (5-char prefix only); leaked passwords are never stored.
 */

const STORAGE_KEY = 'breachradar_state_v2';

interface PersistedMonitoredEmail extends Omit<MonitoredEmail, 'email'> {
  emailEncrypted: Aes256EncryptedField;
}

interface PersistedAlertDelivery extends Omit<AlertDelivery, 'email'> {
  emailEncrypted: Aes256EncryptedField;
}

interface PersistedActivityLogEntry extends Omit<ActivityLogEntry, 'email'> {
  emailEncrypted: Aes256EncryptedField;
}

interface StoredCredential {
  userId: string;
  email: string;
  name: string;
  organizationId: string;
  role: User['role'];
  passwordHashArgon2id: string;
}

interface PersistedEncryptedState {
  user: User | null;
  activeOrgId: string;
  credentials: Record<string, StoredCredential>;
  organizations: Organization[];
  emails: PersistedMonitoredEmail[];
  breaches: BreachEvent[];
  alertSettings: Record<string, AlertSettings>;
  alertDeliveries: PersistedAlertDelivery[];
  activityLogs: PersistedActivityLogEntry[];
  invoices: InvoiceRecord[];
}

interface DecryptedState {
  user: User | null;
  activeOrgId: string;
  credentials: Record<string, StoredCredential>;
  organizations: Organization[];
  emails: MonitoredEmail[];
  breaches: BreachEvent[];
  alertSettings: Record<string, AlertSettings>;
  alertDeliveries: AlertDelivery[];
  activityLogs: ActivityLogEntry[];
  invoices: InvoiceRecord[];
}

async function createInitialEncryptedState(): Promise<PersistedEncryptedState> {
  const demoArgonHash = await hashUserPasswordArgon2id('BreachRadar@2026');

  const emailsEncrypted = await Promise.all(
    INITIAL_MONITORED_EMAILS.map(async (item): Promise<PersistedMonitoredEmail> => {
      const { email, ...rest } = item;
      return { ...rest, emailEncrypted: await encryptEmailAes256(email) };
    })
  );

  const deliveriesEncrypted = await Promise.all(
    INITIAL_ALERT_DELIVERIES.map(async (item): Promise<PersistedAlertDelivery> => {
      const { email, ...rest } = item;
      return { ...rest, emailEncrypted: await encryptEmailAes256(email) };
    })
  );

  const logsEncrypted = await Promise.all(
    INITIAL_ACTIVITY_LOGS.map(async (item): Promise<PersistedActivityLogEntry> => {
      const { email, ...rest } = item;
      return { ...rest, emailEncrypted: await encryptEmailAes256(email) };
    })
  );

  return {
    user: null,
    activeOrgId: INITIAL_ORGANIZATIONS[0].id,
    credentials: {
      [INITIAL_USER.email.toLowerCase()]: {
        userId: INITIAL_USER.id,
        email: INITIAL_USER.email.toLowerCase(),
        name: INITIAL_USER.name,
        organizationId: INITIAL_USER.organizationId,
        role: INITIAL_USER.role,
        passwordHashArgon2id: demoArgonHash,
      },
    },
    organizations: INITIAL_ORGANIZATIONS,
    emails: emailsEncrypted,
    breaches: INITIAL_BREACH_EVENTS,
    alertSettings: INITIAL_ALERT_SETTINGS,
    alertDeliveries: deliveriesEncrypted,
    activityLogs: logsEncrypted,
    invoices: INITIAL_INVOICES,
  };
}

async function readRawEncryptedState(): Promise<PersistedEncryptedState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedEncryptedState;
      if (parsed.organizations && parsed.organizations.length > 0 && Array.isArray(parsed.emails)) {
        return parsed;
      }
    }
  } catch {
    // Fall back to re-seeding encrypted state
  }
  const fresh = await createInitialEncryptedState();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  } catch {
    // Ignore quota errors
  }
  return fresh;
}

async function loadState(): Promise<DecryptedState> {
  const persisted = await readRawEncryptedState();

  const emails = await Promise.all(
    persisted.emails.map(async ({ emailEncrypted, ...rest }): Promise<MonitoredEmail> => ({
      ...rest,
      email: await decryptEmailAes256(emailEncrypted),
    }))
  );

  const alertDeliveries = await Promise.all(
    persisted.alertDeliveries.map(
      async ({ emailEncrypted, ...rest }): Promise<AlertDelivery> => ({
        ...rest,
        email: await decryptEmailAes256(emailEncrypted),
      })
    )
  );

  const activityLogs = await Promise.all(
    persisted.activityLogs.map(
      async ({ emailEncrypted, ...rest }): Promise<ActivityLogEntry> => ({
        ...rest,
        email: await decryptEmailAes256(emailEncrypted),
      })
    )
  );

  return {
    ...persisted,
    emails,
    alertDeliveries,
    activityLogs,
  };
}

async function saveState(state: DecryptedState): Promise<void> {
  const emailsEncrypted = await Promise.all(
    state.emails.map(async ({ email, ...rest }): Promise<PersistedMonitoredEmail> => ({
      ...rest,
      emailEncrypted: await encryptEmailAes256(email),
    }))
  );

  const deliveriesEncrypted = await Promise.all(
    state.alertDeliveries.map(
      async ({ email, ...rest }): Promise<PersistedAlertDelivery> => ({
        ...rest,
        emailEncrypted: await encryptEmailAes256(email),
      })
    )
  );

  const logsEncrypted = await Promise.all(
    state.activityLogs.map(
      async ({ email, ...rest }): Promise<PersistedActivityLogEntry> => ({
        ...rest,
        emailEncrypted: await encryptEmailAes256(email),
      })
    )
  );

  const payload: PersistedEncryptedState = {
    ...state,
    emails: emailsEncrypted,
    alertDeliveries: deliveriesEncrypted,
    activityLogs: logsEncrypted,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors in sandboxed iframes
  }
}

function delay(ms = 180): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowTimeLabel(): string {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
}

const SYNTHETIC_BREACH_CATALOG: Array<{
  breachName: string;
  sourceDomain: string;
  breachDate: string;
  severity: SeverityLevel;
  exposedDataTypes: string[];
  summaryPlainLanguage: string;
  recommendedActions: string[];
}> = [
  {
    breachName: 'IndiaB2B Vendor Directory Leak',
    sourceDomain: 'indiab2b-vendors.example',
    breachDate: '2026-09-17',
    severity: 'high',
    exposedDataTypes: ['Email address', 'Hashed password (SHA-256)', 'Business mobile number'],
    summaryPlainLanguage:
      'This email address appeared in a third-party B2B vendor portal leak. If your team reused that portal password on Google Workspace or Microsoft 365, change it immediately.',
    recommendedActions: [
      'Update the mailbox password to a unique 14+ character passphrase.',
      'Confirm 2-step verification is active on this account.',
    ],
  },
  {
    breachName: 'GSTConnect Utility Credential Dump',
    sourceDomain: 'gstconnect-tools.example',
    breachDate: '2026-10-29',
    severity: 'critical',
    exposedDataTypes: [
      'Email address',
      'Credential pair metadata (breach count only — no password stored)',
      'Office city',
    ],
    summaryPlainLanguage:
      'Credential metadata for this email was discovered in an infostealer log tied to a desktop browser session. Treat the password as compromised and sign out active sessions.',
    recommendedActions: [
      'Reset the password immediately from a trusted device.',
      'Revoke all active sessions in your mail admin console.',
      'Run an endpoint malware check on the staff laptop.',
    ],
  },
  {
    breachName: 'TradeExpo Registration Archive',
    sourceDomain: 'tradeexpo-in.example',
    breachDate: '2026-04-11',
    severity: 'medium',
    exposedDataTypes: ['Email address', 'Full name', 'Company designation'],
    summaryPlainLanguage:
      'Only contact and designation details were leaked—no password was exposed. Be alert for targeted phishing emails using your staff member’s job title.',
    recommendedActions: [
      'Remind this staff member to double-check sender domains on urgent invoice or KYC emails.',
    ],
  },
];

function evaluateSyntheticLookup(email: string): typeof SYNTHETIC_BREACH_CATALOG[number] | null {
  const lower = email.toLowerCase();
  if (
    lower.includes('billing') ||
    lower.includes('gst') ||
    lower.includes('admin') ||
    lower.includes('finance') ||
    lower.includes('accounts') ||
    lower.includes('pharmacy') ||
    lower.includes('export')
  ) {
    return SYNTHETIC_BREACH_CATALOG[1];
  }
  if (
    lower.includes('support') ||
    lower.includes('sales') ||
    lower.includes('hr') ||
    lower.includes('lab')
  ) {
    return SYNTHETIC_BREACH_CATALOG[0];
  }
  const hash = Array.from(lower).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  if (hash % 3 === 0) {
    return SYNTHETIC_BREACH_CATALOG[2];
  }
  return null;
}

export const breachApi = {
  async getSession(): Promise<{ user: User | null; activeOrgId: string }> {
    const state = await loadState();
    return { user: state.user, activeOrgId: state.activeOrgId };
  },

  async login(email: string, password: string): Promise<{ user: User; activeOrgId: string }> {
    await delay(180);
    const state = await loadState();
    const cleanEmail = email.trim().toLowerCase();
    const existingCred = state.credentials[cleanEmail];

    if (existingCred) {
      const valid = await verifyUserPasswordArgon2id(password, existingCred.passwordHashArgon2id);
      if (!valid) {
        throw new Error('Invalid email or password (Argon2id verification failed).');
      }
      const user: User = {
        id: existingCred.userId,
        organizationId: existingCred.organizationId,
        name: existingCred.name,
        email: existingCred.email,
        role: existingCred.role,
      };
      state.user = user;
      state.activeOrgId = existingCred.organizationId;
      await saveState(state);
      return { user, activeOrgId: state.activeOrgId };
    }

    // First-time sign-in for convenience on demo domains: provision Argon2id credential
    const matchedOrg =
      state.organizations.find((o) => cleanEmail.endsWith(o.domain.toLowerCase())) ||
      state.organizations[0];
    const argonHash = await hashUserPasswordArgon2id(password);
    const userId = `usr_${Date.now()}`;
    const displayName =
      cleanEmail
        .split('@')[0]
        .replace(/[._]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Admin User';

    state.credentials[cleanEmail] = {
      userId,
      email: cleanEmail,
      name: displayName,
      organizationId: matchedOrg.id,
      role: 'msp_admin',
      passwordHashArgon2id: argonHash,
    };

    const user: User = {
      id: userId,
      organizationId: matchedOrg.id,
      name: displayName,
      email: cleanEmail,
      role: 'msp_admin',
    };
    state.user = user;
    state.activeOrgId = matchedOrg.id;
    await saveState(state);
    return { user, activeOrgId: state.activeOrgId };
  },

  async signup(payload: {
    name: string;
    email: string;
    password: string;
    organizationName: string;
    industry: string;
    city: string;
    plan?: PlanId;
  }): Promise<{ user: User; organization: Organization }> {
    await delay(220);
    const state = await loadState();
    const cleanEmail = payload.email.trim().toLowerCase();

    if (state.credentials[cleanEmail]) {
      throw new Error('An account with this email already exists. Please sign in.');
    }

    const passwordHashArgon2id = await hashUserPasswordArgon2id(payload.password);

    const domain = cleanEmail.split('@')[1] || 'company.in';
    const orgId = `org_${Date.now()}`;
    const initials = payload.organizationName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('');

    const newOrg: Organization = {
      id: orgId,
      name: payload.organizationName.trim(),
      industry: payload.industry,
      city: payload.city.trim() || 'Bengaluru, Karnataka',
      domain,
      plan: payload.plan || 'business',
      billingCycle: 'monthly',
      brandColor: '#1E40AF',
      logoText: initials || 'BR',
      mspManaged: payload.plan === 'msp',
      createdAt: new Date().toISOString(),
    };

    const userId = `usr_${Date.now()}`;
    const newUser: User = {
      id: userId,
      organizationId: orgId,
      name: payload.name.trim(),
      email: cleanEmail,
      role: payload.plan === 'msp' ? 'msp_admin' : 'owner',
    };

    state.credentials[cleanEmail] = {
      userId,
      email: cleanEmail,
      name: newUser.name,
      organizationId: orgId,
      role: newUser.role,
      passwordHashArgon2id,
    };

    const initialEmailRecord: MonitoredEmail = {
      id: `em_${Date.now()}`,
      organizationId: orgId,
      email: cleanEmail,
      ownerName: payload.name.trim(),
      department: 'Management',
      status: 'safe',
      riskScore: 10,
      lastBreachDate: null,
      lastScannedAt: new Date().toISOString(),
      nextScanSeconds: 300,
      breachCount: 0,
    };

    state.organizations = [newOrg, ...state.organizations];
    state.emails = [initialEmailRecord, ...state.emails];
    state.alertSettings[orgId] = {
      organizationId: orgId,
      channels: {
        email: { enabled: true, target: cleanEmail },
        telegram: { enabled: false, chatHandle: '' },
        whatsapp: { enabled: false, phone: '+91 ' },
      },
      severityThreshold: 'high',
      digestFrequency: 'instant',
    };
    state.activityLogs = [
      {
        id: `act_${Date.now()}`,
        organizationId: orgId,
        timestamp: nowTimeLabel(),
        severity: 'info',
        email: cleanEmail,
        summary: `Workspace created for ${newOrg.name} · Password hashed with Argon2id, emails encrypted with AES-256`,
      },
      ...state.activityLogs,
    ];
    state.user = newUser;
    state.activeOrgId = orgId;
    await saveState(state);
    return { user: newUser, organization: newOrg };
  },

  async loginDemo(orgId = 'org_malabar'): Promise<{ user: User; activeOrgId: string }> {
    await delay(140);
    const state = await loadState();
    state.user = { ...INITIAL_USER, organizationId: orgId };
    state.activeOrgId = orgId;
    await saveState(state);
    return { user: state.user, activeOrgId: orgId };
  },

  async logout(): Promise<void> {
    const state = await loadState();
    state.user = null;
    await saveState(state);
  },

  async listOrganizations(): Promise<Organization[]> {
    const state = await loadState();
    return state.organizations;
  },

  async switchOrganization(orgId: string): Promise<Organization> {
    await delay(100);
    const state = await loadState();
    const org = state.organizations.find((o) => o.id === orgId);
    if (!org) throw new Error('Organization not found');
    state.activeOrgId = orgId;
    await saveState(state);
    return org;
  },

  async createClientOrganization(payload: {
    name: string;
    industry: string;
    city: string;
    domain: string;
    brandColor: string;
  }): Promise<Organization> {
    await delay(220);
    const state = await loadState();
    const orgId = `org_${Date.now()}`;
    const initials = payload.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('');

    const org: Organization = {
      id: orgId,
      name: payload.name.trim(),
      industry: payload.industry,
      city: payload.city.trim(),
      domain: payload.domain.trim().toLowerCase(),
      plan: 'msp',
      billingCycle: 'yearly',
      brandColor: payload.brandColor || '#1E40AF',
      logoText: initials || 'CL',
      mspManaged: true,
      createdAt: new Date().toISOString(),
    };

    state.organizations = [...state.organizations, org];
    state.alertSettings[orgId] = {
      organizationId: orgId,
      channels: {
        email: { enabled: true, target: `security@${org.domain}` },
        telegram: { enabled: false, chatHandle: '' },
        whatsapp: { enabled: false, phone: '' },
      },
      severityThreshold: 'high',
      digestFrequency: 'instant',
    };
    state.activityLogs = [
      {
        id: `act_${Date.now()}`,
        organizationId: orgId,
        timestamp: nowTimeLabel(),
        severity: 'info',
        email: `security@${org.domain}`,
        summary: `Client organization ${org.name} onboarded under MSP management`,
      },
      ...state.activityLogs,
    ];
    await saveState(state);
    return org;
  },

  async updateOrgBranding(
    orgId: string,
    updates: { brandColor?: string; logoText?: string; logoDataUrl?: string; name?: string }
  ): Promise<Organization> {
    await delay(160);
    const state = await loadState();
    const idx = state.organizations.findIndex((o) => o.id === orgId);
    if (idx === -1) throw new Error('Organization not found');
    state.organizations[idx] = { ...state.organizations[idx], ...updates };
    await saveState(state);
    return state.organizations[idx];
  },

  async listMonitoredEmails(orgId: string): Promise<MonitoredEmail[]> {
    const state = await loadState();
    return state.emails.filter((e) => e.organizationId === orgId);
  },

  async listAllOrgEmails(): Promise<MonitoredEmail[]> {
    const state = await loadState();
    return state.emails;
  },

  async listBreachesForOrg(orgId: string): Promise<BreachEvent[]> {
    const state = await loadState();
    return state.breaches.filter((b) => b.organizationId === orgId);
  },

  async listActivityLogs(orgId: string): Promise<ActivityLogEntry[]> {
    const state = await loadState();
    return state.activityLogs.filter((a) => a.organizationId === orgId);
  },

  async addMonitoredEmail(
    orgId: string,
    payload: { email: string; ownerName: string; department: string }
  ): Promise<{ emailRecord: MonitoredEmail; breachCreated: BreachEvent | null }> {
    await delay(240);
    const state = await loadState();
    const cleanEmail = payload.email.trim().toLowerCase();
    const duplicate = state.emails.find(
      (e) => e.organizationId === orgId && e.email.toLowerCase() === cleanEmail
    );
    if (duplicate) {
      throw new Error(`${cleanEmail} is already monitored in this organization.`);
    }

    const match = evaluateSyntheticLookup(cleanEmail);
    const emailId = `em_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    let breachCreated: BreachEvent | null = null;

    const riskScore = match
      ? match.severity === 'critical'
        ? 84
        : match.severity === 'high'
          ? 66
          : 44
      : 9;
    const status: MonitoredEmail['status'] = match
      ? match.severity === 'critical'
        ? 'breached'
        : 'at_risk'
      : 'safe';

    const emailRecord: MonitoredEmail = {
      id: emailId,
      organizationId: orgId,
      email: cleanEmail,
      ownerName: payload.ownerName.trim() || 'Team Member',
      department: payload.department.trim() || 'Operations',
      status,
      riskScore,
      lastBreachDate: match ? match.breachDate : null,
      lastScannedAt: new Date().toISOString(),
      nextScanSeconds: 180 + Math.floor(Math.random() * 180),
      breachCount: match ? 1 : 0,
    };

    state.emails = [emailRecord, ...state.emails];

    if (match) {
      breachCreated = {
        id: `br_${Date.now()}`,
        monitoredEmailId: emailId,
        organizationId: orgId,
        breachName: match.breachName,
        sourceDomain: match.sourceDomain,
        breachDate: match.breachDate,
        discoveredAt: new Date().toISOString(),
        severity: match.severity,
        exposedDataTypes: match.exposedDataTypes,
        summaryPlainLanguage: match.summaryPlainLanguage,
        recommendedActions: match.recommendedActions,
        resolved: false,
      };
      state.breaches = [breachCreated, ...state.breaches];
      state.activityLogs = [
        {
          id: `act_${Date.now()}`,
          organizationId: orgId,
          timestamp: nowTimeLabel(),
          severity: match.severity,
          email: cleanEmail,
          summary: `Initial scan matched ${match.breachName} · Alert queued`,
        },
        ...state.activityLogs,
      ];
    } else {
      state.activityLogs = [
        {
          id: `act_${Date.now()}`,
          organizationId: orgId,
          timestamp: nowTimeLabel(),
          severity: 'safe',
          email: cleanEmail,
          summary: 'Added & encrypted (AES-256-GCM) · Initial scan found 0 exposures',
        },
        ...state.activityLogs,
      ];
    }

    await saveState(state);
    return { emailRecord, breachCreated };
  },

  async bulkUploadEmails(
    orgId: string,
    rows: Array<{ email: string; ownerName: string; department: string }>
  ): Promise<{ added: number; skipped: number; breachesFound: number }> {
    await delay(320);
    const state = await loadState();
    let added = 0;
    let skipped = 0;
    let breachesFound = 0;

    for (const row of rows) {
      const cleanEmail = row.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        skipped++;
        continue;
      }
      const exists = state.emails.some(
        (e) => e.organizationId === orgId && e.email.toLowerCase() === cleanEmail
      );
      if (exists) {
        skipped++;
        continue;
      }

      const match = evaluateSyntheticLookup(cleanEmail);
      const emailId = `em_${Date.now()}_${added}_${Math.floor(Math.random() * 999)}`;
      const riskScore = match
        ? match.severity === 'critical'
          ? 82
          : match.severity === 'high'
            ? 64
            : 42
        : 10;

      state.emails.unshift({
        id: emailId,
        organizationId: orgId,
        email: cleanEmail,
        ownerName: row.ownerName.trim() || 'Staff Member',
        department: row.department.trim() || 'General',
        status: match ? (match.severity === 'critical' ? 'breached' : 'at_risk') : 'safe',
        riskScore,
        lastBreachDate: match ? match.breachDate : null,
        lastScannedAt: new Date().toISOString(),
        nextScanSeconds: 120 + Math.floor(Math.random() * 240),
        breachCount: match ? 1 : 0,
      });

      if (match) {
        breachesFound++;
        state.breaches.unshift({
          id: `br_${Date.now()}_${added}`,
          monitoredEmailId: emailId,
          organizationId: orgId,
          breachName: match.breachName,
          sourceDomain: match.sourceDomain,
          breachDate: match.breachDate,
          discoveredAt: new Date().toISOString(),
          severity: match.severity,
          exposedDataTypes: match.exposedDataTypes,
          summaryPlainLanguage: match.summaryPlainLanguage,
          recommendedActions: match.recommendedActions,
          resolved: false,
        });
      }
      added++;
    }

    if (added > 0) {
      state.activityLogs.unshift({
        id: `act_${Date.now()}`,
        organizationId: orgId,
        timestamp: nowTimeLabel(),
        severity: breachesFound > 0 ? 'high' : 'safe',
        email: `${added} accounts imported`,
        summary: `CSV import encrypted at rest · ${added} added, ${breachesFound} exposed accounts flagged`,
      });
    }

    await saveState(state);
    return { added, skipped, breachesFound };
  },

  async scanEmailNow(orgId: string, emailId: string): Promise<MonitoredEmail> {
    await delay(340);
    const state = await loadState();
    const idx = state.emails.findIndex((e) => e.id === emailId && e.organizationId === orgId);
    if (idx === -1) throw new Error('Monitored email not found');

    const target = state.emails[idx];
    target.lastScannedAt = new Date().toISOString();
    target.nextScanSeconds = 300;

    state.activityLogs.unshift({
      id: `act_${Date.now()}`,
      organizationId: orgId,
      timestamp: nowTimeLabel(),
      severity: target.status === 'breached' ? 'high' : 'safe',
      email: target.email,
      summary:
        target.status === 'safe'
          ? 'Manual breach feed lookup completed · No new exposures found'
          : 'Manual breach feed lookup completed · Active exposures remain unresolved',
    });

    await saveState(state);
    return target;
  },

  async getEmailBreaches(emailId: string): Promise<BreachEvent[]> {
    const state = await loadState();
    return state.breaches.filter((b) => b.monitoredEmailId === emailId);
  },

  async resolveBreachEvent(
    breachId: string
  ): Promise<{ breach: BreachEvent; updatedEmail: MonitoredEmail }> {
    await delay(180);
    const state = await loadState();
    const bIdx = state.breaches.findIndex((b) => b.id === breachId);
    if (bIdx === -1) throw new Error('Breach event not found');

    state.breaches[bIdx] = {
      ...state.breaches[bIdx],
      resolved: true,
      resolvedAt: new Date().toISOString(),
    };

    const emailId = state.breaches[bIdx].monitoredEmailId;
    const orgId = state.breaches[bIdx].organizationId;
    const eIdx = state.emails.findIndex((e) => e.id === emailId);
    const unresolvedForEmail = state.breaches.filter(
      (b) => b.monitoredEmailId === emailId && !b.resolved
    );

    if (eIdx !== -1) {
      const hasCritical = unresolvedForEmail.some((b) => b.severity === 'critical');
      const hasAny = unresolvedForEmail.length > 0;
      const newScore = !hasAny
        ? 12
        : hasCritical
          ? 78
          : Math.min(65, 30 + unresolvedForEmail.length * 16);

      state.emails[eIdx] = {
        ...state.emails[eIdx],
        status: !hasAny ? 'safe' : hasCritical ? 'breached' : 'at_risk',
        riskScore: newScore,
      };
    }

    state.activityLogs.unshift({
      id: `act_${Date.now()}`,
      organizationId: orgId,
      timestamp: nowTimeLabel(),
      severity: 'safe',
      email: state.emails[eIdx]?.email || 'Account',
      summary: `Marked "${state.breaches[bIdx].breachName}" as resolved after password rotation`,
    });

    await saveState(state);
    return { breach: state.breaches[bIdx], updatedEmail: state.emails[eIdx] };
  },

  async getAlertSettings(orgId: string): Promise<AlertSettings> {
    const state = await loadState();
    return (
      state.alertSettings[orgId] || {
        organizationId: orgId,
        channels: {
          email: { enabled: true, target: '' },
          telegram: { enabled: false, chatHandle: '' },
          whatsapp: { enabled: false, phone: '+91 ' },
        },
        severityThreshold: 'high',
        digestFrequency: 'instant',
      }
    );
  },

  async updateAlertSettings(settings: AlertSettings): Promise<AlertSettings> {
    await delay(180);
    const state = await loadState();
    state.alertSettings[settings.organizationId] = settings;
    await saveState(state);
    return settings;
  },

  async listAlertDeliveries(orgId: string): Promise<AlertDelivery[]> {
    const state = await loadState();
    return state.alertDeliveries.filter((d) => d.organizationId === orgId);
  },

  async sendTestAlert(
    orgId: string,
    channel: 'email' | 'telegram' | 'whatsapp'
  ): Promise<AlertDelivery> {
    await delay(240);
    const state = await loadState();
    const delivery: AlertDelivery = {
      id: `al_${Date.now()}`,
      organizationId: orgId,
      monitoredEmailId: 'test',
      email: state.emails.find((e) => e.organizationId === orgId)?.email || 'team@company.in',
      channel,
      severity: 'high',
      message: `Test alert verified for ${channel.toUpperCase()} delivery channel.`,
      sentAt: new Date().toISOString(),
      status: 'delivered',
    };
    state.alertDeliveries = [delivery, ...state.alertDeliveries];
    state.activityLogs.unshift({
      id: `act_${Date.now()}`,
      organizationId: orgId,
      timestamp: nowTimeLabel(),
      severity: 'info',
      email: delivery.email,
      summary: `Test notification delivered via ${
        channel === 'whatsapp' ? 'WhatsApp' : channel === 'telegram' ? 'Telegram' : 'Email'
      }`,
    });
    await saveState(state);
    return delivery;
  },

  async getMonthlyReportData(orgId: string): Promise<MonthlyReportData> {
    const state = await loadState();
    const org = state.organizations.find((o) => o.id === orgId) || state.organizations[0];
    const orgEmails = state.emails.filter((e) => e.organizationId === orgId);
    const orgBreaches = state.breaches.filter((b) => b.organizationId === orgId);
    const orgAlerts = state.alertDeliveries.filter((a) => a.organizationId === orgId);

    const activeBreaches = orgBreaches.filter((b) => !b.resolved).length;
    const resolvedThisMonth = orgBreaches.filter((b) => b.resolved).length;
    const highRiskCount = orgEmails.filter((e) => e.riskScore >= 60).length;
    const avgScore =
      orgEmails.length > 0
        ? Math.round(orgEmails.reduce((sum, e) => sum + e.riskScore, 0) / orgEmails.length)
        : 0;

    const topRiskyAccounts = [...orgEmails].sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);

    const plainLanguageSummary =
      activeBreaches === 0
        ? `Great news for ${org.name}: across all ${orgEmails.length} monitored company email addresses, no active unresolved credential leaks remain. Keep 2-step verification turned on for every inbox.`
        : `Across ${org.name}'s ${orgEmails.length} monitored company email addresses, ${activeBreaches} unresolved credential exposure${
            activeBreaches === 1 ? '' : 's'
          } require attention—affecting ${highRiskCount} high-risk account${
            highRiskCount === 1 ? '' : 's'
          }. None of your internal company servers were hacked directly; these leaks came from external vendor or third-party portals where staff used work emails. Resetting passwords on the top flagged accounts below will bring your risk score back into the safe zone.`;

    const baseTrend = RISK_TREND_BY_ORG[orgId] || [
      { month: 'Jun', avgRiskScore: 18, activeBreaches: 0 },
      { month: 'Jul', avgRiskScore: 22, activeBreaches: 1 },
      { month: 'Aug', avgRiskScore: 20, activeBreaches: 1 },
      { month: 'Sep', avgRiskScore: 28, activeBreaches: 1 },
      { month: 'Oct', avgRiskScore: Math.max(12, avgScore + 4), activeBreaches },
      { month: 'Nov', avgRiskScore: avgScore, activeBreaches },
    ];

    const trend = baseTrend.map((pt, idx) =>
      idx === baseTrend.length - 1 ? { ...pt, avgRiskScore: avgScore, activeBreaches } : pt
    );

    return {
      organization: org,
      generatedAt: new Date().toISOString(),
      reportPeriod: 'November 2026',
      totalMonitored: orgEmails.length,
      activeBreaches,
      highRiskCount,
      resolvedThisMonth,
      alertsSentThisMonth: orgAlerts.length,
      averageRiskScore: avgScore,
      plainLanguageSummary,
      trend,
      topRiskyAccounts,
    };
  },

  async listInvoices(orgId: string): Promise<InvoiceRecord[]> {
    const state = await loadState();
    return state.invoices.filter((inv) => inv.organizationId === orgId);
  },

  async upgradePlanCheckout(payload: {
    orgId: string;
    planId: PlanId;
    billingCycle: BillingCycle;
    paymentMethod: string;
    gstin?: string;
  }): Promise<{ organization: Organization; invoice: InvoiceRecord }> {
    await delay(750);
    const state = await loadState();
    const idx = state.organizations.findIndex((o) => o.id === payload.orgId);
    if (idx === -1) throw new Error('Organization not found');

    const plan = PLANS.find((p) => p.id === payload.planId) || PLANS[1];
    const amountInr =
      payload.billingCycle === 'yearly' ? plan.yearlyPriceInr : plan.monthlyPriceInr;
    const gstInr = Math.round(amountInr * 0.18);
    const totalInr = amountInr + gstInr;

    state.organizations[idx] = {
      ...state.organizations[idx],
      plan: payload.planId,
      billingCycle: payload.billingCycle,
      mspManaged: payload.planId === 'msp' ? true : state.organizations[idx].mspManaged,
      gstin: payload.gstin?.trim() || state.organizations[idx].gstin,
    };

    const invoice: InvoiceRecord = {
      id: `inv_${Date.now()}`,
      organizationId: payload.orgId,
      invoiceNumber: `BR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().slice(0, 10),
      planName: `${plan.name} Plan (${payload.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'})`,
      amountInr,
      gstInr,
      totalInr,
      method: payload.paymentMethod,
      status: 'Paid',
    };

    state.invoices = [invoice, ...state.invoices];
    await saveState(state);
    return { organization: state.organizations[idx], invoice };
  },

  /**
   * Ephemeral SHA-1 k-anonymity lookup for leaked passwords.
   * Never stores or logs the candidate password or full SHA-1 hash.
   */
  async checkPasswordExposureKAnonymity(
    candidatePassword: string
  ): Promise<KAnonymityLookupResult> {
    return lookupPasswordKAnonymity(candidatePassword);
  },

  /**
   * Inspect cryptographic protections directly from persisted encrypted state.
   */
  async getStorageSecurityStatus(orgId: string, userEmail: string): Promise<StorageSecurityStatus> {
    const rawState = await readRawEncryptedState();
    const orgEmails = rawState.emails.filter((e) => e.organizationId === orgId);
    const sample = orgEmails[0]?.emailEncrypted || rawState.emails[0]?.emailEncrypted || null;
    const cred =
      rawState.credentials[userEmail.toLowerCase()] ||
      Object.values(rawState.credentials)[0];

    const hashPreview = cred
      ? `${cred.passwordHashArgon2id.slice(0, 44)}...`
      : '$argon2id$v=19$m=16384,t=2,p=1$...';

    return {
      userPasswordHashAlgorithm: 'Argon2id (RFC 9106 · m=16384 KiB, t=2, p=1)',
      userPasswordHashPreview: hashPreview,
      emailEncryptionAlgorithm: 'AES-256-GCM (256-bit DEK · 96-bit random IV per record)',
      encryptedEmailSample: sample
        ? {
            alg: sample.alg,
            keyId: sample.keyId,
            iv: sample.iv,
            ciphertextPreview: `${sample.ciphertext.slice(0, 36)}...`,
          }
        : null,
      totalEncryptedEmails: rawState.emails.length,
      kAnonymityProtocol: 'SHA-1 k-Anonymity (5-character hex prefix only)',
      leakedPasswordsStored: 0,
    };
  },
};
