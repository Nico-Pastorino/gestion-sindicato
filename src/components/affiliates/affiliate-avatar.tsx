import Image from "next/image";

// Avatar del afiliado: foto de perfil si existe, iniciales si no.
// Server-safe (sin estado): usable en tablas, fichas y widgets.

const SIZES = {
  sm: { box: "h-8 w-8 text-xs", px: 32 },
  md: { box: "h-10 w-10 text-sm", px: 40 },
  lg: { box: "h-16 w-16 text-lg", px: 64 },
  xl: { box: "h-24 w-24 text-2xl", px: 96 },
} as const;

export function AffiliateAvatar({
  name,
  photoUrl,
  size = "md",
  className = "",
}: {
  name: string;
  photoUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (photoUrl) {
    return (
      <span className={`relative inline-block shrink-0 overflow-hidden rounded-full ${s.box} ${className}`}>
        <Image
          src={photoUrl}
          alt={`Foto de ${name}`}
          width={s.px}
          height={s.px}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[hsl(var(--muted))] font-semibold text-[hsl(var(--muted-foreground))] ${s.box} ${className}`}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}
