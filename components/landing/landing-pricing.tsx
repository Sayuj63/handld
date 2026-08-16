"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "What kind of changes can I submit?",
    a: "Anything from copy edits and banner swaps to layout tweaks, new sections, or bug fixes — attach a screenshot, describe what you need, and it's in the queue.",
  },
  {
    q: "How fast do requests get picked up?",
    a: "Every request is acknowledged within [X] business day(s), with most small changes shipped within [X–X] business days depending on scope.",
  },
  {
    q: "Can I pause or cancel anytime?",
    a: "Yes — no lock-in contracts. Pause your plan between projects or cancel anytime from your dashboard.",
  },
];

export function LandingPricing() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <>
      <section className="hd-pricing" id="pricing">
        <h2 className="hd-pricing__title">Simple and transparent pricing.</h2>
        <div className="hd-pricing__grid">
          {/* Retainer */}
          <div className="hd-plan hd-plan--retainer">
            <div className="hd-plan__media">
              <div className="hd-plan__media-inner">
                <div className="hd-plan__phone">
                  <div className="hd-plan__phone-screen">
                    <div className="hd-plan__phone-line" />
                    <div className="hd-plan__phone-line" />
                    <div className="hd-plan__phone-line" />
                    <div className="hd-plan__phone-line" />
                  </div>
                </div>
              </div>
            </div>
            <div className="hd-plan__body">
              <p className="hd-plan__price">
                from $[XXX]<span className="hd-plan__price-period">/mo</span>
              </p>
              <p className="hd-plan__name">Retainer</p>
              <p className="hd-plan__desc">
                A dedicated Shopify developer handling unlimited change requests, delivered asynchronously.
              </p>
              <ul className="hd-plan__features">
                {[
                  "Unlimited change requests",
                  "1 dedicated developer",
                  "Delivery within [X] business days",
                  "Weekly status update",
                  "Monthly billing",
                  "Pause or cancel anytime",
                ].map((f) => (
                  <li key={f}>
                    <span className="hd-plan__check" aria-hidden>
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <a className="hd-plan__cta" href="mailto:hi@handld.co">
                Book a call
              </a>
            </div>
          </div>

          {/* Sprint */}
          <div className="hd-plan">
            <div className="hd-plan__media">
              <div className="hd-plan__media-inner">
                <div className="hd-plan__phone" style={{ background: "#2a2e38", border: "1px solid rgba(255,255,255,0.15)" }}>
                  <div className="hd-plan__phone-screen" style={{ background: "#16181f" }}>
                    <div className="hd-plan__phone-line" style={{ background: "rgba(255,255,255,0.25)" }} />
                    <div className="hd-plan__phone-line" style={{ background: "rgba(255,255,255,0.25)" }} />
                    <div className="hd-plan__phone-line" style={{ background: "rgba(255,255,255,0.25)" }} />
                    <div className="hd-plan__phone-line" style={{ background: "var(--hd-orange)" }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="hd-plan__body">
              <p className="hd-plan__price">
                from $[XXX]<span className="hd-plan__price-period">/day</span>
              </p>
              <p className="hd-plan__name">Sprint</p>
              <p className="hd-plan__desc">
                A dedicated developer joining your project full-time for a defined period.
              </p>
              <ul className="hd-plan__features">
                {[
                  "Defined project scope",
                  "1 dedicated developer",
                  "Continuous delivery",
                  "Daily check-ins",
                  "Defined period",
                  "Full handoff & documentation",
                ].map((f) => (
                  <li key={f}>
                    <span className="hd-plan__check" aria-hidden>
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <a className="hd-plan__cta" href="mailto:hi@handld.co">
                Book a call
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="hd-faq" id="faq">
        <div className="hd-faq__inner">
          <h2 className="hd-faq__title">Frequently asked questions</h2>
          {FAQS.map((item, i) => (
            <div key={i} className={`hd-faq__item${open === i ? " hd-faq__item--open" : ""}`}>
              <button type="button" className="hd-faq__q" onClick={() => setOpen(open === i ? null : i)}>
                {item.q}
                <span className="hd-faq__icon" aria-hidden>
                  +
                </span>
              </button>
              <div className="hd-faq__a">
                <p>{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
