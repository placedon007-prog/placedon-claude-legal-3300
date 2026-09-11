"use client";

/* Shared site chrome (nav + footer) for every route.
   Extracted from the homepage so the legal pages carry the same dark
   nav/footer instead of rendering bare. Links are root-relative so they
   resolve from any route: "/#product" navigates home then scrolls to the
   section; "/privacy" etc. are real pages. */

import Image from "next/image";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { motion } from "framer-motion";
import "../app/dashboard.css";

const arrowR = <path d="M4 12h15m-6-6 6 6-6 6" />;

function ChromeIcon({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {arrowR}
    </svg>
  );
}

function BrandMark({ spin = false }: { spin?: boolean }) {
  const reduce = useReducedMotion();
  const animate = reduce ? {} : spin ? { rotate: 360 } : { y: [0, 3, 0] };
  const transition = spin
    ? { duration: 24, repeat: Infinity, ease: "linear" as const }
    : { duration: 3.4, repeat: Infinity, ease: "easeInOut" as const };
  return (
    <motion.span
      style={{ display: "inline-flex" }}
      animate={animate}
      transition={transition}
      whileHover={reduce ? {} : { y: spin ? 0 : 3, scale: 1.06 }}
    >
      <Image src="/brand/placedon-white.png" alt="" width={23} height={26} />
    </motion.span>
  );
}

const navLinks = [
  { label: "Product", href: "/#product" },
  { label: "Tools", href: "/#tools" },
  { label: "Evidence", href: "/#evidence" },
  { label: "Resources", href: "/#resources" },
];

export function SiteNav() {
  return (
    <header className="dnav">
      <div className="dash-container dnav-inner">
        <Link href="/" className="dnav-brand" aria-label="Placedon">
          <BrandMark />
          Placedon
        </Link>
        <nav className="dnav-links" aria-label="Primary">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="dnav-actions">
          <Link href="/#pilot" className="dnav-login">
            Log in
          </Link>
          <Link href="/#pilot" className="dbtn dbtn-ghost">
            Contact
          </Link>
          <Link href="/#pilot" className="dbtn dbtn-solid">
            Request a pilot
          </Link>
          <button className="dnav-burger" aria-label="Open menu">
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}

const footerCols = [
  {
    label: "Product",
    links: [
      { label: "The record", href: "/#product" },
      { label: "Placedon Matrix", href: "/#product" },
      { label: "Placedon for Word", href: "/#tools" },
      { label: "Plugins", href: "/#tools" },
      { label: "Platform", href: "/#product" },
      { label: "Pricing", href: "/#pilot" },
    ],
  },
  {
    label: "Who it's for",
    links: [
      { label: "Company secretaries", href: "/#pilot" },
      { label: "In-house counsel", href: "/#pilot" },
      { label: "Advisors", href: "/#pilot" },
      { label: "Startups", href: "/#pilot" },
      { label: "Annual filings", href: "/#tools" },
    ],
  },
  {
    label: "Evidence",
    links: [
      { label: "How the record works", href: "/#evidence" },
      { label: "Abstention", href: "/#evidence" },
      { label: "Source defects", href: "/#evidence" },
      { label: "Benchmark", href: "/#evidence" },
      { label: "Changelog", href: "/#evidence" },
    ],
  },
  {
    label: "Company",
    links: [
      { label: "About", href: "/#product" },
      { label: "Careers", href: "/#pilot" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Cookies", href: "/cookies" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="dfoot">
      <div className="dash-container">
        <div className="dfoot-top">
          <div>
            <Link href="/" className="dnav-brand" aria-label="Placedon">
              <BrandMark spin />
              Placedon
            </Link>
            <div className="dfoot-ask">
              How can I help you today?
              <span>
                <ChromeIcon size={16} />
              </span>
            </div>
          </div>
          <div className="dfoot-cols">
            {footerCols.map((col) => (
              <div className="dfoot-col" key={col.label}>
                <div className="dfoot-col-label">{col.label}</div>
                {col.links.map((l) => (
                  <Link href={l.href} key={l.label}>
                    {l.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="dfoot-bottom">
          <span>
            © <span className="mono">2026</span> Placedon
          </span>
          <span>A witness, not a tool.</span>
          <span>Not legal advice.</span>
        </div>
      </div>
    </footer>
  );
}
