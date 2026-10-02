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

/* Official brand marks (paths from Simple Icons, CC0), drawn in a single colour.
   Each network's guidelines allow a one-colour mark, which keeps the footer monochrome. */
type SocialIcon = "instagram" | "x" | "linkedin";
const socialPaths: Record<SocialIcon, string> = {
  x: "M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z",
  linkedin:
    "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  instagram:
    "M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077",
};
function SocialGlyph({ name }: { name: SocialIcon }) {
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={socialPaths[name]} />
    </svg>
  );
}

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
                  <span className="dfoot-social-icon">
                    <SocialGlyph name={s.name} />
                  </span>
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
