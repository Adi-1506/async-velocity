"use client";
import { PasskeyLogin } from "./Passkeys";
import BotCheck from "./BotCheck";
import Link from "next/link";
import { useState, FormEvent } from "react";
import { z } from "zod";
import { api, message } from "@/lib/api";
export default function AuthForm({
  mode = "login",
}: {
  mode?: "login" | "admin" | "register" | "forgot" | "reset" | "verify";
}) {
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const title = {
    login: "Welcome back",
    admin: "Administrator sign in",
    register: "Create your account",
    forgot: "Reset your password",
    reset: "Choose a new password",
    verify: "Verify your email",
  }[mode];
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const f = new FormData(e.currentTarget);
    try {
      const email = String(f.get("email") || "")
          .trim()
          .toLowerCase(),
        password = String(f.get("password") || ""),
        code = String(f.get("code") || "");
      let path = "/api/auth/login";
      let body: Record<string, string> = {
        email,
        password,
        ...(code ? { code } : {}),
        website: String(f.get("website") || ""),
      };
      if (mode !== "reset" && mode !== "verify")
        z.string().email().max(254).parse(email);
      if (mode === "admin") path = "/api/admin/auth/login";
      if (mode === "register") {
        z.string().min(12).max(72).parse(password);
        path = "/api/auth/register";
        body = {
          email,
          password,
          name: String(f.get("name") || ""),
          website: body.website,
        };
      }
      if (mode === "forgot") {
        path = "/api/auth/forgot-password";
        body = { email, website: String(f.get("website") || "") };
      }
      if (mode === "reset" || mode === "verify") {
        const token =
          new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
        path =
          mode === "reset"
            ? "/api/auth/reset-password"
            : "/api/auth/verify-email";
        body =
          mode === "reset"
            ? {
                token,
                password,
                website: String(f.get("website") || ""),
                ...(code ? { code } : {}),
              }
            : { token };
        if (mode === "reset") z.string().min(12).max(72).parse(password);
      }
      if (["login", "admin", "register", "forgot", "reset"].includes(mode))
        body.turnstileToken = String(f.get("turnstileToken") || "");
      const data = await api<{ message: string; role?: string }>(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (mode === "login" || mode === "admin") {
        localStorage.removeItem("activeTeamId");
        window.location.assign(
          mode === "admin" ? "/admin/dashboard" : "/dashboard",
        );
      } else setNotice(data.message);
    } catch (e) {
      setError(
        e instanceof z.ZodError
          ? e.issues.map((x) => x.message).join("; ")
          : message(e),
      );
    } finally {
      setBusy(false);
      window.turnstile?.reset();
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="brand">
          Standup<span>Bot</span>
        </Link>
        <p className="eyebrow">A CALMER WAY TO WORK TOGETHER</p>
        <h1>{title}</h1>
        <p className="muted">
          Share progress, surface blockers, and keep your team in sync.
        </p>
        <form onSubmit={submit}>
          {mode === "register" && (
            <label>
              Name
              <input name="name" required maxLength={100} autoComplete="name" />
            </label>
          )}
          {!["reset", "verify"].includes(mode) && (
            <label>
              Email
              <input
                type="email"
                name="email"
                required
                maxLength={254}
                autoComplete="email"
              />
            </label>
          )}
          {!["forgot", "verify"].includes(mode) && (
            <label>
              Password
              <input
                name="password"
                type="password"
                required
                minLength={["register", "reset"].includes(mode) ? 12 : 1}
                maxLength={72}
                autoComplete={
                  ["register", "reset"].includes(mode)
                    ? "new-password"
                    : "current-password"
                }
              />
            </label>
          )}
          {["login", "admin", "reset"].includes(mode) && (
            <label>
              Authenticator code <span className="muted">(if enabled)</span>
              <input
                name="code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoComplete="one-time-code"
              />
            </label>
          )}
          <label className="honeypot" aria-hidden="true">
            Leave empty
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
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
          {["login", "admin", "register", "forgot", "reset"].includes(mode) && (
            <BotCheck />
          )}
          <button disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "verify"
                ? "Verify email"
                : "Continue"}
          </button>
        </form>
        {(mode === "login" || mode === "admin") && <PasskeyLogin />}
        <div className="auth-links">
          <Link href="/login">Member sign in</Link>
          <Link href="/admin/login">Admin sign in</Link>
          <Link href="/register">Register</Link>
          <Link href="/forgot-password">Forgot password?</Link>
          <Link href="/recover-mfa">Lost your authenticator?</Link>
        </div>
      </section>
    </main>
  );
}
