import { facts } from "@/lib/content";

const shown = new Set<number>();

export function nextFact(): string {
  if (shown.size >= facts.length) shown.clear();

  let idx: number;
  do {
    idx = Math.floor(Math.random() * facts.length);
  } while (shown.has(idx));

  shown.add(idx);
  return facts[idx]!;
}
