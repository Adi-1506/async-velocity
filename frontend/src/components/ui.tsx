"use client";
import { ButtonHTMLAttributes, ReactNode, useId } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Info,
  LoaderCircle,
  type LucideIcon,
} from "lucide-react";

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "success" | "info";
  children: ReactNode;
}) {
  const Icon =
    tone === "error" ? CircleAlert : tone === "success" ? CircleCheck : Info;
  return (
    <div
      className={"alert alert-" + tone}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon size={16} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

/** Renders an error and/or a success message when present. */
export function Feedback({
  error,
  notice,
}: {
  error?: string;
  notice?: string;
}) {
  return (
    <>
      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}
    </>
  );
}

export function Field({
  label,
  hint,
  optional,
  children,
  aside,
}: {
  label: string;
  hint?: ReactNode;
  optional?: boolean;
  children: (ids: { id: string; hintId?: string }) => ReactNode;
  aside?: ReactNode;
}) {
  const id = useId(),
    hintId = hint ? id + "-hint" : undefined;
  return (
    <div className="field">
      <div className="field-row">
        <label className="field-label" htmlFor={id}>
          {label}
          {optional && <span className="optional"> (optional)</span>}
        </label>
        {aside}
      </div>
      {children({ id, hintId })}
      {hint && (
        <p className="field-hint" id={hintId}>
          {hint}
        </p>
      )}
    </div>
  );
}

/** Password plus optional authenticator code, used by every sensitive action. */
export function ConfirmIdentity({
  passwordLabel = "Current password",
  codeLabel = "Authenticator code",
}: {
  passwordLabel?: string;
  codeLabel?: string;
}) {
  return (
    <>
      <Field label={passwordLabel}>
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
      <Field
        label={codeLabel}
        optional
        hint="Only needed if two-step verification is on."
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
    </>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <LoaderCircle size={size} className="spin" aria-hidden="true" />;
}

export function SubmitButton({
  busy,
  busyLabel,
  children,
  className = "btn btn-primary",
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
  busyLabel: string;
}) {
  return (
    <button className={className} disabled={busy || disabled} {...rest}>
      {busy && <Spinner />}
      {busy ? busyLabel : children}
    </button>
  );
}

export function Empty({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon" aria-hidden="true">
        <Icon size={20} />
      </span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Pager({
  page,
  hasNext,
  busy,
  onChange,
}: {
  page: number;
  hasNext: boolean;
  busy?: boolean;
  onChange: (page: number) => void;
}) {
  if (page === 1 && !hasNext) return null;
  return (
    <nav className="pager" aria-label="Pagination">
      <button
        className="btn btn-secondary btn-sm"
        disabled={page === 1 || busy}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={16} aria-hidden="true" />
        Newer
      </button>
      <span className="meta">Page {page}</span>
      <button
        className="btn btn-secondary btn-sm"
        disabled={!hasNext || busy}
        onClick={() => onChange(page + 1)}
      >
        Older
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}

export function initials(name?: string) {
  if (!name) return "?";
  const words = name.trim().split(/\s+/),
    alpha = words.filter((w) => /^\p{L}/u.test(w)),
    parts = alpha.length ? alpha : words;
  return (
    (parts[0]?.[0] || "") + (parts.length > 1 ? parts.at(-1)?.[0] || "" : "")
  ).toUpperCase();
}
function tone(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return String(h % 5);
}
export function Avatar({
  name,
  seed,
  large,
}: {
  name?: string;
  seed?: string;
  large?: boolean;
}) {
  return (
    <span
      className={"avatar" + (large ? " avatar-lg" : "")}
      data-tone={tone(seed || name || "")}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function FeedSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="feed" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div className="entry" key={i}>
          <span className="skeleton sk-avatar" />
          <div className="entry-body">
            <span className="skeleton sk-line sk-w-30" />
            <span className="skeleton sk-line sk-w-90" />
            <span className="skeleton sk-line sk-w-60" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="rows" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i}>
          <span className="skeleton sk-avatar" />
          <div className="row-main stack">
            <span className="skeleton sk-line sk-w-60" />
          </div>
        </li>
      ))}
    </ul>
  );
}
