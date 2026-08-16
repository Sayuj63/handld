"use client";

export function LandingHero() {
  return (
    <section className="hd-hero" id="top">
      <p className="hd-hero__eyebrow">Shopify change requests, without the chaos</p>
      <h1 className="hd-hero__title">
        Skip the chaos,
        <br />
        Get it <em>Handld.</em>
      </h1>
      <p className="hd-hero__sub">
        Submit unlimited Shopify change requests, track every status, for one fixed monthly price.
      </p>

      <div className="hd-hero__phone-wrap">
        {/* Dark silhouette hand holding the phone */}
        <svg className="hd-hero__hand" viewBox="0 0 360 300" fill="none" aria-hidden>
          <path
            d="M150 42c-30 6-52 26-58 56l-6 62 4 64c2 24 22 44 46 44h54c36 0 66-30 66-66V120c0-44-36-78-80-78h-26Z"
            fill="#0D0F14"
          />
          <path
            d="M158 46c-22 4-38 20-42 44l-8 80 6 70c2 18 18 32 36 32h48c30 0 54-24 54-54v-60c0-36-30-66-66-66h-28Z"
            fill="#0D0F14"
          />
          <ellipse cx="186" cy="150" rx="44" ry="24" fill="#0D0F14" />
        </svg>

        <div className="hd-hero__phone">
          <div className="hd-hero__phone-notch" aria-hidden />
          <div className="hd-hero__phone-screen">
            <div className="hd-notification">
              <p className="hd-notification__eyebrow">Consider it handled</p>
              <p className="hd-notification__title">Your change request is live</p>
              <div className="hd-notification__body">
                <div className="hd-notification__blur-line" />
                <div className="hd-notification__blur-line" />
                <div className="hd-notification__blur-line" />
              </div>
              <span className="hd-notification__status">● In progress</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
