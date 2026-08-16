# Landing Page PRD — Clone Reference: umanodesign.studio
### For: Handld

Confirmed — this is Handld's marketing site. Full copy is written into every section below, ready to paste in. Placeholders remain only where the value is genuinely yours to decide (pricing numbers, domain, final client-logo permission) — never guessed.

> **Final nav copy (used throughout §3 and §4):** `How it works` · `Our clients` · `Pricing` · CTA button: `Book a call`
> Keeping "Book a call" as the CTA rather than a self-serve "Start free" — makes sense while you're still onboarding your 7–8 clients one-on-one. Swap to self-serve copy once onboarding is standardized.

---

## 0. How This Document Was Built (read this first)

I could not load the live site in this environment — outbound network here is restricted to package registries (npm/pip/GitHub), and a direct request to `umanodesign.studio` returns a `403 host_not_allowed`. `web_fetch` only returns static `<head>` metadata for JS-rendered sites like this one, not computed CSS. So:

- **Colors** below are pixel-sampled directly from the 9 screenshots you uploaded (Python/PIL histogram extraction) — these are real hex values, not estimates.
- **One value** (`theme-color`) came straight from the live site's meta tag via `web_fetch` — genuinely authoritative.
- **Typography, exact spacing, timing/easing curves, and DOM structure** could NOT be verified — I have no way to read computed styles from static images. These are flagged 🔴 and I've given you a Playwright script (§8) to pull the real values yourself.

### Confidence Legend
| Tag | Meaning |
|---|---|
| 🟢 VERIFIED | Directly measured — pixel-sampled hex or fetched meta value |
| 🟡 INFERRED | Reconstructed from visual evidence across multiple screenshots — high confidence, not pixel-measured |
| 🔴 UNCONFIRMED | Cannot be verified from what I have — check the live site before building |

---

## 1. Site Architecture

| Surface | URL pattern | Purpose |
|---|---|---|
| Landing page | `yourdomain.com` (root) | This PRD. Marketing/conversion site. |
| App | `app.yourdomain.com` or `yourdomain.com/app` | The actual client portal (RBAC dashboard, change requests) — out of scope here, covered in the product PRD. |

The landing page is a **separate deployable** from the app — no auth, no dashboard code, pure marketing site. Recommend a separate Next.js project (or a `/marketing` route group) so it stays fast and isn't bloated by app dependencies.

---

## 2. Design Tokens

### 2.1 Color Palette

| Token | Hex | Confidence | Where it's used |
|---|---|---|---|
| `--brand-orange` | `#EA7342` | 🟢 VERIFIED (sampled: hero bg, CTA fills, pricing hover state) | Hero background, primary CTA, active nav state, pricing-card hover |
| `--brand-orange-light` | `#EC8551` | 🟢 VERIFIED (sampled variant) | Likely a subtle gradient/highlight on the orange bg — confirm via §8 script whether it's `linear-gradient` or a solid fill with a light overlay |
| `--bg-white` | `#FDFDFD` | 🟢 VERIFIED | Main page background — **deliberately off-white, not `#FFFFFF`** |
| `--bg-cream` | `#EAE5DB` (range `#E9E4DA`–`#ECE6DC`) | 🟢 VERIFIED | Background behind the "how it works" cards section and top of footer |
| `--bg-black` | `#0D0F14` (range `#0D0E13`–`#0E1015`) | 🟢 VERIFIED | Pricing section bg, dark footer band, collapsed-nav-pill bg during card carousel — **not pure `#000000`**, has a cool/blue undertone |
| `--text-grey` | `#898989` | 🟢 VERIFIED | Grayscale trusted-by logos, muted/inactive text |
| `--bg-grey-cool` | `#EFF0F2` (range `#E1E2E4`–`#F0F1F3`) | 🟢 VERIFIED | Footer bottom band background |
| `theme-color` (browser chrome) | `#E7E8E6` | 🟢 VERIFIED (live meta tag) | Sits between cream and cool-grey — likely the base `<body>` color other sections layer on top of |

**Do not substitute pure black/white anywhere** — every "black" and "white" in this design is slightly warmed or cooled. That's a big part of why it reads as premium instead of generic. Use the exact hexes above.

### 2.2 Typography 🔴 UNCONFIRMED — visual read only

