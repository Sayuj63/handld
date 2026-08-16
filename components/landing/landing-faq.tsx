"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "What kind of changes can I submit?",
    a: "Anything on your site — copy edits, banner swaps, layout tweaks, new sections, or bug fixes. Attach a screenshot, describe what you need, and it's in the queue.",
  },
  {
    q: "How fast do requests get picked up?",
    a: "Every request is acknowledged within one business day, with most small changes shipped within 1–3 business days depending on scope.",
  },
  {
    q: "How does onboarding work?",
    a: "Book a call and we'll scope your setup live — access, tooling, and the first request queue — so your dev is embedded and shipping within a week.",
  },
];

export function LandingFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
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
  );
}
