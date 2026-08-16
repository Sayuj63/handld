"use client";

export function LandingFeatures() {
  return (
    <section className="hd-features">
      <div className="hd-features__grid">
        <div className="hd-feature">
          <div className="hd-feature__icons" aria-hidden>
            <span className="hd-feature__icon hd-feature__icon--shopify">Shopify</span>
            <span className="hd-feature__icon hd-feature__icon--slack">Slack</span>
            <span className="hd-feature__icon hd-feature__icon--gmail">Gmail</span>
            <span className="hd-feature__icon hd-feature__icon--notion">Notion</span>
          </div>
          <h3>Seamless workflow</h3>
          <p>Shopify, Slack, or straight from your inbox — Handld plugs into how you already work, no new habits required.</p>
        </div>

        <div className="hd-feature">
          <div className="hd-feature__art" aria-hidden>
            <div className="hd-cloud">
              <span className="hd-cloud__blob hd-cloud__blob--1" />
              <span className="hd-cloud__blob hd-cloud__blob--2" />
              <span className="hd-cloud__blob hd-cloud__blob--3" />
              <span className="hd-cloud__petal hd-cloud__petal--1" />
              <span className="hd-cloud__petal hd-cloud__petal--2" />
            </div>
          </div>
          <h3>Flexible and predictable</h3>
          <p>One flat monthly rate. No surprises, no contracts. Pause or cancel anytime, scale up the moment you need more.</p>
        </div>
      </div>
    </section>
  );
}
