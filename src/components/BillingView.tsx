import { FormEvent, useEffect, useState } from 'react';
import {
  Building,
  Check,
  CreditCard,
  Landmark,
  Loader2,
  Lock,
  Smartphone,
  X,
} from 'lucide-react';
import { PLANS } from '../data/mockSeed';
import { breachApi } from '../services/breachApi';
import {
  BillingCycle,
  InvoiceRecord,
  Organization,
  PlanDefinition,
  PlanId,
} from '../types/breachRadar';
import { formatInr } from './StatusIndicator';

interface BillingViewProps {
  organization: Organization;
  monitoredCount: number;
  onRefresh: () => Promise<void>;
}

export function BillingView({ organization, monitoredCount, onRefresh }: BillingViewProps) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(organization.billingCycle);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  // Razorpay-style Checkout Modal
  const [checkoutPlan, setCheckoutPlan] = useState<PlanDefinition | null>(null);
  const [payMethodTab, setPayMethodTab] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [upiId, setUpiId] = useState('accounts@okicici');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8841');
  const [bankName, setBankName] = useState('HDFC Bank Corporate');
  const [gstin, setGstin] = useState(organization.gstin || '');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [paymentSuccessBanner, setPaymentSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingInvoices(true);
    breachApi.listInvoices(organization.id).then((list) => {
      if (!active) return;
      setInvoices(list);
      setLoadingInvoices(false);
    });
    return () => {
      active = false;
    };
  }, [organization.id]);

  const currentPlan = PLANS.find((p) => p.id === organization.plan) || PLANS[0];
  const emailLimitLabel = currentPlan.maxEmails === null ? 'Unlimited' : String(currentPlan.maxEmails);
  const usagePercent =
    currentPlan.maxEmails === null
      ? Math.min(100, Math.max(8, monitoredCount * 4))
      : Math.min(100, Math.round((monitoredCount / currentPlan.maxEmails) * 100));

  const handleCheckoutSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!checkoutPlan) return;
    setCheckoutError(null);

    if (payMethodTab === 'upi' && !upiId.includes('@')) {
      setCheckoutError('Enter a valid UPI ID (e.g. name@okaxis).');
      return;
    }

    const methodLabel =
      payMethodTab === 'upi'
        ? `UPI · ${upiId}`
        : payMethodTab === 'card'
          ? 'Corporate Visa •••• 8841'
          : `${bankName} NetBanking`;

    setProcessingPayment(true);
    try {
      const res = await breachApi.upgradePlanCheckout({
        orgId: organization.id,
        planId: checkoutPlan.id,
        billingCycle,
        paymentMethod: methodLabel,
        gstin,
      });
      setInvoices((prev) => [res.invoice, ...prev]);
      setPaymentSuccessBanner(
        `Payment confirmed (${res.invoice.invoiceNumber}). ${organization.name} is now on the ${checkoutPlan.name} plan.`
      );
      setCheckoutPlan(null);
      await onRefresh();
    } finally {
      setProcessingPayment(false);
    }
  };

  const subtotal = checkoutPlan
    ? billingCycle === 'yearly'
      ? checkoutPlan.yearlyPriceInr
      : checkoutPlan.monthlyPriceInr
    : 0;
  const gstAmount = Math.round(subtotal * 0.18);
  const totalPayable = subtotal + gstAmount;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
          Billing &amp; subscription — {organization.name}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage your INR subscription, monitored email quota, and GST tax invoices.
        </p>
      </div>

      {paymentSuccessBanner && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
        >
          <Check className="h-4 w-4 shrink-0" />
          <span>{paymentSuccessBanner}</span>
        </div>
      )}

      {/* Current Plan & Usage */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-medium text-slate-500">Current active plan</p>
            <h2 className="mt-1 font-display text-xl font-bold text-slate-900">
              {currentPlan.name} ·{' '}
              <span className="font-mono text-lg">
                {formatInr(
                  organization.billingCycle === 'yearly'
                    ? Math.round(currentPlan.yearlyPriceInr / 12)
                    : currentPlan.monthlyPriceInr
                )}
                /mo
              </span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Billed {organization.billingCycle}
              {organization.gstin ? ` · GSTIN ${organization.gstin}` : ''}
            </p>
          </div>

          <div className="w-full sm:w-72">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span>Monitored email quota</span>
              <span className="font-mono tabular-nums">
                {monitoredCount} / {emailLimitLabel}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                style={{ width: `${usagePercent}%`, backgroundColor: organization.brandColor }}
                className="h-full rounded-full transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Plan Switcher */}
      <div className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="font-display text-lg font-bold text-slate-900">Available plans</h2>
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
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
              className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                billingCycle === 'yearly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Yearly (2 months free)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent =
              plan.id === organization.plan && billingCycle === organization.billingCycle;
            const monthlyEquivalent =
              billingCycle === 'yearly'
                ? Math.round(plan.yearlyPriceInr / 12)
                : plan.monthlyPriceInr;

            return (
              <div
                key={plan.id}
                className={`flex flex-col justify-between rounded-xl border p-6 ${
                  isCurrent ? 'border-blue-800 bg-blue-50/20 ring-1 ring-blue-800' : 'border-slate-200 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-bold text-slate-900">{plan.name}</h3>
                    {isCurrent && (
                      <span className="text-xs font-semibold text-blue-800">Current</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{plan.audience}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                      {formatInr(monthlyEquivalent)}
                    </span>
                    <span className="text-xs text-slate-500">/mo</span>
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                    {billingCycle === 'yearly'
                      ? `${formatInr(plan.yearlyPriceInr)} billed yearly + GST`
                      : `${formatInr(plan.monthlyPriceInr)} billed monthly + GST`}
                  </p>

                  <ul className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-700">
                    {plan.highlights.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-800" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={isCurrent}
                  onClick={() => {
                    setCheckoutError(null);
                    setCheckoutPlan(plan);
                  }}
                  style={!isCurrent ? { backgroundColor: organization.brandColor } : undefined}
                  className={`mt-6 w-full rounded-lg px-4 py-2 text-xs font-semibold transition-opacity cursor-pointer ${
                    isCurrent
                      ? 'border border-slate-200 bg-slate-100 text-slate-500 cursor-default'
                      : 'text-white hover:opacity-95'
                  }`}
                >
                  {isCurrent ? 'Active plan' : `Switch to ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* GST Invoice History */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="font-display text-base font-semibold text-slate-900">
            GST invoice history
          </h2>
        </div>
        {loadingInvoices ? (
          <div className="p-6 h-24 animate-pulse bg-slate-50" />
        ) : invoices.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-slate-500">
            No paid invoices yet during your 14-day free trial.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <tr>
                  <th className="px-6 py-3">Invoice</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 text-right">Total (incl. 18% GST)</th>
                  <th className="px-6 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-6 py-3.5 font-mono text-xs font-semibold text-slate-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600 tabular-nums">
                      {inv.date}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-800">{inv.planName}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">{inv.method}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                      {formatInr(inv.totalInr)}
                    </td>
                    <td className="px-6 py-3.5 text-right text-xs font-medium text-emerald-700">
                      {inv.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Razorpay-Style Checkout Modal */}
      {checkoutPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
            {/* Razorpay-style Header Band */}
            <div className="bg-[#0C2451] px-6 py-5 text-white flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 font-display text-sm font-bold">
                  BR
                </div>
                <div>
                  <p className="font-display text-sm font-bold">BreachRadar India</p>
                  <p className="text-xs text-blue-200">
                    {checkoutPlan.name} ({billingCycle === 'yearly' ? 'Annual' : 'Monthly'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutPlan(null)}
                className="rounded-lg p-1 text-blue-200 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="p-6 space-y-5">
              {/* Amount Breakdown */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Plan subtotal</span>
                  <span className="font-mono tabular-nums">{formatInr(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>IGST / CGST+SGST (18%)</span>
                  <span className="font-mono tabular-nums">{formatInr(gstAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-slate-900">
                  <span>Total payable</span>
                  <span className="font-mono tabular-nums">{formatInr(totalPayable)}</span>
                </div>
              </div>

              {/* Payment Method Tabs */}
              <div>
                <p className="text-xs font-medium text-slate-700">Select payment method</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayMethodTab('upi')}
                    className={`flex flex-col items-center gap-1 rounded-lg border py-2.5 text-xs font-medium cursor-pointer ${
                      payMethodTab === 'upi'
                        ? 'border-blue-800 bg-blue-50 text-blue-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Smartphone className="h-4 w-4" />
                    UPI / QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethodTab('card')}
                    className={`flex flex-col items-center gap-1 rounded-lg border py-2.5 text-xs font-medium cursor-pointer ${
                      payMethodTab === 'card'
                        ? 'border-blue-800 bg-blue-50 text-blue-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="h-4 w-4" />
                    Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethodTab('netbanking')}
                    className={`flex flex-col items-center gap-1 rounded-lg border py-2.5 text-xs font-medium cursor-pointer ${
                      payMethodTab === 'netbanking'
                        ? 'border-blue-800 bg-blue-50 text-blue-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Landmark className="h-4 w-4" />
                    NetBanking
                  </button>
                </div>
              </div>

              {payMethodTab === 'upi' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    UPI ID (GPay, PhonePe, Paytm, BHIM)
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="accounts@okaxis"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 font-mono text-sm text-slate-900 focus:border-blue-800 focus:outline-none"
                  />
                </div>
              )}

              {payMethodTab === 'card' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Debit / Corporate Credit Card
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 font-mono text-sm text-slate-900 focus:border-blue-800 focus:outline-none"
                  />
                </div>
              )}

              {payMethodTab === 'netbanking' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700">Select Bank</label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900"
                  >
                    <option>HDFC Bank Corporate</option>
                    <option>ICICI Bank NetBanking</option>
                    <option>State Bank of India (SBI)</option>
                    <option>Axis Bank Corporate</option>
                  </select>
                </div>
              )}

              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                  <Building className="h-3.5 w-3.5 text-slate-400" />
                  Company GSTIN (optional, for tax credit)
                </label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="29AABCK9012P1Z2"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 font-mono text-xs text-slate-900 focus:border-blue-800 focus:outline-none"
                />
              </div>

              {checkoutError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {checkoutError}
                </div>
              )}

              <button
                type="submit"
                disabled={processingPayment}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
              >
                {processingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying payment...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Pay {formatInr(totalPayable)} securely
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-slate-400">
                Simulated Razorpay checkout for demonstration · No real funds charged
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
