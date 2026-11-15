import { FormEvent, useState } from 'react';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { PLANS } from '../data/mockSeed';
import { breachApi } from '../services/breachApi';
import { PlanId } from '../types/breachRadar';
import { formatInr } from './StatusIndicator';

interface AuthPageProps {
  initialMode: 'login' | 'signup';
  initialPlan?: PlanId;
  onBackToLanding: () => void;
  onAuthenticated: () => void;
}

export function AuthPage({
  initialMode,
  initialPlan = 'business',
  onBackToLanding,
  onAuthenticated,
}: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [plan, setPlan] = useState<PlanId>(initialPlan);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [industry, setIndustry] = useState('Healthcare & Diagnostics');
  const [city, setCity] = useState('Kochi, Kerala');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid work email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'signup') {
      if (name.trim().length < 2) {
        setError('Please enter your full name.');
        return;
      }
      if (organizationName.trim().length < 2) {
        setError('Please enter your business or firm name.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await breachApi.login(trimmedEmail, password);
      } else {
        await breachApi.signup({
          name,
          email: trimmedEmail,
          password,
          organizationName,
          industry,
          city,
          plan,
        });
      }
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoAccess = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await breachApi.loginDemo('org_malabar');
      onAuthenticated();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <div className="mx-auto w-full max-w-6xl px-6 py-6">
        <button
          type="button"
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to BreachRadar
        </button>
      </div>

      <main className="mx-auto w-full max-w-md px-6 py-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <div className="flex items-center justify-between">
            <span className="font-display text-xl font-bold text-slate-900">BreachRadar</span>
            <span className="text-xs font-medium text-slate-500">India-based monitoring</span>
          </div>

          <h1 className="mt-5 font-display text-2xl font-bold text-slate-900">
            {mode === 'login' ? 'Sign in to your workspace' : 'Start your 14-day free trial'}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            {mode === 'login'
              ? 'Check monitored emails, active alerts, and monthly reports.'
              : 'Add your team emails in two minutes. No credit card required.'}
          </p>

          <div className="mt-5 grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`rounded-md py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`rounded-md py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create account
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Your full name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. Ananya Menon"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-800/15"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Business or firm name
                  </label>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Malabar Care Clinic"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-800/15"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Industry</label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-800 focus:outline-none"
                    >
                      <option>Healthcare &amp; Diagnostics</option>
                      <option>Chartered Accountants &amp; Tax</option>
                      <option>IT Services &amp; MSP</option>
                      <option>Manufacturing &amp; Exports</option>
                      <option>Retail &amp; Hospitality</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Kochi, Kerala"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-800 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Trial plan</label>
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value as PlanId)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-800 focus:outline-none"
                  >
                    {PLANS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatInr(p.monthlyPriceInr)}/mo
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700">Work email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vikram@kaveriinfotech.in"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-800/15"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-800/15"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60 transition-colors cursor-pointer"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'login' ? 'Sign in' : 'Create free trial workspace'}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={handleDemoAccess}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4 text-blue-800" aria-hidden="true" />
              Continue with Demo Workspace (Malabar Clinic / MSP)
            </button>
          </div>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-6 py-6 text-center text-xs text-slate-500">
        Powered by India-based monitoring · DPDP Act 2023 aligned · Zero password storage
      </footer>
    </div>
  );
}
