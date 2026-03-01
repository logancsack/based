import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

function joinClasses(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export interface TopNavLink {
  href: string;
  label: string;
  external?: boolean;
}

export function TopNav({ brand, links, className }: { brand: ReactNode; links: TopNavLink[]; className?: string }) {
  return (
    <header className={joinClasses("webui-topnav", className)}>
      <div className="webui-topnav-inner">
        <a className="webui-brand" href="/">
          {brand}
        </a>
        <nav aria-label="Primary">
          {links.map((link) => (
            <a
              className="webui-nav-link"
              key={link.href}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function Surface({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <section className={joinClasses("webui-surface", className)} {...rest}>
      {children}
    </section>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="webui-section-title">
      {eyebrow ? <p className="webui-eyebrow">{eyebrow}</p> : null}
      <h2>{title}</h2>
      {description ? <p className="webui-description">{description}</p> : null}
    </div>
  );
}

export function CodeBlock({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <pre className={joinClasses("webui-code", className)}>
      <code>{children}</code>
    </pre>
  );
}

type ButtonVariant = "primary" | "ghost";

function buttonClass(variant: ButtonVariant, className?: string): string {
  return joinClasses("webui-btn", variant === "ghost" ? "webui-btn-ghost" : "webui-btn-primary", className);
}

export function UiButton({
  variant = "primary",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={buttonClass(variant, className)} {...rest} />;
}

export function UiLinkButton({
  variant = "primary",
  className,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: ButtonVariant }) {
  return <a className={buttonClass(variant, className)} {...rest} />;
}
