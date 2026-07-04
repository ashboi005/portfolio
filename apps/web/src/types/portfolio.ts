export type ProfilePayload = {
  name: string;
  role: string;
  tagline: string | null;
  status: string | null;
  location: string | null;
  bio: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  discordUsername?: string | null;
  email: string | null;
  interests: string[];
  arsenal: Record<string, string[]>;
};

export type ProjectPayload = {
  id: string;
  title: string;
  tagline: string | null;
  description: string;
  status: string;
  year: string | null;
  highlights: string[];
  techStack: string[];
  githubUrl: string | null;
  liveUrl: string | null;
  image: string | null;
  featured: boolean;
};

export type ExperiencePayload = {
  id: string;
  role: string;
  company: string;
  duration: string;
  location: string | null;
  description: string;
  highlights: string[];
  isActive: boolean;
};

export type AchievementPayload = {
  id: string;
  title: string;
  detail: string | null;
  year: string | null;
  kind: string;
};

export type SectionMeta = { sigil: string; telemetry: string; title: string };

export type VitalStat = {
  value: number;
  suffix: string;
  label: string;
  note: string;
  critical?: boolean;
};
export type VitalLoad = { label: string; pct: number; critical?: boolean };
export type VitalReadout = { label: string; base: number; spread: number; unit: string };

export type ProcessEntry = {
  pid: string;
  name: string;
  base: number;
  state: "R" | "Z" | "D" | "X" | "S";
};

export type HeroTitle = { text: string; strike?: string };

export type SiteContent = {
  site: {
    brand: string;
    brandSuffix: string;
    version: string;
    region: string;
    title: string;
    description: string;
  };
  statusQuips: string[];
  hero: {
    statusLine: { label: string; since: string; note: string };
    titles: HeroTitle[];
    terminalHint: string;
  };
  profile: ProfilePayload;
  sections: Record<string, SectionMeta>;
  vitals: { stats: VitalStat[]; loads: VitalLoad[]; readouts: VitalReadout[] };
  processes: ProcessEntry[];
  experience: ExperiencePayload[];
  projects: ProjectPayload[];
  rank: {
    tier: string;
    podium: number;
    teamsLed: number;
    teamsSuffix: string;
    xpPct: number;
    nextTier: string;
  };
  achievements: AchievementPayload[];
  activity: string[];
  boot: { lines: string[]; granted: string };
  contact: { responseMessage: string };
  game: { total: number; intro: string; lines: string[]; reward: string };
  floaters: string[];
  warp: {
    icons: string[];
    words: string[];
    lengthVh: number;
    count: number;
    iconShare: number;
    wordShare: number;
    iconScale: number;
    wordScale: number;
  };
  footer: { note: string; copyright: string; stackLine: string };
};
