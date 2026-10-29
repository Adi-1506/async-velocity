"use client";
import { PasskeyLogin } from "./Passkeys";
import BotCheck from "./BotCheck";
import AuthLayout from "./AuthLayout";
import { Alert, Field, SubmitButton } from "./ui";
import Link from "next/link";
import { useState, FormEvent, ReactNode } from "react";
import { z } from "zod";
import { api, message, notice as friendly } from "@/lib/api";

type Mode = "login" | "admin" | "register" | "forgot" | "reset" | "verify";

const copy: Record<
  Mode,
  { title: string; lede: string; button: string; busy: string }
> = {
  login: {
    title: "Welcome back",
    lede: "Sign in to see what your team is working on.",
    button: "Sign in",
    busy: "Signing in…",
  },
  admin: {
    title: "Admin sign-in",
    lede: "For team and workspace admins.",
    button: "Sign in",
    busy: "Signing in…",
  },
  register: {
    title: "Create your account",
    lede: "Once you're set up, a team admin can add you to your team.",
    button: "Create account",
    busy: "Creating your account…",
  },
  forgot: {
    title: "Reset your password",
    lede: "Enter the email you signed up with and we'll send you a link to choose a new password.",
    button: "Send reset link",
    busy: "Sending…",
  },
  reset: {
    title: "Choose a new password",
    lede: "You'll sign in with it from now on.",
    button: "Save new password",
    busy: "Saving…",
  },
  verify: {
    title: "Confirm your email",
    lede: "One click and your account is ready.",
    button: "Confirm email",
    busy: "Confirming…",
  },
};

const email = z
  .string()
  .email("Enter a valid email address, like name@company.com.")
  .max(254, "That email address is too long.");
const newPassword = z
  .string()
  .min(12, "Use at least 12 characters for your password.")
  .max(72, "Passwords can be up to 72 characters.");

export default function AuthForm({ mode = "login" }: { mode?: Mode }) {
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [done, setDone] = useState(false),
    [busy, setBusy] = useState(false);
  const c = copy[mode];
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const f = new FormData(e.currentTarget);
    try {
      const address = String(f.get("email") || "")
          .trim()
          .toLowerCase(),
        password = String(f.get("password") || ""),
        code = String(f.get("code") || "");
      let path = "/api/auth/login";
      let body: Record<string, string> = {
        email: address,
        password,
        ...(code ? { code } : {}),
        website: String(f.get("website") || ""),
      };
      if (mode !== "reset" && mode !== "verify") email.parse(address);
      if (mode === "admin") path = "/api/admin/auth/login";
      if (mode === "register") {
        newPassword.parse(password);
        path = "/api/auth/register";
        body = {
          email: address,
          password,
          name: String(f.get("name") || ""),
          website: body.website,
        };
      }
      if (mode === "forgot") {
        path = "/api/auth/forgot-password";
        body = { email: address, website: String(f.get("website") || "") };
      }
      if (mode === "reset" || mode === "verify") {
        const token =
          new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
        if (!token)
          throw new Error(
            "This link is incomplete. Open the link from your email again.",
          );
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
        if (mode === "reset") newPassword.parse(password);
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
      } else {
        setNotice(friendly(data.message));
        setDone(true);
      }
    } catch (e) {
      setError(
        e instanceof z.ZodError
          ? e.issues.map((x) => x.message).join(" ")
          : message(e),
      );
    } finally {
      setBusy(false);
      window.turnstile?.reset();
    }
  }

  const signIn = mode === "login" || mode === "admin";
  let footer: ReactNode;
  if (mode === "login")
    footer = (
      <>
        <p>
          New to Daybrief? <Link href="/register">Create an account</Link>
        </p>
        <p>
          Team admin? <Link href="/admin/login">Use admin sign-in</Link>
        </p>
        <p>
          Lost your authenticator?{" "}
          <Link href="/recover-mfa">Recover your account</Link>
        </p>
      </>
    );
  else if (mode === "admin")
    footer = (
      <>
        <p>
          Not an admin? <Link href="/login">Use member sign-in</Link>
        </p>
        <p>
          Lost your authenticator?{" "}
          <Link href="/recover-mfa">Recover your account</Link>
        </p>
      </>
    );
  else if (mode === "register")
    footer = (
      <p>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    );
  else
    footer = (
      <p>
        <Link href="/login">Back to sign in</Link>
      </p>
    );

  // After a successful reset or verification there's nothing left to fill in.
  if (done && (mode === "reset" || mode === "verify"))
    return (
      <AuthLayout title={mode === "reset" ? "Password updated" : "Email confirmed"}>
        <div className="grid gap-5 mt-6">
          {notice && <Alert tone="success">{notice}</Alert>}
          <Link className="btn btn-primary btn-block" href="/login">
            Sign in
          </Link>
        </div>
      </AuthLayout>
    );

  return (
    <AuthLayout title={c.title} lede={c.lede} footer={footer}>
      <form className="form" onSubmit={submit}>
        {mode === "register" && (
          <Field label="Name">
            {({ id }) => (
              <input
                id={id}
                className="input"
                name="name"
                required
                maxLength={100}
                autoComplete="name"
              />
            )}
          </Field>
        )}
        {!["reset", "verify"].includes(mode) && (
          <Field label="Email">
            {({ id }) => (
              <input
                id={id}
                className="input"
                type="email"
                name="email"
                required
                maxLength={254}
                autoComplete="email"
                placeholder="name@company.com"
              />
            )}
          </Field>
        )}
        {!["forgot", "verify"].includes(mode) && (
          <Field
            label={mode === "reset" ? "New password" : "Password"}
            hint={
              ["register", "reset"].includes(mode)
                ? "At least 12 characters. A short phrase works well."
                : undefined
            }
            aside={
              signIn ? (
                <Link className="text-link" href="/forgot-password">
                  Forgot password?
                </Link>
              ) : undefined
            }
          >
            {({ id, hintId }) => (
              <input
                id={id}
                aria-describedby={hintId}
                className="input"
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
            )}
          </Field>
        )}
        {["login", "admin", "reset"].includes(mode) && (
          <Field
            label="Authenticator code"
            optional
            hint="Only if you've turned on two-step verification."
          >
            {({ id, hintId }) => (
              <input
                id={id}
                aria-describedby={hintId}
                className="input input-code"
                name="code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoComplete="one-time-code"
                placeholder="123456"
              />
            )}
          </Field>
        )}
        <label className="honeypot" aria-hidden="true">
          Leave empty
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        {["login", "admin", "register", "forgot", "reset"].includes(mode) && (
          <BotCheck />
        )}
        <SubmitButton
          className="btn btn-primary btn-block"
          busy={busy}
          busyLabel={c.busy}
        >
          {c.button}
        </SubmitButton>
      </form>
      {signIn && (
        <>
          <p className="auth-alt">or</p>
          <PasskeyLogin />
        </>
      )}
    </AuthLayout>
  );
}
