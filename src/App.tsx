import { useCallback, useEffect, useState } from 'react';
import { AlertsSettingsView } from './components/AlertsSettingsView';
import { AuthPage } from './components/AuthPage';
import { BillingView } from './components/BillingView';
import { DashboardView } from './components/DashboardView';
import { LandingPage } from './components/LandingPage';
import { MspView } from './components/MspView';
import { ReportsView } from './components/ReportsView';
import { SecurityView } from './components/SecurityView';
import { WorkspaceShell } from './components/WorkspaceShell';
import { breachApi } from './services/breachApi';
import {
  ActivityLogEntry,
  BreachEvent,
  MonitoredEmail,
  Organization,
  PlanId,
  User,
  WorkspaceTab,
} from './types/breachRadar';

type AppRoute = 'landing' | 'auth' | 'workspace';

export default function App() {
  const [route, setRoute] = useState<AppRoute>('landing');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [authPlan, setAuthPlan] = useState<PlanId>('business');

  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string>('org_malabar');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('dashboard');

  const [emails, setEmails] = useState<MonitoredEmail[]>([]);
  const [allEmails, setAllEmails] = useState<MonitoredEmail[]>([]);
  const [breaches, setBreaches] = useState<BreachEvent[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [alertsSentCount, setAlertsSentCount] = useState(0);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);

  const loadWorkspaceData = useCallback(async (orgIdOverride?: string) => {
    setLoadingWorkspace(true);
    try {
      const session = await breachApi.getSession();
      const orgList = await breachApi.listOrganizations();
      const targetOrgId = orgIdOverride || session.activeOrgId || orgList[0]?.id;

      const [orgEmails, everyEmail, orgBreaches, orgLogs, orgDeliveries] = await Promise.all([
        breachApi.listMonitoredEmails(targetOrgId),
        breachApi.listAllOrgEmails(),
        breachApi.listBreachesForOrg(targetOrgId),
        breachApi.listActivityLogs(targetOrgId),
        breachApi.listAlertDeliveries(targetOrgId),
      ]);

      setUser(session.user);
      setOrganizations(orgList);
      setActiveOrgId(targetOrgId);
      setEmails(orgEmails);
      setAllEmails(everyEmail);
      setBreaches(orgBreaches);
      setActivityLogs(orgLogs);
      setAlertsSentCount(orgDeliveries.length);
    } finally {
      setLoadingWorkspace(false);
    }
  }, []);

  useEffect(() => {
    breachApi.getSession().then((session) => {
      if (session.user) {
        setRoute('workspace');
        loadWorkspaceData(session.activeOrgId);
      }
    });
  }, [loadWorkspaceData]);

  const handleNavigateAuth = (mode: 'login' | 'signup', selectedPlan?: PlanId) => {
    setAuthMode(mode);
    if (selectedPlan) setAuthPlan(selectedPlan);
    setRoute('auth');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEnterDemo = async () => {
    const res = await breachApi.loginDemo('org_malabar');
    setUser(res.user);
    setActiveTab('dashboard');
    setRoute('workspace');
    await loadWorkspaceData(res.activeOrgId);
  };

  const handleAuthenticated = async () => {
    setActiveTab('dashboard');
    setRoute('workspace');
    await loadWorkspaceData();
  };

  const handleSwitchOrg = async (orgId: string) => {
    await breachApi.switchOrganization(orgId);
    await loadWorkspaceData(orgId);
  };

  const handleLogout = async () => {
    await breachApi.logout();
    setUser(null);
    setRoute('landing');
  };

  if (route === 'landing') {
    return <LandingPage onNavigateAuth={handleNavigateAuth} onEnterDemo={handleEnterDemo} />;
  }

  if (route === 'auth') {
    return (
      <AuthPage
        initialMode={authMode}
        initialPlan={authPlan}
        onBackToLanding={() => setRoute('landing')}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  const activeOrg =
    organizations.find((o) => o.id === activeOrgId) || organizations[0];

  if (!user || !activeOrg) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-sm font-medium text-slate-600">Loading workspace...</div>
      </div>
    );
  }

  return (
    <WorkspaceShell
      user={user}
      organizations={organizations}
      activeOrg={activeOrg}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onSwitchOrg={handleSwitchOrg}
      onLogout={handleLogout}
    >
      {activeTab === 'dashboard' && (
        <DashboardView
          organization={activeOrg}
          emails={emails}
          breaches={breaches}
          activityLogs={activityLogs}
          alertsSentCount={alertsSentCount}
          loading={loadingWorkspace}
          onRefresh={() => loadWorkspaceData(activeOrg.id)}
        />
      )}

      {activeTab === 'alerts' && (
        <AlertsSettingsView
          organization={activeOrg}
          onRefresh={() => loadWorkspaceData(activeOrg.id)}
        />
      )}

      {activeTab === 'reports' && <ReportsView organization={activeOrg} />}

      {activeTab === 'msp' && (
        <MspView
          organizations={organizations}
          activeOrg={activeOrg}
          allEmails={allEmails}
          onSwitchOrganization={handleSwitchOrg}
          onRefresh={() => loadWorkspaceData(activeOrg.id)}
        />
      )}

      {activeTab === 'billing' && (
        <BillingView
          organization={activeOrg}
          monitoredCount={emails.length}
          onRefresh={() => loadWorkspaceData(activeOrg.id)}
        />
      )}

      {activeTab === 'security' && (
        <SecurityView organization={activeOrg} user={user} />
      )}
    </WorkspaceShell>
  );
}
