"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { LandingCarousel } from "@/components/landing/landing-carousel";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingReveal } from "@/components/landing/landing-reveal";

gsap.registerPlugin(ScrollTrigger);

export function LandingPage() {
  useEffect(() => {
    // Smooth scroll (Lenis) driven through GSAP's ticker so ScrollTrigger
    // pinning stays perfectly in sync.
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Carousel bookend: when the user scrolls back above or past the pinned
    // section, tell the header to leave carousel mode.
    const leave = () => {
      window.dispatchEvent(new Event("hd:carousel:leave"));
    };
    const onScroll = () => {
      const carousel = document.getElementById("how-it-works");
      if (!carousel) return;
      const rect = carousel.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) leave();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("load", onLoad);
    };
  }, []);

  return (
    <div className="landing-page">
      <LandingHeader />
      <main>
        <LandingHero />
        <section className="hd-clients" id="clients">
          <p className="hd-clients__line">Already handling changes for 8+ growing brands</p>
        </section>
        <LandingReveal />
        <LandingCarousel />
        <LandingCta />
        <LandingFaq />
      </main>
      <LandingFooter />
    </div>
  );
}

// Inline SLG-friendly CTA that replaces the old pricing grid — the whole
// funnel points at "book a call", not self-serve checkout.
function LandingCta() {
  return (
    <section className="hd-cta" id="pricing">
      <div className="hd-cta__inner">
        <p className="hd-cta__eyebrow">How we work</p>
        <h2 className="hd-cta__title">
          Built for teams who ship
          <br />
          more than a homepage.
        </h2>
        <p className="hd-cta__sub">
          Every engagement is scoped on a call — one dedicated developer, unlimited requests,
          flat monthly retainer. No public tiers, no self-serve. Just the right team for your
          site, priced against the work.
        </p>
        <a className="hd-cta__button" href="mailto:hi@handld.atrey.dev">
          Book a call
        </a>
      </div>
    </section>
  );
}
