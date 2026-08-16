"use client";

import { useEffect, useRef, useState } from "react";

const EMAIL = "hi@handld.atrey.dev";

export function LandingFooter() {
  const giantRef = useRef<HTMLDivElement>(null);
  const [showPill, setShowPill] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pillPos, setPillPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = giantRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      setPillPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = EMAIL;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <footer className="hd-footer">
      <div className="hd-footer__content">
        <div className="hd-footer__grid">
          <div className="hd-footer__brand">
            <span className="hd-footer__brand-logo-mark" aria-hidden />
            <span className="hd-footer__brand-name">handld</span>
            <div className="hd-footer__brand-spacer" />
            <p className="hd-footer__brand-tagline">
              Any change,
              <br />
              handled.
            </p>
          </div>

          <div className="hd-footer__panel">
            <div className="hd-footer__cols">
              <div className="hd-footer__col">
                <h4>Links</h4>
                <ul>
                  <li>
                    <a href="#how-it-works">How it works</a>
                  </li>
                  <li>
                    <a href="#clients">Our clients</a>
                  </li>
                  <li>
                    <a href="#faq">FAQ</a>
                  </li>
                </ul>
              </div>

              <div className="hd-footer__col">
                <h4>Company</h4>
                <ul>
                  <li>
                    <a href={`mailto:${EMAIL}`}>Contact</a>
                  </li>
                  <li>
                    <a href="#">Privacy Policy</a>
                  </li>
                  <li>
                    <a href="#">Terms</a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="hd-footer__meta">
              <span>© 2026 Handld. All rights reserved.</span>
              <a className="hd-footer__cta" href={`mailto:${EMAIL}`}>
                Book a call
              </a>
            </div>

            <div className="hd-footer__watermark" aria-hidden>
              <span className="hd-footer__watermark-inner" />
            </div>
          </div>
        </div>

        {/* Giant hover-to-copy email — matches umanodesign.studio's footer */}
        <div
          ref={giantRef}
          className={`hd-footer__giant${showPill ? " hd-footer__giant--hover" : ""}`}
          onMouseEnter={() => setShowPill(true)}
          onMouseLeave={() => {
            setShowPill(false);
            setCopied(false);
          }}
          onClick={copy}
        >
          <span className="hd-footer__giant-text">{EMAIL}</span>
          <span
            className={`hd-footer__copy-pill${copied ? " hd-footer__copy-pill--done" : ""}`}
            style={{ transform: `translate(${pillPos.x}px, ${pillPos.y}px)` }}
            aria-hidden
          >
            {copied ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M5 15V6a2 2 0 0 1 2-2h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Copy our email
              </>
            )}
          </span>
        </div>
      </div>
    </footer>
  );
}
