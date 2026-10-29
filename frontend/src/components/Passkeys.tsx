"use client";
import { useState, useEffect, FormEvent } from "react";
import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { ChevronRight, Fingerprint, KeyRound } from "lucide-react";
import { api, formatDate, message, signOut } from "@/lib/api";
import { Alert, ConfirmIdentity, Field, SubmitButton } from "./ui";

/** Browsers report a cancelled passkey prompt with this wording. */
function passkeyMessage(e: unknown) {
  const m = message(e);
  return /not allowed|timed out|cancel/i.test(m)
    ? "The passkey request was cancelled or timed out. Try again when you're ready."
    : m;
}

export function PasskeyLogin() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function login() {
    setBusy(true);
    setError("");
    try {
      const optionsJSON = await api<PublicKeyCredentialRequestOptionsJSON>(
        "/api/passkeys/login/options",
        { method: "POST", body: "{}" },
      );
      const response = await startAuthentication({ optionsJSON });
      const result = await api<{ role: string }>("/api/passkeys/login/verify", {
        method: "POST",
        body: JSON.stringify(response),
      });
      localStorage.removeItem("activeTeamId");
      window.location.assign(
        result.role === "member" ? "/dashboard" : "/admin/dashboard",
      );
    } catch (e) {
      setError(passkeyMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-3">
      <SubmitButton
        className="btn btn-secondary btn-block"
        busy={busy}
        busyLabel="Waiting for your passkey…"
        type="button"
        onClick={login}
      >
        <Fingerprint size={16} aria-hidden="true" />
        Sign in with a passkey
      </SubmitButton>
      {error && <Alert>{error}</Alert>}
    </div>
  );
}

type Key = { _id: string; createdAt: string };

export default function Passkeys() {
  const [keys, setKeys] = useState<Key[] | null>(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api<Key[]>("/api/passkeys")
      .then(setKeys)
      .catch((e) => setError(message(e)));
  }, [revision]);
  async function remove(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const key = data.key;
    delete data.key;
    if (!data.code) delete data.code;
    try {
      await api("/api/passkeys/" + key, {
        method: "DELETE",
        body: JSON.stringify(data),
      });
      signOut();
    } catch (e) {
      setError(message(e));
      setBusy(false);
    }
  }
  async function register(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    setNotice("");
    const data = Object.fromEntries(new FormData(form));
    if (!data.code) delete data.code;
    try {
      const optionsJSON = await api<PublicKeyCredentialCreationOptionsJSON>(
        "/api/passkeys/register/options",
        { method: "POST", body: JSON.stringify(data) },
      );
      const response = await startRegistration({ optionsJSON });
      const result = await api<{ message: string }>(
        "/api/passkeys/register/verify",
        { method: "POST", body: JSON.stringify(response) },
      );
      setNotice(result.message);
      form.reset();
      setRevision((value) => value + 1);
    } catch (e) {
      setError(passkeyMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack">
      {keys && keys.length > 0 && (
        <ul className="rows">
          {keys.map((key, index) => (
            <li key={key._id}>
              <KeyRound size={16} aria-hidden="true" className="text-ink-3" />
              <div className="row-main">
                <p className="font-medium">Passkey {index + 1}</p>
                <p className="meta">Added {formatDate(key.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form className="form" onSubmit={register}>
        <ConfirmIdentity />
        <div className="form-actions">
          <SubmitButton
            className="btn btn-secondary"
            busy={busy}
            busyLabel="Waiting for your device…"
          >
            <Fingerprint size={16} aria-hidden="true" />
            Register passkey
          </SubmitButton>
        </div>
      </form>
      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}
      {keys && keys.length > 0 && (
        <details className="disclosure">
          <summary>
            <ChevronRight size={15} aria-hidden="true" />
            Remove a passkey ({keys.length})
          </summary>
          <form className="form" onSubmit={remove}>
            <p className="section-desc">
              Removing a passkey signs you out on every device. You can still
              sign in with your password.
            </p>
            <Field label="Passkey">
              {({ id }) => (
                <select id={id} className="select" name="key" required>
                  {keys.map((key, index) => (
                    <option key={key._id} value={key._id}>
                      Passkey {index + 1} · added {formatDate(key.createdAt)}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <ConfirmIdentity
              passwordLabel="Confirm password"
              codeLabel="Confirm authenticator code"
            />
            <div className="form-actions">
              <SubmitButton
                className="btn btn-danger-quiet"
                busy={busy}
                busyLabel="Removing…"
              >
                Remove passkey and sign out
              </SubmitButton>
            </div>
          </form>
        </details>
      )}
    </div>
  );
}
