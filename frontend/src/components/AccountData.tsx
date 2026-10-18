"use client";
import { useState, FormEvent } from "react";
import { API, api, message, signOut } from "@/lib/api";
export default function AccountData() {
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget,
      body = Object.fromEntries(new FormData(form));
    if (!body.code) delete body.code;
    const action = (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
      "value",
    );
    try {
      if (action === "delete") {
        if (
          !window.confirm(
            "Disable your account and schedule permanent deletion after 30 days?",
          )
        )
          return;
        await api("/api/account/delete", {
          method: "POST",
          body: JSON.stringify(body),
        });
        signOut();
      } else {
        const r = await fetch(API + "/api/account/export", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error((await r.json()).message);
        const url = URL.createObjectURL(await r.blob()),
          a = document.createElement("a");
        a.href = url;
        a.download = "standup-data.ndjson";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      setError(message(e));
    }
  }
  return (
    <section className="card">
      <h2>Your data</h2>
      <p>
        Export your own check-ins or disable your account. Both actions require
        fresh authentication.
      </p>
      <form onSubmit={submit}>
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
        <div className="actions">
          <button name="action" value="export">
            Export my data
          </button>
          <button className="danger" name="action" value="delete">
            Delete my account
          </button>
        </div>
      </form>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
