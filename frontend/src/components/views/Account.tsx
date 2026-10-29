"use client";
import { useState, useEffect, FormEvent, ReactNode } from "react";
import { Copy, LogOut, Monitor } from "lucide-react";
import Passkeys from "../Passkeys";
import MfaRecovery from "../MfaRecovery";
import { DeleteAccount, ExportData } from "../AccountData";
import AppShell, { roleLabel } from "../AppShell";
import {
  Alert,
  ConfirmIdentity,
  Field,
  RowsSkeleton,
  Spinner,
  SubmitButton,
} from "../ui";
import { useTeam } from "@/context/TeamContext";
import {
  api,
  formatDate,
  formatDateTime,
  message,
  notice as friendly,
  signOut,
} from "@/lib/api";

type Session = {
  _id: string;
  device: string;
  createdAt: string;
  expiresAt: string;
};

function Section({
  id,
  title,
  description,
  danger,
  children,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={"settings-section" + (danger ? " danger" : "")}
      aria-labelledby={id}
    >
      <header>
        <h2 className="section-title" id={id}>
          {title}
        </h2>
        {description && <p className="section-desc">{description}</p>}
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** Runs a credential-confirmed POST to /api/auth/<path>. */
function useAuthAction() {
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function run<T extends { message?: string }>(
    e: FormEvent<HTMLFormElement>,
    path: string,
    after?: (data: T) => void,
  ) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    if (!fields.code) delete fields.code;
    try {
      const data = await api<T>("/api/auth/" + path, {
        method: "POST",
        body: JSON.stringify(fields),
      });
      after?.(data);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return { error, notice, setNotice, setError, busy, run };
}

function PasswordForm() {
  const a = useAuthAction();
  return (
    <form
      className="form"
      onSubmit={(e) => a.run(e, "password", () => signOut())}
    >
      <ConfirmIdentity />
      <Field
        label="New password"
        hint="At least 12 characters. A short phrase is easier to remember."
      >
        {({ id, hintId }) => (
          <input
            id={id}
            aria-describedby={hintId}
            className="input"
            name="newPassword"
            type="password"
            minLength={12}
            maxLength={72}
            required
            autoComplete="new-password"
          />
        )}
      </Field>
      {a.error && <Alert>{a.error}</Alert>}
      <div className="form-actions">
        <SubmitButton busy={a.busy} busyLabel="Changing…">
          Change password
        </SubmitButton>
      </div>
    </form>
  );
}

function TwoStep({ enabled }: { enabled: boolean }) {
  const a = useAuthAction();
  const [secret, setSecret] = useState(""),
    [copied, setCopied] = useState(false);
  if (secret)
    return (
      <form
        className="form"
        onSubmit={(e) => a.run(e, "mfa/enable", () => signOut())}
      >
        <ol className="grid gap-2 pl-5 list-decimal text-[0.9rem] text-ink-2">
          <li>Open your authenticator app and add a new account.</li>
          <li>Choose to enter a setup key, and paste the key below.</li>
          <li>Type the six-digit code the app shows to finish.</li>
        </ol>
        <div className="grid gap-2">
          <span className="field-label">Setup key</span>
          <code className="secret">{secret}</code>
          <div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(secret);
                  setCopied(true);
                } catch {
                  a.setError("Couldn't copy automatically. Select the key and copy it instead.");
                }
              }}
            >
              <Copy size={14} aria-hidden="true" />
              {copied ? "Copied" : "Copy key"}
            </button>
          </div>
        </div>
        <Field label="Six-digit code">
          {({ id }) => (
            <input
              id={id}
              className="input input-code"
              name="code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              required
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="123456"
            />
          )}
        </Field>
        {a.error && <Alert>{a.error}</Alert>}
        <p className="field-hint">
          Turning this on signs you out. Sign back in with your password and a
          code from the app.
        </p>
        <div className="form-actions">
          <SubmitButton busy={a.busy} busyLabel="Turning on…">
            Turn on two-step verification
          </SubmitButton>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setSecret("")}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  return (
    <form
      className="form"
      onSubmit={(e) =>
        a.run<{ message?: string; secret?: string }>(
          e,
          enabled ? "mfa/disable" : "mfa/setup",
          (d) => {
            if (enabled) signOut();
            else if (d.secret) setSecret(d.secret);
          },
        )
      }
    >
      <p>
        <span className={"pill " + (enabled ? "pill-ok" : "")}>
          {enabled ? "On" : "Off"}
        </span>
      </p>
      <ConfirmIdentity />
      {a.error && <Alert>{a.error}</Alert>}
      {enabled && (
        <p className="field-hint">
          Turning this off signs you out on every device.
        </p>
      )}
      <div className="form-actions">
        <SubmitButton
          className={enabled ? "btn btn-danger-quiet" : "btn btn-primary"}
          busy={a.busy}
          busyLabel={enabled ? "Turning off…" : "Starting setup…"}
        >
          {enabled ? "Turn off two-step verification" : "Set up two-step verification"}
        </SubmitButton>
      </div>
    </form>
  );
}

/** "Chrome on Windows" from a user-agent string; falls back to the raw text. */
function deviceName(ua: string) {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  if (!browser && !os) return ua.length > 60 ? ua.slice(0, 60) + "…" : ua;
  return [browser || "Browser", os].filter(Boolean).join(" on ");
}

