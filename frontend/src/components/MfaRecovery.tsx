"use client";
import { FormEvent, useState } from "react";
import { api, message } from "@/lib/api";
import BotCheck from "./BotCheck";
export default function MfaRecovery({
  recover = false,
}: {
  recover?: boolean;
}) {
  const [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    setNotice("");
    setCodes([]);
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
  return (
    <section className="card">
      <h2>{recover ? "Recover authenticator access" : "MFA recovery codes"}</h2>
      <p>
        {recover
          ? "Use your password and one saved recovery code if you lost your authenticator. This removes MFA, signs out all devices, and invalidates every old recovery code."
          : "With MFA enabled, generate backup codes and store them in a password manager. They are shown once. Generating a new set invalidates the previous set."}
      </p>
      <form onSubmit={submit}>
        {recover && (
          <label>
            Email
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
            />
          </label>
        )}
        <label>
          {recover ? "Password" : "Confirm current password"}
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </label>
        {recover ? (
          <>
            <label>
              Recovery code
              <input
                name="recoveryCode"
                required
                pattern="[a-f0-9]{32}"
                maxLength={32}
                autoComplete="off"
              />
            </label>
            <label className="honeypot" aria-hidden="true">
              Leave empty
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
            <BotCheck />
          </>
        ) : (
          <label>
            Current authenticator code
            <input
              name="code"
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="one-time-code"
            />
          </label>
        )}
        <button disabled={busy}>
          {recover ? "Recover account" : "Generate new recovery codes"}
        </button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {codes.length > 0 && (
        <div role="status">
          <p>
            Save these codes now. They will disappear when you leave this page.
          </p>
          <pre>{codes.join("\n")}</pre>
          <button className="secondary" onClick={() => setCodes([])}>
            I have saved my codes
          </button>
        </div>
      )}
    </section>
  );
}
