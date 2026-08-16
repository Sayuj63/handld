"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const SLIDES = [
  {
    id: "dev",
    heading: "Your dev, from day one",
    copy: "One dedicated Shopify developer, already familiar with your store. No hiring, no onboarding lag, no ramp-up time.",
    variant: "character",
  },
  {
    id: "unlimited",
    heading: "Unlimited change requests",
    copy: "Submit as many updates as you need. No per-task billing, no cap, no waiting on a reply — just continuous progress, tracked in one place.",
    variant: "request-card",
  },
];

function notify(detail: { active: boolean; dots: number; activeDot: number }) {
  window.dispatchEvent(new CustomEvent("hd:carousel", { detail }));
}

export function LandingCarousel() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const track = section.querySelector<HTMLElement>(".hd-carousel__track");
    if (!track) return;

    const ctx = gsap.context(() => {
      const getDistance = () => track.scrollWidth - window.innerWidth;

      const tween = gsap.to(track, {
        x: () => -getDistance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${getDistance()}`,
          scrub: 0.5,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onToggle: (self) => notify({ active: self.isActive, dots: SLIDES.length, activeDot: 0 }),
          onUpdate: (self) => {
            const progress = self.progress;
            const idx = Math.min(SLIDES.length - 1, Math.floor(progress * SLIDES.length));
            notify({ active: true, dots: SLIDES.length, activeDot: idx });
          },
        },
      });
      void tween;
    }, section);

    // Tell the header we've left the carousel when the page scrolls past it
    // (the pin trigger above only fires while active).
    const cleanup = () => {
      notify({ active: false, dots: SLIDES.length, activeDot: 0 });
    };
    window.addEventListener("hd:carousel:leave", cleanup);
    return () => {
      ctx.revert();
      window.removeEventListener("hd:carousel:leave", cleanup);
    };
  }, []);

  return (
    <section className="hd-carousel" id="how-it-works" ref={sectionRef}>
      <div className="hd-carousel__track">
        {SLIDES.map((slide, i) => (
          <div key={slide.id} className={`hd-carousel__slide${i % 2 === 1 ? " hd-carousel__slide--reverse" : ""}`}>
            <div className={`hd-carousel__panel${slide.variant === "request-card" ? " hd-carousel__panel--dark" : ""}`}>
              {slide.variant === "character" ? (
                <div className="hd-character">
                  <div className="hd-character__fig" aria-hidden>
                    <div className="hd-character__hair" />
                    <div className="hd-character__head" />
                    <span className="hd-character__eye hd-character__eye--l" />
                    <span className="hd-character__eye hd-character__eye--r" />
                    <span className="hd-character__smile" />
                    <div className="hd-character__body" />
                    <div className="hd-character__arm hd-character__arm--l" />
                    <div className="hd-character__arm hd-character__arm--r">
                      <span className="hd-character__hand" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="hd-request-card">
                  <p className="hd-request-card__eyebrow">New request</p>
                  <p className="hd-request-card__title">Fix homepage banner cropping</p>
                  <p className="hd-request-card__desc">Banner text is cut off on mobile — adjust the crop to match the attached reference.</p>
                  <span className="hd-request-card__status">In Progress</span>
                  <div className="hd-request-card__progress">
                    <p className="hd-request-card__progress-label">Progress</p>
                    <div className="hd-request-card__progress-bar">
                      <div className="hd-request-card__progress-fill" />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="hd-carousel__copy">
              <h3>{slide.heading}</h3>
              <p>{slide.copy}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
