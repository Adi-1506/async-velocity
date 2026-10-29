"use client";
import { useState, FormEvent } from "react";
import { Download, Trash2 } from "lucide-react";
import { API, api, message, signOut } from "@/lib/api";
import { Alert, ConfirmIdentity, SubmitButton } from "./ui";

function credentials(form: HTMLFormElement) {
  const body = Object.fromEntries(new FormData(form));
  if (!body.code) delete body.code;
  return body;
}

export function ExportData() {
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const r = await fetch(API + "/api/account/export", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials(form)),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      const url = URL.createObjectURL(await r.blob()),
        a = document.createElement("a");
      a.href = url;
      a.download = "daybrief-my-data.ndjson";
      a.click();
      URL.revokeObjectURL(url);
      form.reset();
      setNotice("Your download has started.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form" onSubmit={submit}>
      <ConfirmIdentity />
      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}
      <div className="form-actions">
        <SubmitButton
          className="btn btn-secondary"
          busy={busy}
          busyLabel="Preparing…"
        >
          <Download size={16} aria-hidden="true" />
          Download my data
        </SubmitButton>
      </div>
    </form>
  );
}

export function DeleteAccount() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (
      !window.confirm(
        "Delete your account?\n\nYou'll be signed out and your account will be disabled right away. Your data is permanently deleted after 30 days.",
      )
    )
      return;
    setBusy(true);
    try {
      await api("/api/account/delete", {
        method: "POST",
        body: JSON.stringify(credentials(e.currentTarget)),
      });
      signOut();
    } catch (e) {
      setError(message(e));
      setBusy(false);
    }
  }
  return (
    <form className="form" onSubmit={submit}>
      <ConfirmIdentity />
      {error && <Alert>{error}</Alert>}
      <div className="form-actions">
        <SubmitButton className="btn btn-danger" busy={busy} busyLabel="Deleting…">
          <Trash2 size={16} aria-hidden="true" />
          Delete my account
        </SubmitButton>
      </div>
    </form>
  );
}
