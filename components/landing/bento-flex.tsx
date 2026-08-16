"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Animated bento used as the visual of the final carousel card. Each tile
// enters with a stagger, then loops a subtle idle animation so the card feels
// alive even when the carousel is idle. Designed to survive being scaled up
// during the zoom-into-pricing transition.
export function BentoFlex() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const tiles = root.querySelectorAll<HTMLElement>(".hd-bento__tile");

      // Entrance: tiles pop in from below with a soft back-ease when the card
      // enters the viewport horizontally within the carousel.
      gsap.from(tiles, {
        y: 40,
        opacity: 0,
        scale: 0.86,
        stagger: { each: 0.08, from: "random" },
        duration: 0.9,
        ease: "back.out(1.5)",
        scrollTrigger: {
          trigger: root,
          start: "top 90%",
          toggleActions: "play none none reverse",
        },
      });

      // Idle floats: main art clouds drift, price tile pulses, calendar tile
      // rotates its accent, checkmark tile scales the check on a loop.
      gsap.to(".hd-bento__cloud--tl", {
        y: -12,
        rotation: -3,
        duration: 5,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
      gsap.to(".hd-bento__cloud--br", {
        y: 10,
        rotation: 2,
        duration: 5.5,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
      gsap.to(".hd-bento__price-value", {
        scale: 1.06,
        duration: 1.6,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
      gsap.to(".hd-bento__calendar-dot", {
        rotation: 360,
        duration: 8,
        ease: "none",
        repeat: -1,
        transformOrigin: "6px 6px",
      });
      gsap.to(".hd-bento__check-mark", {
        scale: 1.15,
        duration: 1.2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
      gsap.to(".hd-bento__scale-arrow", {
        y: -4,
        duration: 1.4,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div className="hd-bento" ref={rootRef} aria-hidden>
      {/* Big art tile — cloud + leaf like the reference */}
      <div className="hd-bento__tile hd-bento__tile--art">
        <div className="hd-bento__cloud hd-bento__cloud--tl" />
        <div className="hd-bento__cloud hd-bento__cloud--br" />
        <div className="hd-bento__leaf hd-bento__leaf--l" />
        <div className="hd-bento__leaf hd-bento__leaf--r" />
      </div>

      {/* Flat rate tile */}
      <div className="hd-bento__tile hd-bento__tile--rate">
        <span className="hd-bento__eyebrow">Flat rate</span>
        <span className="hd-bento__price-value">
          $2,400<em className="hd-bento__price-period">/mo</em>
        </span>
        <span className="hd-bento__caption">Predictable, monthly, one line item.</span>
      </div>

      {/* Pause anytime tile — mini calendar */}
      <div className="hd-bento__tile hd-bento__tile--pause">
        <span className="hd-bento__eyebrow">Pause anytime</span>
        <div className="hd-bento__calendar">
          <div className="hd-bento__calendar-head">
            <span />
            <span />
          </div>
          <div className="hd-bento__calendar-grid">
            {Array.from({ length: 15 }).map((_, i) => (
              <span
                key={i}
                className={`hd-bento__calendar-cell${i === 7 ? " hd-bento__calendar-cell--active" : ""}`}
              >
                {i === 7 && <span className="hd-bento__calendar-dot" />}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* No contracts tile */}
      <div className="hd-bento__tile hd-bento__tile--contracts">
        <span className="hd-bento__eyebrow">No contracts</span>
        <div className="hd-bento__check">
          <svg
            className="hd-bento__check-mark"
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="m5 12 5 5L20 6"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="hd-bento__caption">Month-to-month. Cancel with one click.</span>
      </div>

      {/* Scale up tile */}
      <div className="hd-bento__tile hd-bento__tile--scale">
        <span className="hd-bento__eyebrow">Scale up</span>
        <div className="hd-bento__scale">
          <span className="hd-bento__scale-bar" style={{ height: "24%" }} />
          <span className="hd-bento__scale-bar" style={{ height: "42%" }} />
          <span className="hd-bento__scale-bar" style={{ height: "58%" }} />
          <span className="hd-bento__scale-bar hd-bento__scale-bar--accent" style={{ height: "80%" }} />
          <span className="hd-bento__scale-arrow">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M7 17 17 7M8 7h9v9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}
