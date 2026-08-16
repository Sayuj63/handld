"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Our clients", href: "#clients" },
  { label: "FAQ", href: "#faq" },
];

type HeaderState = "hero" | "body" | "carousel";

export function LandingHeader() {
  const [heroVisible, setHeroVisible] = useState(true);
  const [active, setActive] = useState<string>("");
  const [carouselActive, setCarouselActive] = useState(false);
  const [carouselDots, setCarouselDots] = useState(2);
  const [carouselActiveDot, setCarouselActiveDot] = useState(0);

  // Carousel state wins; otherwise hero pill over the orange hero, else body.
  const state: HeaderState = carouselActive ? "carousel" : heroVisible ? "hero" : "body";

  // Scroll-spy: which section is currently in view (body-state active link).
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(`#${entry.target.id}`);
        }
      },
      { rootMargin: "-40% 0px -50% 0px" },
    );
    for (const link of NAV_LINKS) {
      const el = document.querySelector(link.href);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  // Hero vs body: watch the hero section itself — when it occupies the top
  // of the viewport, show the light pill over the orange hero.
  useEffect(() => {
    const hero = document.getElementById("top");
    if (!hero) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setHeroVisible(true);
          else setHeroVisible(false);
        }
      },
      { rootMargin: "-60% 0px 0px 0px" },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  // Carousel: the pinned horizontal-scroll section drives the third state.
  // Highest priority — it must never be overwritten by hero/body logic.
  useEffect(() => {
    const onCarousel = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setCarouselActive(!!detail.active);
      if (typeof detail.dots === "number") setCarouselDots(detail.dots);
      if (typeof detail.activeDot === "number") setCarouselActiveDot(detail.activeDot);
    };
    window.addEventListener("hd:carousel", onCarousel);
    return () => window.removeEventListener("hd:carousel", onCarousel);
  }, []);

  const scrollTo = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className={`hd-header hd-header--${state}`}>
      <nav className="hd-header__pill">
        <a href="#top" className="hd-header__logo" onClick={(e) => scrollTo(e, "#top")}>
          <Image
            className="hd-header__logo-mark"
            src="/brand/handld-logo.png"
            alt=""
            width={28}
            height={28}
            priority
          />
          handld
        </a>
        <div className="hd-header__links">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`hd-header__link${active === link.href ? " hd-header__link--active" : ""}`}
              onClick={(e) => scrollTo(e, link.href)}
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="hd-header__carousel-progress" aria-hidden>
          {Array.from({ length: carouselDots }).map((_, i) => (
            <span key={i} className={`hd-header__dot${i === carouselActiveDot ? " hd-header__dot--active" : ""}`} />
          ))}
        </div>
        <a className="hd-header__cta" href="mailto:hi@handld.atrey.dev">
          Book a call
        </a>
      </nav>
    </header>
  );
}
