"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function LandingHero() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      // On-load reveal: headline rises, sub fades in, phone lifts up.
      gsap.from(".hd-hero__title-word", {
        y: 80,
        opacity: 0,
        stagger: 0.06,
        duration: 1.1,
        ease: "expo.out",
      });
      gsap.from(".hd-hero__sub", {
        y: 24,
        opacity: 0,
        delay: 0.35,
        duration: 0.9,
        ease: "expo.out",
      });
      gsap.from(".hd-hero__eyebrow", { y: 20, opacity: 0, duration: 0.8, ease: "expo.out" });
      gsap.from(".hd-hero__phone-stage", {
        y: 160,
        opacity: 0,
        delay: 0.2,
        duration: 1.4,
        ease: "expo.out",
      });
      gsap.from(".hd-notification", {
        y: 30,
        scale: 0.9,
        opacity: 0,
        delay: 0.9,
        duration: 1,
        ease: "back.out(1.5)",
      });

      // Subtle scroll fade on the title — phone stays put inside the hero so
      // it can't leak into the next section (hero has overflow:hidden).
      gsap.to(".hd-hero__title", {
        y: -40,
        opacity: 0.7,
        scrollTrigger: { trigger: section, start: "top top", end: "bottom top", scrub: true },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section className="hd-hero" id="top" ref={sectionRef}>
      <div className="hd-hero__bg" aria-hidden />

      <div className="hd-hero__copy">
        <p className="hd-hero__eyebrow">Change requests, without the chaos</p>
        <h1 className="hd-hero__title">
          <span className="hd-hero__title-line">
            <span className="hd-hero__title-word">Skip</span>{" "}
            <span className="hd-hero__title-word">the</span>{" "}
            <span className="hd-hero__title-word">chaos,</span>
          </span>
          <span className="hd-hero__title-line">
            <span className="hd-hero__title-word">Get</span>{" "}
            <span className="hd-hero__title-word">it</span>{" "}
            <span className="hd-hero__title-word hd-hero__title-word--accent">Handld.</span>
          </span>
        </h1>
        <p className="hd-hero__sub">
          Submit unlimited change requests for any site, track every status, for one fixed monthly price.
        </p>
      </div>

      <div className="hd-hero__phone-stage">
        <div className="hd-hero__phone-frame">
          <Image
            src="/hero-phone-hand.webp"
            alt=""
            width={1200}
            height={800}
            priority
            className="hd-hero__hand-photo"
          />

          {/* Notification card floats on the phone screen area. Positioning
              is % of the frame so it stays anchored as the image scales. */}
          <div className="hd-notification" aria-hidden>
            <div className="hd-notification__head">
              <span className="hd-notification__badge" />
              <div>
                <p className="hd-notification__eyebrow">Consider it handled</p>
                <p className="hd-notification__title">Your change request is live</p>
              </div>
            </div>
            <div className="hd-notification__body">
              <div className="hd-notification__blur-line" />
              <div className="hd-notification__blur-line" />
              <div className="hd-notification__blur-line" />
            </div>
            <span className="hd-notification__status">
              <span className="hd-notification__status-dot" />
              In progress
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
