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
import { api, message, signOut } from "@/lib/api";
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
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button className="secondary" disabled={busy} onClick={login}>
        Sign in with a passkey
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
export default function Passkeys() {
  const [keys, setKeys] = useState<{ _id: string; createdAt: string }[]>([]);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api<{ _id: string; createdAt: string }[]>("/api/passkeys")
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
    } finally {
      setBusy(false);
    }
  }
  async function register(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
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
      setRevision((value) => value + 1);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card">
      <h2>Passkeys</h2>
      <p>
        Use your device's screen lock or security key to sign in. Registering a
        key requires your password and, if enabled, an authenticator code.
      </p>
      <form onSubmit={register}>
        <label>
          Current password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </label>
        <label>
          Authenticator code (if enabled)
          <input
            name="code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
          />
        </label>
        <button disabled={busy}>Register passkey</button>
      </form>
      {keys.length > 0 && (
        <details>
          <summary>Manage registered passkeys ({keys.length})</summary>
          <p>
            Removing a key signs out all sessions. Your password remains
            available for sign-in.
          </p>
          <form onSubmit={remove}>
            <label>
              Passkey to remove
              <select name="key" required>
                {keys.map((key, index) => (
                  <option key={key._id} value={key._id}>
                    Passkey {index + 1} · added{" "}
                    {new Date(key.createdAt).toLocaleString()}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Confirm password
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
            <label>
              Confirm authenticator code (if enabled)
              <input
                name="code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
              />
            </label>
            <button className="danger" disabled={busy}>
              Remove passkey and sign out
            </button>
          </form>
        </details>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
    </section>
  );
}
