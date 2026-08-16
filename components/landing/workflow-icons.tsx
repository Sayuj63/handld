"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import {
  AdobeIcon,
  AtlassianIcon,
  ClaudeIcon,
  FigmaIcon,
  GithubIcon,
  LinearIcon,
  LovableIcon,
  NotionIcon,
  SketchIcon,
  SlackIcon,
  TailwindIcon,
  TrelloIcon,
} from "@/components/landing/app-icons";

gsap.registerPlugin(ScrollTrigger);

// Each icon sits in a virtual "pile" — the positions describe the reference
// image (bottom row of 7, next row of 4, next row of 3, top row of 3). The
// pile bleeds off the left edge to feel like a heavier stack.
type Tile = {
  key: string;
  Component: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  // grid column & row, 0-indexed from the bottom-left corner of the pile
  col: number;
  row: number;
  // physics response — heavier icons in the middle wobble less on scroll
  weight: number;
  tint?: string;
};

const TILES: Tile[] = [
  // bottom row
  { key: "lovable", Component: LovableIcon, col: 0, row: 0, weight: 0.4 },
  { key: "linear", Component: LinearIcon, col: 1, row: 0, weight: 0.5 },
  { key: "tailwind", Component: TailwindIcon, col: 2, row: 0, weight: 0.4 },
  { key: "claude", Component: ClaudeIcon, col: 3, row: 0, weight: 0.6 },
  { key: "slack", Component: SlackIcon, col: 4, row: 0, weight: 0.5 },
  { key: "adobe", Component: AdobeIcon, col: 5, row: 0, weight: 0.4 },
  // second row
  { key: "figma", Component: FigmaIcon, col: 0, row: 1, weight: 0.7 },
  { key: "notion", Component: NotionIcon, col: 2, row: 1, weight: 0.7 },
  { key: "github", Component: GithubIcon, col: 3, row: 1, weight: 0.6 },
  { key: "atlassian", Component: AtlassianIcon, col: 4, row: 1, weight: 0.6 },
  // third row
  { key: "sketch", Component: SketchIcon, col: 1, row: 2, weight: 0.8 },
  { key: "lovable-top", Component: LovableIcon, col: 2, row: 2, weight: 0.9 },
  { key: "trello", Component: TrelloIcon, col: 3, row: 2, weight: 0.8 },
];

// A single scroll-progress "target" icon that hovers to the right of the pile,
// exactly matching the reference's orange-ringed dot.
export function WorkflowIcons() {
  const pileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pile = pileRef.current;
    if (!pile) return;

    const tiles = Array.from(pile.querySelectorAll<HTMLElement>(".hd-pile__tile"));
    const ctx = gsap.context(() => {
      // "Gravity" idle: each tile has a subtle sway on a spring so the pile
      // reads as physical — but tuned per-tile weight so it feels lived-in.
      tiles.forEach((tile) => {
        const weight = parseFloat(tile.dataset.weight || "0.5");
        gsap.to(tile, {
          rotation: `random(${-2 * (1 - weight)}, ${2 * (1 - weight)})`,
          duration: 4 + Math.random() * 2,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: Math.random() * 1.5,
        });
      });

      // Scroll-linked physics: on entry, icons drop into place with stagger;
      // on scroll-past, they wobble in reaction (heavier tiles resist more).
      gsap.from(tiles, {
        y: -60,
        opacity: 0,
        rotation: () => gsap.utils.random(-40, 40),
        stagger: { each: 0.05, from: "random" },
        duration: 1,
        ease: "back.out(1.6)",
        scrollTrigger: {
          trigger: pile,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });

      // Continuous scroll response — icons shift + tilt as scroll progresses
      // through the card. Weight modulates response so it reads as physical.
      tiles.forEach((tile) => {
        const weight = parseFloat(tile.dataset.weight || "0.5");
        const seed = Math.random() * 2 - 1;
        gsap.to(tile, {
          x: () => seed * 30 * (1 - weight),
          y: () => seed * 20 * (1 - weight),
          rotation: () => seed * 12 * (1 - weight),
          ease: "none",
          scrollTrigger: {
            trigger: pile.closest(".hd-carousel__slide") || pile,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.2,
          },
        });
      });
    }, pile);

    return () => ctx.revert();
  }, []);

  const TILE = 68; // icon tile size in px
  const GAP = 6;
  const cols = 6;
  const rows = 3;

  const width = cols * TILE + (cols - 1) * GAP;
  const height = rows * TILE + (rows - 1) * GAP;

  return (
    <div className="hd-workflow-art" aria-hidden>
      <div
        ref={pileRef}
        className="hd-pile"
        style={{ width, height }}
      >
        {TILES.map((tile) => {
          const Icon = tile.Component;
          const left = tile.col * (TILE + GAP);
          const bottom = tile.row * (TILE + GAP);
          return (
            <div
              key={tile.key}
              className="hd-pile__tile"
              data-weight={tile.weight}
              style={{
                left,
                bottom,
                width: TILE,
                height: TILE,
                zIndex: tile.row * 10 + tile.col,
              }}
            >
              <div className="hd-pile__tile-inner">
                <Icon width={TILE - 20} height={TILE - 20} />
              </div>
            </div>
          );
        })}

        {/* Scroll-progress target — the small orange ringed dot from the ref */}
        <span className="hd-pile__target" aria-hidden />
      </div>
    </div>
  );
}
