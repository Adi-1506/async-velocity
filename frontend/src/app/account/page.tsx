"use client";
import { useState, useEffect, FormEvent } from "react";
import Passkeys from "@/components/Passkeys";
import AccountData from "@/components/AccountData";
import AppShell from "@/components/AppShell";
import { useTeam } from "@/context/TeamContext";
import { api, message, signOut } from "@/lib/api";
type Session = {
  _id: string;
  device: string;
  createdAt: string;
  expiresAt: string;
};
export default function Page() {
  const { user } = useTeam();
  const [sessions, setSessions] = useState<Session[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [secret, setSecret] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    api<Session[]>("/api/auth/sessions")
      .then(setSessions)
      .catch((e) => setError(message(e)));
  }, [revision]);
  async function action(
    e: FormEvent<HTMLFormElement>,
    path: string,
    logout = false,
  ) {
    e.preventDefault();
    setError("");
    setNotice("");
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    if (!fields.code) delete fields.code;
    try {
      const data = await api<{ message?: string; secret?: string }>(
        "/api/auth/" + path,
        { method: "POST", body: JSON.stringify(fields) },
      );
      if (data.secret) setSecret(data.secret);
      setNotice(
        data.message ||
          "Enter this secret in your authenticator app, then confirm its code below.",
      );
      if (logout) signOut();
    } catch (e) {
      setError(message(e));
    }
  }
  const credentials = (
    <>
      <label>
        Current password
        <input
          name="password"
          type="password"
          required
          maxLength={72}
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
          autoComplete="one-time-code"
        />
      </label>
    </>
  );
  return (
    <AppShell title="Account & security">
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && <p className="notice">{notice}</p>}
      <section className="card">
        <h2>{user?.name}</h2>
        <p>{user?.email}</p>
        <p>
          Email {user?.emailVerified ? "verified" : "not verified"} · MFA{" "}
          {user?.mfaEnabled ? "enabled" : "disabled"}
        </p>
        {!user?.emailVerified && (
          <button
            className="secondary"
            onClick={async () => {
              try {
                const d = await api<{ message: string }>(
                  "/api/auth/resend-verification",
                  {
                    method: "POST",
                    body: JSON.stringify({ email: user?.email }),
                  },
                );
                setNotice(d.message);
              } catch (e) {
                setError(message(e));
              }
            }}
          >
            Send verification email
          </button>
        )}
      </section>
      <AccountData />
      <Passkeys />
      <div className="feed-grid">
        <section className="card">
          <h2>Change password</h2>
          <form onSubmit={(e) => action(e, "password", true)}>
            {credentials}
            <label>
              New password
              <input
                name="newPassword"
                type="password"
                minLength={12}
                maxLength={72}
                required
                autoComplete="new-password"
              />
            </label>
            <button>Change password and sign out</button>
          </form>
        </section>
        <section className="card">
          <h2>Authenticator MFA</h2>
          {!secret ? (
            <form
              onSubmit={(e) =>
                action(
                  e,
                  user?.mfaEnabled ? "mfa/disable" : "mfa/setup",
                  !!user?.mfaEnabled,
                )
              }
            >
              {credentials}
              <button>{user?.mfaEnabled ? "Disable MFA" : "Set up MFA"}</button>
            </form>
          ) : (
            <>
              <p>
                Save this secret in your authenticator app. It will not be shown
                again here after you leave.
              </p>
              <code className="user-text">{secret}</code>
              <form onSubmit={(e) => action(e, "mfa/enable", true)}>
                <label>
                  Current six-digit code
                  <input
                    name="code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    required
                    maxLength={6}
                  />
                </label>
                <button>Enable MFA and sign out</button>
              </form>
            </>
          )}
          <p className="muted">
            Keep a secure backup of your authenticator. Password reset still
            requires MFA when enabled.
          </p>
        </section>
      </div>
      <section className="card">
        <h2>Active sessions</h2>
        {sessions.map((s) => (
          <div className="session row" key={s._id}>
            <div>
              <p className="user-text">{s.device}</p>
              <small>Expires {new Date(s.expiresAt).toLocaleString()}</small>
            </div>
            <button
              className="secondary"
              onClick={async () => {
                try {
                  await api("/api/auth/sessions/" + s._id, {
                    method: "DELETE",
                    body: "{}",
                  });
                  setRevision((x) => x + 1);
                } catch (e) {
                  setError(message(e));
                }
              }}
            >
              Revoke
            </button>
          </div>
        ))}
        <button
          className="danger"
          onClick={async () => {
            try {
              await api("/api/auth/logout-all", { method: "POST", body: "{}" });
              signOut();
            } catch (e) {
              setError(message(e));
            }
          }}
        >
          Sign out everywhere
        </button>
      </section>
    </AppShell>
  );
}