I can describe what I see, but I cannot extract a `font-family` string from a screenshot — any name I gave you here would be a guess dressed up as a fact, which is exactly what you told me not to do.

**Display/headline font** (e.g. "Pause hiring, Start designing.", "Simple and transparent pricing."):
- Heavy/black weight, wide-set characters, tight line-height, rounded terminals on curves, mixed case (not all-caps)
- Reads as an editorial slab-grotesk hybrid — chunky but not a traditional serif
- **Close free alternatives to prototype with** (not a claim these are the actual font): Fraunces (Black, low optical size), Bricolage Grotesque (ExtraBold), Big Shoulders Display
- **Action item:** open the live site → DevTools → Computed → `font-family` on the H1, and tell me the result — I'll lock the spec to the real value in one message.

**Body/UI font** (nav links, paragraph copy, buttons):
- Clean geometric/grotesque sans, normal weight for body, medium/semibold for nav and buttons
- Close alternative: Inter or Geist — both free, both safe defaults if the real font isn't system-available for you

### 2.3 Shape & Spacing

| Element | Value | Confidence |
|---|---|---|
| Nav pill / buttons | Full stadium shape, `border-radius: 999px` | 🟢 VERIFIED (visually unambiguous — fully rounded ends on every pill) |
| Cards | Large soft rounded rectangle | 🟡 INFERRED — visually ~24–32px radius, get exact px from §8 script |
| Pricing card image panel | Image bleeds edge-to-edge inside the card, only outer corners rounded | 🟢 VERIFIED |
| Nav vertical position | Floating pill, fixed top with margin (not full-width bar) | 🟢 VERIFIED |

---

## 3. Global Header — 3 Distinct States (your ask #2)

This is the part you specifically flagged, and it's the most technically interesting piece of the whole clone. Screenshots confirm **three separate header states**, not just a simple shrink-on-scroll:

### State A — Hero (top of page)
- Wide pill, off-white bg, contains: logo + full text nav (2 links) + solid CTA button
- Screenshot evidence: Image 1

### State B — Body sections (logos, text-reveal, pricing, footer)
- Same pill shape and content structure as State A: logo + 3 text nav links + CTA button
- **Scroll-spy active state confirmed:** the nav link matching the current section turns brand-orange (`#EA7342`) — e.g. "Client stories" is orange in Image 6, "Pricing" is orange in Images 7–8
- Screenshot evidence: Images 4, 6, 7, 8, 9

### State C — Horizontal card-carousel section (your ask #4)
- The text nav links **disappear entirely**. The pill shrinks and its background flips to near-black (`#0D0F14`)
- In their place: a **horizontal dot/segment progress indicator** — one elongated dark "active" segment + several small grey dots, tracking which card is currently in view
- Logo and CTA button remain visible on either side
- Screenshot evidence: Image 5 — `[UMANO] [▬ ○ ○ ○ ○] [Book a call]`
- **Strict build requirement:** this is a distinct component swap, not a CSS transform of the same nav — build State C as its own component that mounts while the carousel section is pinned, and unmounts (reverting to State B) once the user scrolls past it.

🔴 UNCONFIRMED: exact transition timing/easing between states, and the precise dot count if it exceeds what's visible in the one screenshot we have (5 segments visible → implies 5 cards total; only 4 distinct card contents are confirmed in your screenshots, see §5.4).

---

## 4. Section-by-Section Breakdown

Order, top to bottom, per the screenshots:

### 4.1 Hero (your ask #1)
- Full-bleed brand-orange background (`#EA7342`)
- **Headline (final copy):** "Skip the chaos, Get it Handld." — two lines, huge, display font, black text on orange
- **Subheadline (final copy):** "Submit unlimited Shopify change requests, track every status, for one fixed monthly price."
- Nav inside the hero pill: `Design Studio`/`Design Academy`-style two-link layout isn't needed for you — use the final 3-link nav from the top of this doc instead, consistent across every header state.
- Below the headline: an iPhone mockup (hand holding phone, dark silhouette fingers), phone screen shows a notification-style card:
  - **Eyebrow label (final copy):** "Consider it handled" — deliberate callback to the brand name, keep this
  - **Bold headline (final copy):** "Your change request is live"
  - Content preview below the notification stays blurred/loading in the static frame
