import { useState } from 'react';
import {
  ArrowRight,
  Bell,
  Building2,
  Check,
  ChevronDown,
  FileText,
  Lock,
  Menu,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { PLANS } from '../data/mockSeed';
import { BillingCycle, PlanId } from '../types/breachRadar';
import { formatInr } from './StatusIndicator';

interface LandingPageProps {
  onNavigateAuth: (mode: 'login' | 'signup', selectedPlan?: PlanId) => void;
  onEnterDemo: () => void;
}

const FAQS = [
  {
    q: 'Do you store or view our staff passwords?',
    a: 'No. BreachRadar never stores, displays, or collects plaintext passwords. We only match email addresses against breach metadata (such as which website leaked, when it happened, and whether a password hash or phone number was exposed) so you know which account needs a reset.',
  },
  {
    q: 'Does this work if we use Google Workspace, Zoho Mail, or Microsoft 365?',
    a: 'Yes. BreachRadar works regardless of your email provider. You only add your work email addresses or upload a staff CSV—no complex firewall hardware or mail server changes required.',
  },
  {
    q: 'How fast do WhatsApp, Telegram, and Email alerts arrive?',
    a: 'As soon as a monitored email appears in a newly indexed breach dump or stealer log, an alert is dispatched in under 60 seconds with plain-language steps for the business owner or IT administrator.',
  },
  {
    q: 'How does BreachRadar help with India’s DPDP Act 2023?',
    a: 'The Digital Personal Data Protection Act requires Indian businesses handling customer or patient records to maintain reasonable security safeguards and document incident response. BreachRadar provides continuous credential monitoring, India-based processing, and timestamped resolution logs.',
  },
  {
    q: 'Can IT service providers (MSPs) manage multiple Indian clients?',
    a: 'Yes. On the MSP Partner plan (₹9,999/month), you can onboard unlimited client organizations, switch between client workspaces in one click, apply your own agency logo and brand colour, and download per-client monthly PDF reports.',
  },
];

export function LandingPage({ onNavigateAuth, onEnterDemo }: LandingPageProps) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top Bar: Strictly 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-4">
          <a
            href="#top"
            className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            BreachRadar
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#how-it-works"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              How it works
            </a>
            <a
              href="#dpdp"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              DPDP Act
            </a>
            <a
              href="#pricing"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Pricing
            </a>
            <a
              href="#faq"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              FAQ
            </a>
            <button
              type="button"
              onClick={() => onNavigateAuth('login')}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign in
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateAuth('signup', 'business')}
              className="hidden sm:inline-flex items-center justify-center rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Start free trial
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle menu"
              className="inline-flex md:hidden items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-6 py-4 md:hidden">
            <div className="flex flex-col gap-3 text-sm font-medium text-slate-700">
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="py-1.5">
                How it works
              </a>
              <a href="#dpdp" onClick={() => setMobileMenuOpen(false)} className="py-1.5">
                DPDP Act
              </a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="py-1.5">
                Pricing
              </a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="py-1.5">
                FAQ
              </a>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigateAuth('login');
                }}
                className="py-1.5 text-left"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigateAuth('signup', 'business');
                }}
                className="mt-1 rounded-lg bg-blue-800 px-4 py-2.5 text-center text-white"
              >
                Start free trial
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="top" className="border-b border-slate-200 bg-slate-50/70">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-stretch">
            <div className="flex flex-col justify-center lg:col-span-7">
              <p className="text-xs font-medium text-blue-800 tracking-wide">
                Powered by India-based monitoring · DPDP Act 2023 aligned · Zero password storage
              </p>

              <h1
                className="mt-4 font-display font-bold tracking-tight text-slate-900 leading-[1.12]"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.35rem)', textWrap: 'balance' }}
              >
                Know when your team&apos;s credentials leak — before attackers use them.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
                Built for Indian clinics, chartered accountant firms, growing offices, and IT service
                providers. Add your company email addresses once and receive plain-language WhatsApp,
                Telegram, or email alerts whenever staff logins surface in a data breach.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => onNavigateAuth('signup', 'business')}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Start free trial
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={onEnterDemo}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Open live demo workspace
                </button>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>14-day free trial</span>
                <span aria-hidden="true">·</span>
                <span>No credit card needed</span>
                <span aria-hidden="true">·</span>
                <span>Setup takes 2 minutes</span>
              </div>
            </div>

            <div className="lg:col-span-5 flex">
              <div className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                {!heroImgFailed ? (
                  <img
                    src="/src/assets/images/hero_indian_office_1794773309654.jpg"
                    alt="Modern Indian small business operations and IT monitoring workspace"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="h-72 w-full object-cover lg:h-full"
                  />
                ) : (
                  <div className="flex h-72 lg:h-full w-full flex-col items-center justify-center bg-slate-100 p-8 text-center">
                    <ShieldCheck className="h-10 w-10 text-blue-800" />
                    <p className="mt-3 text-sm font-medium text-slate-700">
                      India-based 24/7 Credential Monitoring
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4-column metric strip below hero split */}
          <div className="mt-12 grid grid-cols-2 gap-4 border-t border-slate-200 pt-8 md:grid-cols-4">
            <div>
              <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">140+</p>
              <p className="mt-1 text-xs text-slate-600">Breach & stealer feeds checked daily</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">&lt; 60 sec</p>
              <p className="mt-1 text-xs text-slate-600">WhatsApp, Telegram & email alert speed</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">0</p>
              <p className="mt-1 text-xs text-slate-600">Plaintext passwords stored on our servers</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">₹999/mo</p>
              <p className="mt-1 text-xs text-slate-600">Transparent INR plans with GST invoicing</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900">
            How BreachRadar protects your business
          </h2>
          <p className="mt-3 text-base text-slate-600">
            No agents to install on laptops and no security jargon. Three simple steps keep your team protected.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="font-mono text-xs font-semibold text-blue-800">01</p>
            <h3 className="mt-3 font-display text-lg font-semibold text-slate-900">
              Add your team emails
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Enter staff email addresses one by one or upload a CSV export from Google Workspace,
              Microsoft 365, or Zoho Mail in seconds.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="font-mono text-xs font-semibold text-blue-800">02</p>
            <h3 className="mt-3 font-display text-lg font-semibold text-slate-900">
              We monitor 24/7
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Our India-based monitoring engine checks new third-party website leaks, vendor breaches,
              and credential dumps around the clock.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="font-mono text-xs font-semibold text-blue-800">03</p>
            <h3 className="mt-3 font-display text-lg font-semibold text-slate-900">
              Get instant alerts
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Receive immediate alerts on WhatsApp, Telegram, or email explaining what leaked and the
              exact steps to secure the account before attackers act.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid (Asymmetric Bento) */}
      <section className="border-y border-slate-200 bg-slate-50/60 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900">
              Built for business owners and Indian IT teams
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Every alert, risk score, and monthly report is written in plain English so owners can act
              without hiring a dedicated cybersecurity analyst.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 md:col-span-4">
              <div className="flex items-center gap-2.5 text-blue-800">
                <Bell className="h-5 w-5" aria-hidden="true" />
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  Instant WhatsApp, Telegram & Email Alerts
                </h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Set severity thresholds so critical password exposures ping your WhatsApp or IT Telegram
                group right away, while minor marketing leaks stay in a tidy daily digest.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 md:col-span-2">
              <div className="flex items-center gap-2.5 text-blue-800">
                <Lock className="h-5 w-5" aria-hidden="true" />
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  Metadata Only
                </h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                We never store or show actual passwords—only breach names, dates, and exposed field types.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 md:col-span-2">
              <div className="flex items-center gap-2.5 text-blue-800">
                <Upload className="h-5 w-5" aria-hidden="true" />
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  Bulk CSV Onboarding
                </h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Import 50 or 500 staff addresses from a spreadsheet and get an immediate risk score per mailbox.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 md:col-span-2">
              <div className="flex items-center gap-2.5 text-blue-800">
                <FileText className="h-5 w-5" aria-hidden="true" />
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  Owner-Friendly PDFs
                </h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Download a 1-page monthly PDF summary with a 6-month risk trend and top 5 risky accounts.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 md:col-span-2">
              <div className="flex items-center gap-2.5 text-blue-800">
                <Building2 className="h-5 w-5" aria-hidden="true" />
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  White-Label MSP Console
                </h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                IT providers can manage every client clinic, factory, or CA firm under custom branding.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DPDP Act 2023 Compliance Section */}
      <section id="dpdp" className="mx-auto max-w-6xl px-6 py-20">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 lg:p-12">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <p className="text-xs font-semibold text-blue-800">
                India DPDP Act 2023 Readiness
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Demonstrate reasonable security safeguards with India-hosted monitoring
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
                Under India&apos;s Digital Personal Data Protection (DPDP) Act, clinics, CA firms, and
                businesses acting as Data Fiduciaries must prevent unauthorized data breaches and maintain
                timely incident records. Compromised staff email credentials are the #1 entry point for
                ransomware and patient/tax data theft.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm text-slate-700">
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                  <span>Powered by India-based monitoring nodes</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                  <span>Timestamped breach & resolution audit trail</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                  <span>Downloadable monthly compliance PDFs</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                  <span>GST-compliant billing for Indian entities</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-800 text-white">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold text-slate-900">
                    Powered by India-based monitoring
                  </p>
                  <p className="text-xs text-slate-500">
                    Data residency aligned · Bengaluru &amp; Mumbai nodes
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-3 border-t border-slate-200 pt-4 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Breach metadata retention</span>
                  <span className="font-mono font-medium text-slate-900">India Region</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Plaintext password storage</span>
                  <span className="font-mono font-medium text-emerald-700">Never Stored</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Owner remediation logs</span>
                  <span className="font-mono font-medium text-slate-900">Exportable PDF</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-slate-200 bg-slate-50/60 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900">
            Trusted by clinics, CA practices, and IT providers across India
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-sm leading-relaxed text-slate-700">
                &ldquo;We had no idea our pharmacy desk email had been leaked on a supplier portal until
                BreachRadar sent a WhatsApp alert. We rotated the password and enabled 2FA within ten
                minutes—preventing a real patient-billing scare.&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">
                <img
                  src="/src/assets/images/testimonial_kochi_clinic_1794773310384.jpg"
                  alt="Dr. Ananya Menon"
                  referrerPolicy="no-referrer"
                  className="h-11 w-11 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Dr. Ananya Menon</p>
                  <p className="text-xs text-slate-500">Medical Director · Malabar Care Clinic, Kochi</p>
                </div>
              </div>
            </article>

            <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-sm leading-relaxed text-slate-700">
                &ldquo;During GST filing season, our team logs into dozens of utilities. BreachRadar gives
                me a one-page monthly PDF I can understand in two minutes, and proves to our audit
                clients that we take DPDP safeguards seriously.&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">
                <img
                  src="/src/assets/images/testimonial_ca_firm_1794773310791.jpg"
                  alt="CA Rajesh Deshmukh"
                  referrerPolicy="no-referrer"
                  className="h-11 w-11 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">CA Rajesh Deshmukh</p>
                  <p className="text-xs text-slate-500">
                    Managing Partner · Deshmukh &amp; Iyer Associates, Pune
                  </p>
                </div>
              </div>
            </article>

            <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-sm leading-relaxed text-slate-700">
                &ldquo;We manage IT for 18 SMEs out of Bengaluru. Moving them onto BreachRadar&apos;s
                white-label MSP console cut our manual breach checking from hours a week to zero, and our
                clients love receiving branded monthly PDF summaries.&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">
                <img
                  src="/src/assets/images/testimonial_it_msp_1794773310880.jpg"
                  alt="Vikram Nair"
                  referrerPolicy="no-referrer"
                  className="h-11 w-11 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Vikram Nair</p>
                  <p className="text-xs text-slate-500">Founder · Kaveri Infotech Solutions, Bengaluru</p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Pricing Table in INR */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900">
              Simple pricing in ₹ for every stage
            </h2>
            <p className="mt-2 text-base text-slate-600">
              Start with a 14-day free trial. Prices exclude 18% GST with instant tax invoices.
            </p>
          </div>

          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                billingCycle === 'yearly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Yearly (2 months free)
            </button>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const isPopular = plan.id === 'business';
            const displayMonthly =
              billingCycle === 'yearly'
                ? Math.round(plan.yearlyPriceInr / 12)
                : plan.monthlyPriceInr;

            return (
              <div
                key={plan.id}
                className={`flex flex-col justify-between rounded-xl border p-7 ${
                  isPopular
                    ? 'border-blue-800 bg-white ring-1 ring-blue-800'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-xl font-bold text-slate-900">{plan.name}</h3>
                    {isPopular && (
                      <span className="text-xs font-semibold text-blue-800">Most Popular</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{plan.audience}</p>

                  <div className="mt-6 flex items-baseline gap-1.5">
                    <span className="font-mono text-3xl font-bold text-slate-900 tabular-nums">
                      {formatInr(displayMonthly)}
                    </span>
                    <span className="text-sm text-slate-500">/month</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                    {billingCycle === 'yearly'
                      ? `Billed ${formatInr(plan.yearlyPriceInr)}/year (2 months free)`
                      : 'Billed monthly · Cancel anytime'}
                  </p>

                  <ul className="mt-6 space-y-3 border-t border-slate-100 pt-6 text-sm text-slate-700">
                    {plan.highlights.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-800" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigateAuth('signup', plan.id)}
                  className={`mt-8 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                    isPopular
                      ? 'bg-blue-800 text-white hover:bg-blue-900'
                      : 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Start {plan.name} trial
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-slate-200 bg-slate-50/60 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900">
            Frequently asked questions
          </h2>

          <div className="mt-8 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer"
                  >
                    <span className="font-display text-base font-semibold text-slate-900">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-sm leading-relaxed text-slate-600">{item.a}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-6 px-6 py-10 md:flex-row md:items-center">
          <div>
            <p className="font-display text-base font-bold text-slate-900">BreachRadar</p>
            <p className="mt-1 text-xs text-slate-500">
              Powered by India-based monitoring · Bengaluru &amp; Kochi · support@breachradar.in
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-slate-600">
            <a href="#how-it-works" className="hover:text-slate-900">
              How it works
            </a>
            <a href="#pricing" className="hover:text-slate-900">
              Pricing
            </a>
            <button
              type="button"
              onClick={() => setLegalModal('privacy')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => setLegalModal('terms')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Terms of Service
            </button>
            <span className="text-slate-400">© 2026 BreachRadar Technologies Pvt. Ltd.</span>
          </div>
        </div>
      </footer>

      {/* Privacy / Terms Modal */}
      {legalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-display text-lg font-bold text-slate-900">
                {legalModal === 'privacy' ? 'Privacy Policy & DPDP Act Notice' : 'Terms of Service'}
              </h3>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600">
              {legalModal === 'privacy' ? (
                <>
                  <p>
                    BreachRadar processes only corporate email addresses and breach metadata (breach name,
                    date, and exposed field categories) on India-based infrastructure in compliance with
                    the Digital Personal Data Protection Act, 2023.
                  </p>
                  <p>
                    We never store, index, or display plaintext passwords. Organizations can export or
                    delete monitored email lists at any time by contacting support@breachradar.in.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    By using BreachRadar, you confirm that your organization or MSP client has authorized
                    credential exposure monitoring for the domains and email addresses added to your
                    workspace.
                  </p>
                  <p>
                    Subscriptions are billed in Indian Rupees (INR) plus 18% GST and may be upgraded or
                    cancelled prior to the next billing cycle.
                  </p>
                </>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
