"use client";

import { SpriteCan } from "@/components/quest/quest";

// Hiding spots across the full page height (percentages of the page wrapper).
const SPOTS = [
  { top: "13%", left: "5%" },
  { top: "24%", left: "93%" },
  { top: "34%", left: "44%" },
  { top: "43%", left: "88%" },
  { top: "53%", left: "8%" },
  { top: "61%", left: "72%" },
  { top: "70%", left: "26%" },
  { top: "78%", left: "91%" },
  { top: "87%", left: "13%" },
  { top: "95%", left: "58%" },
];

export default function SpriteCanField() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20" aria-hidden={false}>
      {SPOTS.map((spot, index) => (
        <SpriteCan
          key={`can-${index}`}
          id={`can-${index}`}
          style={{ top: spot.top, left: spot.left }}
        />
      ))}
    </div>
  );
}
