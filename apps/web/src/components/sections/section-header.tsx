import DecodeText from "@/components/fx/decode-text";

/** Mono telemetry eyebrow + display title. Opens every section. */
export default function SectionHeader({
  sigil,
  telemetry,
  title,
}: {
  sigil: string;
  telemetry: string;
  title: string;
}) {
  return (
    <div className="mb-12">
      <p className="eyebrow mb-3">
        <span className="sigil">[{sigil}]</span> <DecodeText text={telemetry} />
      </p>
      <h2 className="font-display text-3xl font-semibold tracking-tight text-bright sm:text-4xl">
        {title}
      </h2>
    </div>
  );
}
