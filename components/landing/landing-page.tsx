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
        <LandingFaq />
      </main>
      <LandingFooter />
    </div>
  );
}
