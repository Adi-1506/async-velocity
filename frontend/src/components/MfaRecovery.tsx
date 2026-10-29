"use client";
import { FormEvent, useState } from "react";
import { Copy } from "lucide-react";
import { api, message } from "@/lib/api";
import BotCheck from "./BotCheck";
import { Alert, Field, SubmitButton } from "./ui";

export default function MfaRecovery({
  recover = false,
}: {
  recover?: boolean;
}) {
  const [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    setNotice("");
    setCodes([]);
    setCopied(false);
    try {
      const data = Object.fromEntries(new FormData(form));
      const result = await api<{ codes?: string[]; message?: string }>(
        recover ? "/api/auth/mfa/recover" : "/api/auth/mfa/recovery-codes",
        { method: "POST", body: JSON.stringify(data) },
      );
      if (result.codes) setCodes(result.codes);
      if (result.message) setNotice(result.message);
      form.reset();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
      if (recover) window.turnstile?.reset();
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
    } catch {
      setError("Couldn't copy automatically. Select the codes and copy them instead.");
    }
  }
  return (
    <div className="stack">
      <form className="form" onSubmit={submit}>
        {recover && (
          <Field label="Email">
            {({ id }) => (
              <input
                id={id}
                className="input"
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
              />
            )}
          </Field>
        )}
        <Field label={recover ? "Password" : "Current password"}>
          {({ id }) => (
            <input
              id={id}
              className="input"
              name="password"
              type="password"
              required
              maxLength={72}
              autoComplete="current-password"
            />
          )}
        </Field>
        {recover ? (
          <>
            <Field
              label="Recovery code"
              hint="One of the 32-character recovery codes you saved from your account settings."
            >
              {({ id, hintId }) => (
                <input
                  id={id}
                  aria-describedby={hintId}
                  className="input input-code max-w-none"
                  name="recoveryCode"
                  required
                  pattern="[a-f0-9]{32}"
                  maxLength={32}
                  autoComplete="off"
                  spellCheck={false}
                />
              )}
            </Field>
            <label className="honeypot" aria-hidden="true">
              Leave empty
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
            <BotCheck />
          </>
        ) : (
          <Field label="Authenticator code">
            {({ id }) => (
              <input
                id={id}
                className="input input-code"
                name="code"
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoComplete="one-time-code"
                placeholder="123456"
              />
            )}
          </Field>
        )}
        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        <div className="form-actions">
          <SubmitButton
            className={recover ? "btn btn-primary btn-block" : "btn btn-secondary"}
            busy={busy}
            busyLabel={recover ? "Recovering…" : "Generating…"}
          >
            {recover ? "Recover my account" : "Generate new codes"}
          </SubmitButton>
        </div>
      </form>
      {codes.length > 0 && (
        <div className="stack" role="status">
          <Alert tone="info">
            Save these codes somewhere safe, like a password manager. Each one
            works once, and they won&apos;t be shown again after you leave this
            page.
          </Alert>
          <ul className="codes">
            {codes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <div className="form-actions">
            <button className="btn btn-secondary btn-sm" onClick={copy}>
              <Copy size={14} aria-hidden="true" />
              {copied ? "Copied" : "Copy codes"}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setCodes([])}>
              I&apos;ve saved them
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
