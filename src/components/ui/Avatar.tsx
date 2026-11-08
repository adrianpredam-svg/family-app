type Props = { name: string; color: string; size?: number };

/** Coloured circle with the member's first letter. */
export function Avatar({ name, color, size = 32 }: Props) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ background: color, width: size, height: size, fontSize: size * 0.45 }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
