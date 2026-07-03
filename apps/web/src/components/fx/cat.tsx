/**
 * A retro pixel-art cat, cyan only. Built from crisp grid rects (no curves) so
 * it reads as a sprite. Legs animate on a 2-frame stepped walk when the sprite
 * (or an ancestor) carries `.is-walking`; the tail flicks and the eye blinks.
 * Poses: "walk" (default side profile) and "sleep" (a curled loaf).
 * Faces right; flip with scaleX(-1).
 */

type Variant = "cyan" | "deep";

const PALETTES: Record<Variant, { body: string; shade: string; dark: string }> = {
  cyan: { body: "#33e0ff", shade: "#17a8cc", dark: "#0b5063" },
  deep: { body: "#22b8d8", shade: "#128aa6", dark: "#083a48" },
};

const EYE = "#eafcff";
const PUPIL = "#041016";

type Cell = { x: number; y: number; w: number; h: number; c: string; cls?: string };

function pixels(cells: Cell[], u: number) {
  return cells.map((cell, index) => (
    <rect
      // biome-ignore lint: static sprite
      key={index}
      x={cell.x * u}
      y={cell.y * u}
      width={cell.w * u}
      height={cell.h * u}
      fill={cell.c}
      className={cell.cls}
    />
  ));
}

export default function Cat({
  variant = "cyan",
  pose = "walk",
  scale = 1,
  className,
}: {
  variant?: Variant;
  pose?: "walk" | "sleep";
  scale?: number;
  className?: string;
}) {
  const p = PALETTES[variant];
  const u = 3.4 * scale;

  if (pose === "sleep") {
    const w = 19;
    const h = 13;
    const body: Cell[] = [
      { x: 2, y: 6, w: 12, h: 5, c: p.body },
      { x: 2, y: 10, w: 12, h: 1, c: p.shade },
      { x: 12, y: 5, w: 5, h: 4, c: p.body },
      { x: 11, y: 8, w: 6, h: 1, c: p.shade },
      { x: 12, y: 4, w: 1, h: 1, c: p.dark },
      { x: 16, y: 4, w: 1, h: 1, c: p.dark },
      { x: 2, y: 9, w: 6, h: 1, c: p.shade },
    ];
    return (
      <div className={`cat ${className ?? ""}`} style={{ width: w * u, height: h * u }}>
        <svg width={w * u} height={h * u} viewBox={`0 0 ${w * u} ${h * u}`} aria-hidden>
          {pixels(body, u)}
          {/* closed eyes */}
          <rect x={13 * u} y={7 * u} width={1 * u} height={1 * u} fill={p.dark} />
          <rect x={15 * u} y={7 * u} width={1 * u} height={1 * u} fill={p.dark} />
        </svg>
      </div>
    );
  }

  const w = 18;
  const h = 13;

  // static structure
  const structure: Cell[] = [
    // body
    { x: 2, y: 6, w: 11, h: 4, c: p.body, cls: "cat-body" },
    { x: 2, y: 9, w: 11, h: 1, c: p.shade, cls: "cat-body" },
    { x: 3, y: 5, w: 3, h: 1, c: p.body, cls: "cat-body" },
    { x: 10, y: 5, w: 3, h: 1, c: p.body, cls: "cat-body" },
    // head
    { x: 11, y: 2, w: 6, h: 4, c: p.body },
    { x: 11, y: 5, w: 6, h: 1, c: p.shade },
    { x: 17, y: 4, w: 1, h: 2, c: p.shade },
    // ears
    { x: 11, y: 1, w: 2, h: 1, c: p.dark },
    { x: 15, y: 1, w: 2, h: 1, c: p.dark },
    { x: 11, y: 0, w: 1, h: 1, c: p.dark },
    { x: 16, y: 0, w: 1, h: 1, c: p.dark },
  ];

  return (
    <div className={`cat ${className ?? ""}`} style={{ width: w * u, height: h * u }}>
      <svg width={w * u} height={h * u} viewBox={`0 0 ${w * u} ${h * u}`} aria-hidden>
        {/* tail */}
        <g className="cat-tail">
          <rect x={1 * u} y={6 * u} width={u} height={u} fill={p.shade} />
          <rect x={0} y={4 * u} width={u} height={2 * u} fill={p.shade} />
          <rect x={0} y={3 * u} width={u} height={u} fill={p.dark} />
        </g>

        {/* far legs (shade) */}
        <rect className="leg leg-b2" x={6 * u} y={10 * u} width={2 * u} height={3 * u} fill={p.shade} />
        <rect className="leg leg-f1" x={10 * u} y={10 * u} width={2 * u} height={3 * u} fill={p.shade} />

        {pixels(structure, u)}

        {/* near legs (body) */}
        <rect className="leg leg-b1" x={3 * u} y={10 * u} width={2 * u} height={3 * u} fill={p.body} />
        <rect className="leg leg-f2" x={12 * u} y={10 * u} width={2 * u} height={3 * u} fill={p.body} />

        {/* eye */}
        <rect className="cat-eye" x={14 * u} y={3 * u} width={2 * u} height={2 * u} fill={EYE} />
        <rect className="cat-eye" x={15 * u} y={3 * u} width={u} height={2 * u} fill={PUPIL} />
      </svg>
    </div>
  );
}
