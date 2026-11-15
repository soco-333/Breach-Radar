import { useState } from 'react';
import {
  BellRing,
  Building2,
  CreditCard,
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Organization, User, WorkspaceTab } from '../types/breachRadar';

interface WorkspaceShellProps {
  user: User;
  organizations: Organization[];
  activeOrg: Organization;
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onSwitchOrg: (orgId: string) => Promise<void>;
  onLogout: () => Promise<void>;
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{ id: WorkspaceTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'alerts', label: 'Alerts settings', icon: BellRing },
  { id: 'reports', label: 'Reports', icon: FileBarChart2 },
  { id: 'msp', label: 'MSP console', icon: Building2 },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'security', label: 'Security & keys', icon: ShieldCheck },
];

export function WorkspaceShell({
  user,
  organizations,
  activeOrg,
  activeTab,
  onSelectTab,
  onSwitchOrg,
  onLogout,
  children,
}: WorkspaceShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeNavLabel = NAV_ITEMS.find((n) => n.id === activeTab)?.label || 'Dashboard';

  const SidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white border-r border-slate-200 w-64">
      <div>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            {activeOrg.logoDataUrl ? (
              <img
                src={activeOrg.logoDataUrl}
                alt={activeOrg.name}
                className="h-8 w-8 rounded-lg object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div
                style={{ backgroundColor: activeOrg.brandColor }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display text-xs font-bold text-white"
              >
                {activeOrg.logoText}
              </div>
            )}
            <span className="truncate font-display text-base font-bold text-slate-900">
              BreachRadar
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-slate-500 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Organization Switcher */}
        <div className="border-b border-slate-200 px-4 py-3.5">
          <label className="block text-[11px] font-medium text-slate-500">
            Active organization
          </label>
          <select
            value={activeOrg.id}
            onChange={(e) => onSwitchOrg(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-blue-800 focus:outline-none"
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} ({org.city.split(',')[0]})
              </option>
            ))}
          </select>
        </div>

        <nav className="px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  setSidebarOpen(false);
                }}
                style={isActive ? { color: activeOrg.brandColor } : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-slate-100 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200 p-4 space-y-3">
        <div className="text-xs text-slate-500">
          <p className="font-medium text-slate-800 truncate">{user.name}</p>
          <p className="truncate">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block shrink-0">{SidebarContent}</aside>

      {/* Mobile Drawer Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="relative z-10">{SidebarContent}</div>
          <div
            className="flex-1 bg-slate-900/40"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="rounded-lg border border-slate-200 p-1.5 text-slate-700 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-sm text-slate-500 truncate">
              <span className="truncate font-medium text-slate-900">{activeOrg.name}</span>
              <span aria-hidden="true">/</span>
              <span className="whitespace-nowrap">{activeNavLabel}</span>
            </div>
          </div>

          <div className="text-xs font-medium text-slate-500 whitespace-nowrap hidden sm:block">
            Powered by India-based monitoring
          </div>
        </header>

        <main className="flex-1 px-6 py-7 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