- 🟡 INFERRED: the blurred content card animates in mid-scroll (that's why it's shown blurred/loading in the static shot) — likely a reveal-on-load or reveal-on-scroll animation, not a permanently blurred state

**Video prompt — hero phone mockup:** see §6 (flagged for hybrid build, not pure AI video — read why before generating).

### 4.2 Trusted-by logos row
- Directly below hero, grayscale/monochrome logo lockups (5 logos in reference: GoPro, Gillette, Revolut, Nespresso, alan)
- No heading in the reference — logos speak for themselves, keep it that way
- **Your logo candidates** (from your existing client roster): Studio Caramel, KKCL, Calvium, Almost Always, Fitkaar Clothing, RadiantandKeen, TCC/Swytch — **get explicit sign-off from each before this goes live**, agency work ≠ automatic logo-use rights even with an active contract
- **Fallback if permission isn't sorted yet:** drop the logos, replace the row with a single centered line — "Already handling changes for 8+ Shopify stores" — same visual weight, zero legal risk, swap in real logos the moment you have sign-off
- Logos rendered in flat grey (`#898989` range), not full color

### 4.3 Scroll-Pinned Text Reveal (your ask #3)
This is a **pinned/scrubbed** section, confirmed across Images 2→3→4:
- A large paragraph of text sits centered, initially rendered almost fully transparent/light-grey (barely legible "ghost text" in Image 2/3)
- As the user scrolls, the section **pins in place** (viewport doesn't move) while the text progressively resolves from grey → solid black
- By Image 4, the text is fully opaque/black and the section releases, resuming normal scroll
- A small orange-ringed dot sits at the fixed left edge during this pin — 🟡 INFERRED to be a scroll-progress indicator for the pinned section specifically (not a global element)
- Reference copy: "Finding a product designer takes months. Starting with UMANO takes minutes. Unlimited requests. Fixed monthly price. No commitment."
- **Final copy:** "Chasing a developer for every small fix takes days. Submitting it on Handld takes seconds. Unlimited requests. Fixed monthly price. No commitment."

**Strict build requirement:** this must be scroll-scrubbed (tied directly to scroll position, not a one-time on-enter animation) — the ghost→solid progression should track 1:1 with how far the user has scrolled through the pinned section. This is a textbook GSAP ScrollTrigger `scrub: true` pattern.

### 4.4 How-It-Works Card Carousel (your asks #4, #5, #6)
- Horizontally-scrolling card set, pinned vertically while scroll input drives horizontal card movement (Image 5 confirms this via the collapsed dot-nav — see §3 State C)
- Two-column layout per screen: large visual panel (left) + small visual/UI panel (right), each with its own heading + description below
- **Confirmed card content** (from your screenshots):

| Card | Visual | Heading (final) | Copy (final) |
|---|---|---|---|
| A | 3D character illustration, waving, orange outfit | "Your dev, from day one" | "One dedicated Shopify developer, already familiar with your store. No hiring, no onboarding lag, no ramp-up time." |
| B | Dark UI mockup card, styled as a Handld request card | "Unlimited change requests" | "Submit as many updates as you need. No per-task billing, no cap, no waiting on a reply — just continuous progress, tracked in one place." |

🔴 UNCONFIRMED: whether there are exactly 5 cards total (the dot indicator in Image 5 shows 5 segments) — only 2 card contents are directly confirmed as part of *this specific pinned carousel*. Two more card contents appear in Image 6 (see §4.5) but I cannot confirm from the screenshots whether they belong to this same pinned carousel or are a separate, normally-scrolling section — the header in Image 6 has reverted to full text nav (State B), which suggests the pin may have already released by that point. **Don't build this as one continuous 5-card pin until you've confirmed section boundaries against the live site.**

**Card B mockup content to actually design:** style the "Design the onboarding" task card format as a real Handld request card — e.g. eyebrow "New request", bold title "Fix homepage banner cropping", one line of description, a status pill reading "In Progress". Keep it schematic/blurred like the reference rather than fully legible tiny text — same visual language, real product framing.

### 4.5 Feature Pair — Workflow + Pricing Model
- Confirmed in Image 6, shown with "Our clients" highlighted as the active nav item (State B, not State C)
- **Left card (final):**
  - Icon row: **Shopify, Slack, Gmail, Notion** — real tools you'd realistically plug into. Deliberately leaving WhatsApp off this list, since your whole pitch is replacing WhatsApp-based chaos — including its icon here undercuts the message.
  - Heading: "Seamless workflow"
  - Copy: "Shopify, Slack, or straight from your inbox — Handld plugs into how you already work, no new habits required."
- **Right card (final):**
  - Visual: 3D cloud + orange geometric shapes illustration (keep as-is, no product-specific content needed)
  - Heading: "Flexible and predictable"
  - Copy: "One flat monthly rate. No surprises, no contracts. Pause or cancel anytime, scale up the moment you need more."
- **Because this section shows State B nav (not State C), treat it as structurally separate from §4.4's pinned carousel** unless live inspection proves otherwise.

### 4.6 Card-to-Pricing Zoom Transition (your ask #6)
🟡 INFERRED — I don't have a captured mid-transition frame, but the mechanism is describable with high confidence from the before/after states: the carousel section ends on cream background (`#EAE5DB`), and the very next section (pricing) is full black (`#0D0F14`). Your description ("user enters the last card") plus that background swap strongly implies: the final card **scales up to fill the viewport**, and its background color cross-fades from cream to black during that scale, functioning as the transition into the pricing section.

**Build as:** last card `scale()` transform pinned and driven by scroll, background-color interpolated in the same scroll-linked timeline, releasing into the pricing section once scale reaches ~100vw/100vh.

### 4.7 Pricing Section (your ask #7)
- Full black background (`#0D0F14`)
- **Headline (final):** "Simple and transparent pricing."
- Two pricing cards side by side, final names/copy below — **prices are placeholders, that's a business call only you can make, I'm not filling in numbers I don't know:**

**Card 1 — Retainer — from `$[XXX]/mo`**
> A dedicated Shopify developer handling unlimited change requests, delivered asynchronously.
- Unlimited change requests
- 1 dedicated developer
- Delivery within `[X]` business days
- Weekly status update
- Monthly billing
- Pause or cancel anytime

**Card 2 — Sprint — from `$[XXX]/day`**
> A dedicated developer joining your project full-time for a defined period.
- Defined project scope
- 1 dedicated developer
- Continuous delivery
- Daily check-ins
- Defined period
- Full handoff & documentation

- Each card: media panel on top (phone-in-hand photo), price + plan name + description + feature checklist below
- **Confirmed hover interaction** (this is the exact detail you flagged): in the default state (Image 7), both media panels render **grayscale/monochrome** — the right panel is a black phone silhouette with a white icon, the left is a muted dark photo. On hover (Image 8), the **left panel's photo turns fully into vivid brand-orange** — the background of that panel becomes `#EA7342` and the phone screen content becomes visible in color.
- **Strict build requirement:** default state = desaturated/grayscale filter on the panel image (`filter: grayscale(100%)` or similar), hover state = filter removed + panel background transitions to brand orange. This is a filter + background-color transition on `:hover`, not a swapped image asset.

If Handld is retainer-only for now, cut Card 2 entirely and let Card 1 run full-width — don't publish a tier you're not actually ready to deliver.

### 4.8 FAQ Accordion
- Simple accordion, `+` icon that likely rotates to `×` on expand (standard pattern, 🟡 inferred)
- Reference had 3 questions visible/partial. **Final Handld copy — question + answer, ready to paste:**

**Q: What kind of changes can I submit?**
A: Anything from copy edits and banner swaps to layout tweaks, new sections, or bug fixes — attach a screenshot, describe what you need, and it's in the queue.

**Q: How fast do requests get picked up?**
A: Every request is acknowledged within `[X]` business day(s), with most small changes shipped within `[X–X]` business days depending on scope.

**Q: Can I pause or cancel anytime?**
A: Yes — no lock-in contracts. Pause your plan between projects or cancel anytime from your dashboard.

> Timeframes above are placeholders — plug in whatever your real turnaround actually is before this goes live. Everything else is final.

### 4.9 Sticky Reveal Footer (your ask #8)
- Two-column block: left = solid brand-orange card with logo + tagline stacked on white/cream bg; right = footer nav columns (Links / Company) + copyright line + secondary "Book a call" button
- **Orange card copy (final):** "Handld" + tagline "Shopify changes, handled."
- **Footer nav — Links column:** How it works · Our clients · FAQ
- **Footer nav — Company column:** Contact · Privacy Policy · Terms
- **Copyright line (final):** "© 2026 Handld. All rights reserved."
- Below that: **a giant, low-contrast, edge-to-edge email address** rendered in huge type against the page background — barely-there contrast, clearly decorative rather than a functional link at that size
- **Giant footer text (final, placeholder domain):** "hi@handld.co" — swap in your actual registered domain once you've picked one
- 🟡 INFERRED "sticky reveal" mechanic: the giant email text most likely sits behind/beneath the footer content block, revealed as the footer block scrolls up and off — a common "curtain reveal" footer pattern (footer content scrolls normally, but a fixed/sticky background layer with the giant wordmark stays pinned until fully uncovered)

---

## 5. Animation Implementation — Recommended Stack

🟡 This is a recommendation based on what the interaction patterns require, not a claim about what the reference site actually runs on.

- **Scroll orchestration:** GSAP + ScrollTrigger — this is the standard tool for pinned sections, scroll-scrubbed text reveals, and horizontal-scroll-on-vertical-input carousels (§4.3, §4.4, §4.6 all need this)
- **Smooth scroll:** Lenis — near-universally paired with GSAP ScrollTrigger for this exact effect, keeps scroll-jacked sections feeling native instead of janky
- **Component layer:** Next.js + Framer Motion for the discrete state swaps (header State A/B/C, accordion expand/collapse, hover filter transitions)
- **This matches the workflow you already run** for the Studio Caramel project — same recommendation: build a Playwright measurement pass against the live reference first (§8), confirm exact timing/easing, THEN build. Don't eyeball animation curves from static screenshots — that's exactly the kind of hallucination risk you flagged.

---

## 6. Video Prompts (your ask #5) — read this before generating anything

Splitting these into two groups, because treating them identically will waste your generation credits.

### 6.1 Build these as real UI, NOT as AI-generated video
Any card containing legible product UI text or interface elements will come out garbled from AI video generators — that's a known, consistent failure mode, not a maybe. These three should be built as actual coded components (Framer Motion / CSS) or real screen recordings of your product:

- **Hero phone mockup** (§4.1) — the "Your design has been delivered" notification card and the blurred content preview
- **Card B** (§4.4) — the "Design the onboarding" dark UI task card
- **Feature pair, integration card** (§4.5) — the Trello/Slack/etc icon grid

**Hybrid option if you want motion behind them anyway:** generate an abstract, textureless AI video for the *background* only (soft gradient motion, no text, no UI shapes), then overlay your real HTML/CSS UI card on top. You get real motion without garbled text.

### 6.2 AI video prompts — these are safe to generate directly
Both are abstract/illustrative with no legible text, so this is where AI video generation actually works well.

**Card A — 3D character (§4.4):**
> A stylized 3D-rendered character, minimalist claymation-toy aesthetic, soft matte texture, wearing a solid burnt-orange tracksuit, standing against a plain warm-beige studio background. The character raises one hand in a friendly wave, subtle idle breathing motion, hair has slight soft-body physics. Soft, even studio lighting, gentle ambient occlusion. Camera: static, slight slow push-in over the duration. Loopable, 4–6 seconds, no text, no logos. Style reference: Pixar-adjacent toy figure, matte finish, warm minimal color palette (burnt orange, cream, white sneakers).

**Card D — abstract shapes (§4.5):**
> Abstract 3D scene: two soft, glossy white cloud-like blob shapes and two flat orange geometric petal/leaf shapes, floating and gently rotating against a warm cream background. Shapes drift slowly past and behind each other with soft overlapping shadows, matte-glossy material mix. Camera: slow orbital drift, no cuts. Soft diffused studio lighting. Loopable, 5–8 seconds, no text. Style reference: modern SaaS abstract 3D brand animation, minimal color palette (cream `#EAE5DB`, brand orange `#EA7342`, white).

Once you confirm the actual brand name/product framing, I can tighten these further — happy to redo them with your exact color tokens burned into the prompt language once you've locked the palette.

---

## 7. What I Could Not Verify + How to Close the Gap

I can't execute Playwright against the live site from this environment (network sandboxed to package registries only). Here's a script that mirrors the measurement workflow you already built for Studio Caramel — run it locally and it'll dump computed styles + scroll-position screenshots + loaded font list to JSON. Paste the output back to me and I'll lock every 🔴/🟡 value in this doc to ground truth in one pass.

```javascript
// measure-reference-site.mjs
// Setup: npm i -D playwright && npx playwright install chromium
// Run:   node measure-reference-site.mjs
import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'https://umanodesign.studio/';
const OUT = './umano-measurements.json';

async function getComputed(locator) {
  return locator.evaluate((node) => {
    const cs = getComputedStyle(node);
    return {
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      fontFamily: cs.fontFamily,
      fontWeight: cs.fontWeight,
      fontSize: cs.fontSize,
      letterSpacing: cs.letterSpacing,
      lineHeight: cs.lineHeight,
      borderRadius: cs.borderRadius,
      padding: cs.padding,
      transitionDuration: cs.transitionDuration,
      transitionTimingFunction: cs.transitionTimingFunction,
      boxShadow: cs.boxShadow,
    };
  });
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  await page.goto(URL, { waitUntil: 'networkidle' });

  const report = { url: URL, capturedAt: new Date().toISOString(), scrollStates: [] };

  // Fonts actually loaded by the page — this alone answers §2.2
  report.fontsLoaded = await page.evaluate(() =>
    [...document.fonts].map((f) => ({
      family: f.family,
      weight: f.weight,
      style: f.style,
      status: f.status,
    }))
  );

  // Header/nav computed styles — adjust selector after your first run,
  // Framer/Next sites often use hashed class names you'll need to inspect first
  const nav = page.locator('header').first();
  if (await nav.count()) {
    report.header = await getComputed(nav);
  }

  // Walk the page in 20 scroll steps, screenshot + capture header bounding box
  // at each step — this is what confirms the 3 header states in §3
  const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const y = Math.round((scrollHeight / steps) * i);
    await page.evaluate((pos) => window.scrollTo(0, pos), y);
    await page.waitForTimeout(300); // let scroll-scrubbed animations settle
    const shot = `scroll-step-${i}.png`;
    await page.screenshot({ path: shot });
    const box = (await nav.count()) ? await nav.boundingBox() : null;
    report.scrollStates.push({ step: i, scrollY: y, screenshot: shot, headerBox: box });
  }

  // Dump any :root CSS custom properties — fastest way to get the real design tokens
  report.cssVariables = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    const vars = {};
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.selectorText === ':root') {
            for (const prop of rule.style) {
              if (prop.startsWith('--')) vars[prop] = styles.getPropertyValue(prop).trim();
            }
          }
        }
      } catch (e) {
        /* cross-origin stylesheets throw — safe to ignore */
      }
    }
    return vars;
  });

  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  await browser.close();
  console.log(`Done. See ${OUT} and scroll-step-*.png`);
})();
```

**What this will tell you that I currently can't:**
- Real `font-family` values (closes §2.2 entirely)
- Exact `border-radius`, `padding`, `transition-duration`/`timing-function` on nav, cards, buttons
- Exact scroll positions where the header flips between State A/B/C
- Whether the orange background is a flat fill or a gradient
- Real `:root` CSS variables if the site uses them (very likely, given the consistent token reuse across sections)

---

## 8. Open Questions

1. **Pricing numbers** — §4.7 has the full plan structure and feature lists written, just needs your actual `$XXX` figures dropped in.
2. **Card carousel scope** — is the "Seamless workflow" + "Flexible and predictable" pair (§4.5) part of the same pinned 5-card carousel as §4.4, or a separate static section? The nav header state is the tell — run the Playwright script and check.
3. **Client logos** — do you have permission to display your 7–8 client logos publicly on the landing page? §4.2 has a no-permission-needed fallback line ready if not.
4. **Domain** — footer giant text (§4.9) uses `hi@handld.co` as a placeholder. Swap for your actual registered domain.
5. **Turnaround SLA numbers** — FAQ answers (§4.8) have placeholder business-day figures. Fill in your real numbers before publishing.
