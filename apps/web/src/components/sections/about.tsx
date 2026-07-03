import Parallax from "@/components/fx/parallax";
import ProcessMonitor from "@/components/fx/process-monitor";
import Reveal from "@/components/fx/reveal";
import Arsenal from "@/components/sections/arsenal";
import SectionHeader from "@/components/sections/section-header";
import { sections } from "@/lib/content";
import { highlightKeywords } from "@/lib/keywords";
import type { ProfilePayload } from "@/types/portfolio";

function IdentityCard({ profile }: { profile: ProfilePayload }) {
  return (
    <div className="panel corner-ticks p-5 font-mono text-xs leading-relaxed sm:text-[13px]">
      <div className="mb-3 flex items-center justify-between text-[11px] text-dim">
        <span>GET /api/v1/profile</span>
        <span className="text-cyan">200 OK</span>
      </div>
      <pre className="whitespace-pre-wrap">
        <span className="json-plain">{"{"}</span>
        {"\n  "}
        <span className="json-key">"name"</span>
        <span className="json-plain">: </span>
        <span className="json-string">"{profile.name}"</span>
        <span className="json-plain">,</span>
        {"\n  "}
        <span className="json-key">"class"</span>
        <span className="json-plain">: </span>
        <span className="json-string">"{profile.role}"</span>
        <span className="json-plain">,</span>
        {"\n  "}
        <span className="json-key">"status"</span>
        <span className="json-plain">: </span>
        <span className="json-string">"{profile.status}"</span>
        <span className="json-plain">,</span>
        {"\n  "}
        <span className="json-key">"location"</span>
        <span className="json-plain">: </span>
        <span className="json-string">"{profile.location}"</span>
        <span className="json-plain">,</span>
        {"\n  "}
        <span className="json-key">"interests"</span>
        <span className="json-plain">: [</span>
        {profile.interests.map((interest, index) => (
          <span key={interest}>
            {"\n    "}
            <span className="json-string">"{interest}"</span>
            {index < profile.interests.length - 1 && <span className="json-plain">,</span>}
          </span>
        ))}
        {"\n  "}
        <span className="json-plain">],</span>
        {"\n  "}
        <span className="json-key">"hobbies"</span>
        <span className="json-plain">: </span>
        <span className="critical">null</span>
        <span className="json-plain">
          {"  "}// not a bug
        </span>
        {"\n"}
        <span className="json-plain">{"}"}</span>
      </pre>
    </div>
  );
}

export default function About({ profile }: { profile: ProfilePayload }) {
  return (
    <section id="whoami" className="grid-texture relative overflow-hidden border-t border-line">
      <div className="relative mx-auto w-full max-w-6xl px-6 py-24 lg:px-10 lg:py-32">
        <SectionHeader {...sections.whoami} />

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="space-y-8">
            <Reveal>
              <div className="max-w-prose space-y-5 text-[15px] leading-[1.7] text-bright/85 sm:text-base">
                <p className="font-mono text-xs text-cyan">$ cat bio.txt</p>
                {(profile.bio ?? "").split(/\n+/).map((paragraph) => (
                  <p key={paragraph.slice(0, 24)}>{highlightKeywords(paragraph)}</p>
                ))}
                <p className="font-mono text-xs text-dim">
                  {"// every word on this page lives in one editable JSON file."}
                  <br />
                  {"// no CMS, no database — just content.json and vibes."}
                  <span className="blink-cursor text-cyan"> ▊</span>
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <ProcessMonitor />
            </Reveal>
          </div>

          <Parallax distance={40}>
            <IdentityCard profile={profile} />
          </Parallax>
        </div>

        <Arsenal arsenal={profile.arsenal} />
      </div>
    </section>
  );
}