function Sessions() {
  const [sessions, setSessions] = useState<Session[] | null>(null),
    [revision, setRevision] = useState(0),
    [pending, setPending] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    api<Session[]>("/api/auth/sessions")
      .then(setSessions)
      .catch((e) => setError(message(e)));
  }, [revision]);
  async function revoke(id: string) {
    setPending(id);
    setError("");
    try {
      await api("/api/auth/sessions/" + id, { method: "DELETE", body: "{}" });
      setRevision((x) => x + 1);
    } catch (e) {
      setError(message(e));
    } finally {
      setPending("");
    }
  }
  async function everywhere() {
    if (
      !window.confirm(
        "Sign out on every device, including this one?",
      )
    )
      return;
    setPending("all");
    try {
      await api("/api/auth/logout-all", { method: "POST", body: "{}" });
      signOut();
    } catch (e) {
      setError(message(e));
      setPending("");
    }
  }
  return (
    <div className="stack">
      {sessions === null && !error ? (
        <RowsSkeleton rows={2} />
      ) : (
        sessions && (
          <ul className="rows">
            {sessions.map((s) => (
              <li key={s._id}>
                <Monitor size={18} aria-hidden="true" className="text-ink-3" />
                <div className="row-main">
                  <p className="font-medium" title={s.device}>
                    {deviceName(s.device)}
                  </p>
                  <p className="meta">
                    Signed in {formatDateTime(s.createdAt)} · expires{" "}
                    {formatDateTime(s.expiresAt)}
                  </p>
                </div>
                <div className="row-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={!!pending}
                    onClick={() => revoke(s._id)}
                  >
                    {pending === s._id && <Spinner size={14} />}
                    Sign out
                    <span className="sr-only"> of {deviceName(s.device)}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )
      )}
      {error && <Alert>{error}</Alert>}
      <div>
        <button
          className="btn btn-danger-quiet"
          disabled={!!pending}
          onClick={everywhere}
        >
          {pending === "all" ? <Spinner /> : <LogOut size={16} aria-hidden="true" />}
          Sign out everywhere
        </button>
      </div>
    </div>
  );
}

export default function Account() {
  const { user } = useTeam();
  const [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [sending, setSending] = useState(false);
  async function resend() {
    setSending(true);
    setNotice("");
    setError("");
    try {
      const d = await api<{ message: string }>("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email: user?.email }),
      });
      setNotice(friendly(d.message));
    } catch (e) {
      setError(message(e));
    } finally {
      setSending(false);
    }
  }
  return (
    <AppShell
      title="Account & security"
      description="Manage how you sign in and what happens to your data."
      needsTeam={false}
    >
      {user && (
        <div className="sections">
          <Section id="profile" title="Profile">
            <dl className="kv">
              <div>
                <dt>Name</dt>
                <dd>{user.name}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>
                  {user.email}{" "}
                  <span className={"pill ml-1 " + (user.emailVerified ? "pill-ok" : "pill-warn")}>
                    {user.emailVerified ? "Verified" : "Not verified"}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{roleLabel[user.role]}</dd>
              </div>
              {formatDate(user.createdAt) && (
                <div>
                  <dt>Joined</dt>
                  <dd>{formatDate(user.createdAt)}</dd>
                </div>
              )}
            </dl>
            {!user.emailVerified && (
              <div className="mt-4 grid gap-3">
                <div>
                  <button className="btn btn-secondary btn-sm" onClick={resend} disabled={sending}>
                    {sending && <Spinner size={14} />}
                    Send verification email
                  </button>
                </div>
                {error && <Alert>{error}</Alert>}
                {notice && <Alert tone="success">{notice}</Alert>}
              </div>
            )}
          </Section>
          <Section
            id="password"
            title="Password"
            description="You'll be signed out after changing it."
          >
            <PasswordForm />
          </Section>
          <Section
            id="two-step"
            title="Two-step verification"
            description="Ask for a code from an authenticator app each time you sign in with your password. Resetting a forgotten password will also need a code."
          >
            <TwoStep enabled={!!user.mfaEnabled} />
          </Section>
          {user.mfaEnabled && (
            <Section
              id="recovery"
              title="Recovery codes"
              description="Use one if you lose your authenticator. Generating a new set replaces any codes you saved before."
            >
              <MfaRecovery />
            </Section>
          )}
          <section className="settings-section" aria-labelledby="passkeys">
            <header>
              <h2 className="section-title" id="passkeys">
                Passkeys
              </h2>
              <p className="section-desc">
                Sign in with your fingerprint, face, screen lock, or a security
                key instead of typing your password.
              </p>
            </header>
            <div className="min-w-0">
              <Passkeys />
            </div>
          </section>
          <Section
            id="sessions"
            title="Where you're signed in"
            description="Sessions last eight hours. Sign out of any device you don't recognize."
          >
            <Sessions />
          </Section>
          <Section
            id="export"
            title="Export your data"
            description="Download your name, email, and every check-in you've posted as a JSON Lines file."
          >
            <ExportData />
          </Section>
          <Section
            id="delete"
            title="Delete account"
            danger
            description="You're removed from every team and signed out right away. Your account is permanently deleted after 30 days."
          >
            <DeleteAccount />
          </Section>
        </div>
      )}
    </AppShell>
  );
}
