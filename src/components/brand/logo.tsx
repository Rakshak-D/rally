import Link from "next/link";

type LogoProps = { href?: string; compact?: boolean };

export function Logo({ href = "/", compact = false }: LogoProps) {
  const content = (
    <>
      <svg className="brand-mark" aria-hidden="true" viewBox="0 0 36 36" fill="none">
        <path d="M3.5 7H12c6 0 6 9.5 12 9.5h8.5" />
        <path d="M3.5 18h29" />
        <path d="M3.5 29H12c6 0 6-9.5 12-9.5h8.5" />
        <circle cx="32.5" cy="18" r="2" />
      </svg>
      {!compact && <span className="brand-word">rally</span>}
    </>
  );

  return href ? (
    <Link className="brand" href={href} aria-label="Rally home">
      {content}
    </Link>
  ) : (
    <span className="brand">{content}</span>
  );
}
