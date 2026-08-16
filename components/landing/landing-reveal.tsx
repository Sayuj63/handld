"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const COPY =
  "Chasing a developer for every small fix takes days. Submitting it on Handld takes seconds. Unlimited requests. Fixed monthly price. No commitment.";

export function LandingReveal() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const words = section.querySelectorAll<HTMLElement>(".hd-reveal__word");
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=120%",
          scrub: 0.6,
          pin: true,
          anticipatePin: 1,
        },
      });
      tl.fromTo(
        words,
        { opacity: 0.12 },
        { opacity: 1, stagger: 0.18, ease: "none" },
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section className="hd-reveal" ref={sectionRef}>
      <div className="hd-reveal__inner">
        <span className="hd-reveal__dot" aria-hidden />
        <p className="hd-reveal__text">
          {COPY.split(" ").map((word, i) => (
            <span key={i} className="hd-reveal__word">
              {word === "Handld" ? <em className="hd-reveal__accent">Handld</em> : word}{" "}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
