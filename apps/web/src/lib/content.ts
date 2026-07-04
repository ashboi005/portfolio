import raw from "@/content/content.json";
import type { SiteContent } from "@/types/portfolio";

/**
 * The single source of truth for everything editable on the site.
 * Edit `src/content/content.json` — profile, projects, experience, wins, hero
 * titles, nav quips, vitals, footer, images, links, all of it.
 * No backend, no database: change the JSON, the site changes.
 */
export const content = raw as SiteContent;

export const {
  site,
  statusQuips,
  hero,
  profile,
  sections,
  vitals,
  processes,
  experience,
  projects,
  rank,
  achievements,
  activity,
  boot,
  footer,
  game,
  floaters,
  warp,
} = content;
