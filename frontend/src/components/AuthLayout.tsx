import Link from "next/link";
import { ReactNode } from "react";
import { CircleAlert, LayoutList, PenLine } from "lucide-react";
import { BrandMark } from "./AppShell";

export default function AuthLayout({
  title,
  lede,
  children,
  footer,
}: {
  title: string;
  lede?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="auth">
      <aside className="auth-aside" aria-label="About Daybrief">
        <Link className="brand" href="/login">
          <BrandMark />
          Daybrief
        </Link>
        <div className="auth-pitch">
          <h2>Keep your team in the loop.</h2>
          <ul className="auth-points">
            <li>
              <PenLine size={18} aria-hidden="true" />
              Post a short check-in whenever it suits your day.
            </li>
            <li>
              <LayoutList size={18} aria-hidden="true" />
              See what everyone finished and what&apos;s next, in one feed.
            </li>
            <li>
              <CircleAlert size={18} aria-hidden="true" />
              Spot blockers early and clear them together.
            </li>
          </ul>
        </div>
        <span />
      </aside>
      <main className="auth-main">
        <div className="auth-form">
          <Link className="brand" href="/login">
            <BrandMark />
            Daybrief
          </Link>
          <h1>{title}</h1>
          {lede && <p className="page-lede">{lede}</p>}
          {children}
          {footer && <div className="auth-foot">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
