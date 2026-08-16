"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { WorkflowIcons } from "@/components/landing/workflow-icons";

gsap.registerPlugin(ScrollTrigger);

type Slide =
  | {
      id: "dev";
      variant: "character";
      heading: string;
      copy: string;
    }
  | {
      id: "unlimited";
      variant: "request-card";
      heading: string;
      copy: string;
    }
  | {
      id: "workflow";
      variant: "workflow";
      heading: string;
      copy: string;
    }
  | {
      id: "flexible";
      variant: "clouds";
      heading: string;
      copy: string;
    };

const SLIDES: Slide[] = [
  {
    id: "dev",
    variant: "character",
    heading: "Your dev, from day one",
    copy: "One dedicated developer, already familiar with your site. No hiring, no onboarding lag, no ramp-up time.",
  },
  {
    id: "unlimited",
    variant: "request-card",
    heading: "Unlimited change requests",
    copy: "Submit as many updates as you need. No per-task billing, no cap, no waiting on a reply — just continuous progress, tracked in one place.",
  },
  {
    id: "workflow",
    variant: "workflow",
    heading: "Embedded in your workflow",
    copy: "Slack, Notion, Linear, or straight from your inbox — Handld plugs into how you already work, no new habits required.",
  },
  {
    id: "flexible",
    variant: "clouds",
    heading: "Flexible and predictable",
    copy: "One flat monthly rate. No surprises, no contracts. Pause or cancel anytime, scale up the moment you need more.",
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
    const slides = Array.from(track.querySelectorAll<HTMLElement>(".hd-carousel__slide"));
    const lastSlide = slides[slides.length - 1];
    const lastPanel = lastSlide?.querySelector<HTMLElement>(".hd-carousel__panel");

    const ctx = gsap.context(() => {
      const getDistance = () => track.scrollWidth - window.innerWidth;

      const horizontal = gsap.to(track, {
        x: () => -getDistance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${getDistance() * 1.15}`,
          scrub: 0.5,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onToggle: (self) => notify({ active: self.isActive, dots: SLIDES.length, activeDot: 0 }),
          onUpdate: (self) => {
            const progress = self.progress;
            // last chunk of scroll = zoom-out phase, so lock the active dot
            const carouselProgress = Math.min(1, progress / 0.85);
            const idx = Math.min(SLIDES.length - 1, Math.floor(carouselProgress * SLIDES.length));
            notify({ active: true, dots: SLIDES.length, activeDot: idx });
          },
        },
      });

      // Card entrance — each slide's panel scrubs in as it enters the viewport
      slides.forEach((slide, idx) => {
        if (idx === 0) return;
        const panel = slide.querySelector<HTMLElement>(".hd-carousel__panel");
        if (!panel) return;
        gsap.from(panel, {
          y: 80,
          opacity: 0.25,
          scale: 0.9,
          scrollTrigger: {
            trigger: slide,
            containerAnimation: horizontal,
            start: "left 90%",
            end: "left 40%",
            scrub: true,
          },
        });
      });

      // Last card: as the carousel finishes, the last card scales up and its
      // background cross-fades from cream to black — releasing into pricing.
      if (lastPanel && lastSlide) {
        gsap
          .timeline({
            scrollTrigger: {
              trigger: section,
              start: () => `top+=${getDistance() * 0.72} top`,
              end: () => `top+=${getDistance() * 1.14} top`,
              scrub: 0.6,
              invalidateOnRefresh: true,
            },
          })
          .to(lastPanel, {
            scale: 3.5,
            borderRadius: 0,
            ease: "power2.in",
          }, 0)
          .to(section, {
            backgroundColor: "#181d27",
            ease: "power2.in",
          }, 0)
          .to(".hd-carousel__slide:last-child .hd-carousel__copy", {
            opacity: 0,
            y: -40,
            ease: "power2.in",
          }, 0)
          .to(".hd-carousel__last-tint", {
            opacity: 1,
            ease: "power2.in",
          }, 0);
      }
    }, section);

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
          <div
            key={slide.id}
            className={`hd-carousel__slide${i % 2 === 1 ? " hd-carousel__slide--reverse" : ""}${
              i === SLIDES.length - 1 ? " hd-carousel__slide--last" : ""
            }`}
          >
            <div
              className={`hd-carousel__panel hd-carousel__panel--${slide.variant}${
                slide.variant === "request-card" ? " hd-carousel__panel--dark" : ""
              }`}
            >
              {slide.variant === "character" && <VideoArt src="/videos/character-waving.mp4" />}
              {slide.variant === "request-card" && <RequestCardArt />}
              {slide.variant === "workflow" && <WorkflowIcons />}
              {slide.variant === "clouds" && <VideoArt src="/videos/abstract-shapes.mp4" />}
              {i === SLIDES.length - 1 && <div className="hd-carousel__last-tint" aria-hidden />}
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

/* ---------- individual card art (small, self-contained) ---------- */

// Video fills the panel end-to-end so no cream background bleeds around it.
function VideoArt({ src }: { src: string }) {
  return (
    <video
      className="hd-carousel__video"
      src={src}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      aria-hidden
    />
  );
}

function RequestCardArt() {
  return (
    <div className="hd-request-card">
      <p className="hd-request-card__eyebrow">New request</p>
      <p className="hd-request-card__title">Fix homepage banner cropping</p>
      <p className="hd-request-card__desc">
        Banner text is cut off on mobile — adjust the crop to match the attached reference.
      </p>
      <span className="hd-request-card__status">In Progress</span>
      <div className="hd-request-card__progress">
        <p className="hd-request-card__progress-label">Progress</p>
        <div className="hd-request-card__progress-bar">
          <div className="hd-request-card__progress-fill" />
        </div>
      </div>
    </div>
  );
}

