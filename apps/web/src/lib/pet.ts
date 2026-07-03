/**
 * Spawns a little burst of hearts at a screen position — used when a visitor
 * clicks (pets) a cat. Pure DOM so any cat component can call it on click.
 */
export function emitHearts(x: number, y: number, count = 5) {
  if (typeof document === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) count = 1;
  const hearts = ["♥", "♡", "🐾"];
  for (let i = 0; i < count; i++) {
    const heart = document.createElement("span");
    heart.className = "pet-heart";
    heart.textContent = hearts[Math.floor(Math.random() * hearts.length)]!;
    heart.style.left = `${x + (Math.random() - 0.5) * 26}px`;
    heart.style.top = `${y - 6}px`;
    heart.style.animationDelay = `${i * 60}ms`;
    heart.style.fontSize = `${12 + Math.random() * 8}px`;
    document.body.appendChild(heart);
    window.setTimeout(() => heart.remove(), 1100 + i * 60);
  }
}
