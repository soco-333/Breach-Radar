import { FormEvent, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { breachApi } from '../services/breachApi';
import { KAnonymityLookupResult } from '../services/cryptoSecurity';
import { Organization, StorageSecurityStatus, User } from '../types/breachRadar';

interface SecurityViewProps {
  organization: Organization;
  user: User;
}

export function SecurityView({ organization, user }: SecurityViewProps) {
  const [status, setStatus] = useState<StorageSecurityStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [candidatePassword, setCandidatePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(false);
  const [lookupResult, setLookupResult] = useState<KAnonymityLookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingStatus(true);
    breachApi.getStorageSecurityStatus(organization.id, user.email).then((res) => {
      if (!active) return;
      setStatus(res);
      setLoadingStatus(false);
    });
    return () => {
      active = false;
    };
  }, [organization.id, user.email]);

  const handleKAnonymityCheck = async (e: FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    if (!candidatePassword) {
      setLookupError('Enter a password to check via SHA-1 k-anonymity.');
      return;
    }

    setChecking(true);
    try {
      const result = await breachApi.checkPasswordExposureKAnonymity(candidatePassword);
      setLookupResult(result);
      // Clear input from state immediately so candidate password never lingers in memory
      setCandidatePassword('');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
          Security &amp; cryptography — {organization.name}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Verify how BreachRadar protects account passwords, encrypts monitored emails at rest, and
          performs privacy-preserving leaked-password checks.
        </p>
      </div>

      {/* SHA-1 k-Anonymity Leaked-Password Lookup */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-blue-800">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Leaked-password check (SHA-1 k-Anonymity)
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 max-w-2xl">
              Your browser computes a SHA-1 digest locally in memory and sends only the first 5
              characters of the hash. The password and full hash never leave your device and are
              never stored on disk.
            </p>
          </div>
        </div>

        <form onSubmit={handleKAnonymityCheck} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1 max-w-md">
            <input
              type={showPassword ? 'text' : 'password'}
              value={candidatePassword}
              onChange={(e) => setCandidatePassword(e.target.value)}
              placeholder="Enter a password to check (e.g. password or a new passphrase)"
              autoComplete="off"
              className="w-full rounded-lg border border-slate-300 py-2 pl-3.5 pr-10 text-sm text-slate-900 focus:border-blue-800 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={checking}
            style={{ backgroundColor: organization.brandColor }}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60 whitespace-nowrap cursor-pointer"
          >
            {checking && <Loader2 className="h-4 w-4 animate-spin" />}
            Check with k-anonymity
          </button>
        </form>

        {lookupError && (
          <p className="mt-3 text-xs font-medium text-red-700">{lookupError}</p>
        )}

        {lookupResult && (
          <div
            className={`mt-5 rounded-xl border p-4 ${
              lookupResult.exposed
                ? 'border-red-200 bg-red-50/70'
                : 'border-emerald-200 bg-emerald-50/70'
            }`}
          >
            <div className="flex items-start gap-3">
              {lookupResult.exposed ? (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              )}
              <div className="space-y-1.5 text-sm">
                <p
                  className={`font-semibold ${
                    lookupResult.exposed ? 'text-red-800' : 'text-emerald-900'
                  }`}
                >
                  {lookupResult.exposed
                    ? `Exposed in ${lookupResult.breachCount.toLocaleString('en-IN')} known leaked-password records`
                    : 'Not found in known leaked-password datasets'}
                </p>
                <p className="text-xs text-slate-700">
                  {lookupResult.exposed
                    ? 'Do not use this password for any clinic, CA firm, or office mailbox. Choose a unique 14+ character passphrase.'
                    : 'This password did not match any suffix in the returned k-anonymity bucket.'}
                </p>
                <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-slate-600 tabular-nums">
                  <span>5-char prefix queried: {lookupResult.prefixSent}</span>
                  <span>·</span>
                  <span>Bucket size: {lookupResult.bucketSize} suffixes</span>
                  <span>·</span>
                  <span>Leaked password stored: No</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Cryptographic Controls Verification */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex items-center gap-2 text-slate-900">
            <Lock className="h-4 w-4 text-blue-800" aria-hidden="true" />
            <h3 className="font-display text-sm font-semibold">User Password Hashing</h3>
          </div>
          <p className="text-xs text-slate-600">
            Account sign-in passwords are salted and hashed using memory-hard Argon2id (RFC 9106).
          </p>
          {loadingStatus || !status ? (
            <div className="h-12 animate-pulse rounded bg-slate-100" />
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
              <p className="text-[11px] font-semibold text-slate-700">
                {status.userPasswordHashAlgorithm}
              </p>
              <p className="font-mono text-[11px] text-slate-600 break-all">
                {status.userPasswordHashPreview}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex items-center gap-2 text-slate-900">
            <ShieldCheck className="h-4 w-4 text-blue-800" aria-hidden="true" />
            <h3 className="font-display text-sm font-semibold">Emails Encrypted at Rest</h3>
          </div>
          <p className="text-xs text-slate-600">
            All monitored staff email addresses are encrypted at rest using AES-256-GCM with unique
            random 96-bit IVs.
          </p>
          {loadingStatus || !status ? (
            <div className="h-12 animate-pulse rounded bg-slate-100" />
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
              <p className="text-[11px] font-semibold text-slate-700">
                {status.totalEncryptedEmails} records · {status.encryptedEmailSample?.alg || 'AES-256-GCM'}
              </p>
              {status.encryptedEmailSample && (
                <p className="font-mono text-[11px] text-slate-600 break-all">
                  IV: {status.encryptedEmailSample.iv} · CT: {status.encryptedEmailSample.ciphertextPreview}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex items-center gap-2 text-slate-900">
            <KeyRound className="h-4 w-4 text-blue-800" aria-hidden="true" />
            <h3 className="font-display text-sm font-semibold">Zero Leaked Passwords</h3>
          </div>
          <p className="text-xs text-slate-600">
            SHA-1 is strictly restricted to 5-character k-anonymity range lookups. Plaintext or
            leaked passwords are never persisted.
          </p>
          {loadingStatus || !status ? (
            <div className="h-12 animate-pulse rounded bg-slate-100" />
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
              <p className="text-[11px] font-semibold text-slate-700">{status.kAnonymityProtocol}</p>
              <p className="font-mono text-[11px] text-emerald-700">
                Leaked passwords stored: {status.leakedPasswordsStored}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
