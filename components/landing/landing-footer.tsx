"use client";

export function LandingFooter() {
  return (
    <footer className="hd-footer">
      {/* Giant low-contrast email, revealed as the footer content scrolls up */}
      <div className="hd-footer__giant" aria-hidden>
        <span className="hd-footer__giant-text">hi@handld.co</span>
      </div>

      <div className="hd-footer__content">
        <div className="hd-footer__grid">
          <div className="hd-footer__brand">
            <span className="hd-footer__brand-logo">handld</span>
            <p className="hd-footer__brand-tagline">Shopify changes, handled.</p>
          </div>

          <div className="hd-footer__col">
            <h4>Links</h4>
            <ul>
              <li>
                <a href="#how-it-works">How it works</a>
              </li>
              <li>
                <a href="#clients">Our clients</a>
              </li>
              <li>
                <a href="#faq">FAQ</a>
              </li>
            </ul>
          </div>

          <div className="hd-footer__col">
            <h4>Company</h4>
            <ul>
              <li>
                <a href="mailto:hi@handld.co">Contact</a>
              </li>
              <li>
                <a href="#">Privacy Policy</a>
              </li>
              <li>
                <a href="#">Terms</a>
              </li>
            </ul>
            <a className="hd-footer__cta" href="mailto:hi@handld.co">
              Book a call
            </a>
          </div>
        </div>

        <div className="hd-footer__bottom">
          <span>© 2026 Handld. All rights reserved.</span>
          <span>hi@handld.co</span>
        </div>
      </div>
    </footer>
  );
}
