"use client";

/* Shared site chrome (nav + footer) for every route.
   Links are real routes so they resolve from any page. The homepage sections
   still carry in-page anchors, but primary navigation is page-to-page.
   One ambient motion device only: the footer brand mark's slow rotation
   (user-approved). The nav mark is static with a hover response. */

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useReducedMotion, motion } from "framer-motion";
import { track } from "@/lib/track";
import "../app/dashboard.css";

/** Brand mark — static in both nav and footer; a small hover response only.
 *  (The footer mark was previously an ambient rotation; frozen per request.) */
function BrandMark() {
  const reduce = useReducedMotion();
  return (
    <motion.span
      style={{ display: "inline-flex" }}
      whileHover={reduce ? {} : { scale: 1.06 }}
      transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
    >
      <Image src="/brand/placedon-white.png" alt="" width={23} height={26} />
    </motion.span>
  );
}

const navLinks = [
  { label: "Product", href: "/product" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Security", href: "/security" },
  { label: "Pricing", href: "/pricing" },
];

type SocialIcon = "instagram" | "x" | "linkedin";

const socialLinks: { name: SocialIcon; label: string; handle: string; href: string }[] = [
  {
    name: "x",
    label: "X",
    handle: "@placedonAI",
    href: "https://x.com/placedonAI",
  },
  {
    name: "linkedin",
    label: "LinkedIn",
    handle: "/company/placedon",
    href: "https://www.linkedin.com/company/placedon/",
  },
  {
    name: "instagram",
    label: "Instagram",
    handle: "@_placedon",
    href: "https://www.instagram.com/_placedon",
  },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="dnav" data-open={open ? "true" : "false"}>
      <div className="dash-container dnav-inner">
        <Link
          href="/"
          className="dnav-brand"
          aria-label="Placedon home"
          onClick={() => setOpen(false)}
        >
          <BrandMark />
          Placedon
        </Link>
        <nav className="dnav-links" aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="dnav-actions">
          <Link
            href="/waitlist?intent=pilot"
            className="dbtn dbtn-solid"
            onClick={() => track("request_pilot_click", { location: "nav" })}
          >
            Request a pilot
          </Link>
          <button
            className="dnav-burger"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="dnav-mobile"
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>
      <div className="dnav-mobile" id="dnav-mobile" hidden={!open}>
        <nav aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          <Link
            href="/waitlist?intent=pilot"
            className="dbtn dbtn-solid"
            onClick={() => {
              setOpen(false);
              track("request_pilot_click", { location: "mobile_nav" });
            }}
          >
            Request a pilot
          </Link>
        </nav>
      </div>
    </header>
  );
}

/* Real footer links only — no fabricated features, every href resolves. */
const footerCols = [
  {
    label: "Product",
    links: [
      { label: "Product", href: "/product" },
      { label: "How it works", href: "/how-it-works" },
      { label: "Pricing", href: "/pricing" },
      { label: "Security", href: "/security" },
    ],
  },
  {
    label: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "FAQ", href: "/faq" },
      { label: "Request a pilot", href: "/waitlist?intent=pilot" },
    ],
  },
  {
    label: "Legal",
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Cookies and data collection", href: "/cookies" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="dfoot">
      <div className="dash-container">
        <div className="dfoot-top">
          <div>
            <Link href="/" className="dnav-brand" aria-label="Placedon home">
              <BrandMark />
              Placedon
            </Link>
            <p className="dfoot-note">
              Placedon is being built for Indian corporate law. Pre-launch; not
              legal advice.
            </p>
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
            <div className="dfoot-col dfoot-connect">
              <div className="dfoot-col-label">Connect</div>
              {socialLinks.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  className="dfoot-social"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Placedon on ${s.label} (opens in a new tab)`}
                  onClick={() => track("social_click", { network: s.name })}
                >
                  <span className="dfoot-social-text">
                    <span className="dfoot-social-net">{s.label}</span>
                    <span className="dfoot-social-handle mono">{s.handle}</span>
                  </span>
                </a>
              ))}
            </div>
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
