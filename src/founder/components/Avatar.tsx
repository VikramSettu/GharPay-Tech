import { EMPLOYEES } from "@/founder/data/seed";

const COLORS = [
  ["#FF7849", "#FFB75E"],
  ["#5B8DEF", "#9B7BFF"],
  ["#22C55E", "#4ADE80"],
  ["#F472B6", "#FB7185"],
  ["#06B6D4", "#3B82F6"],
  ["#F59E0B", "#EF4444"],
  ["#A78BFA", "#EC4899"],
  ["#10B981", "#0EA5E9"],
  ["#EAB308", "#F97316"],
  ["#8B5CF6", "#D946EF"],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function avatarPair(seed: string) {
  return COLORS[hash(seed) % COLORS.length];
}

export function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface AvatarProps {
  id?: string;
  name?: string;
  size?: number;
  className?: string;
}

export function Avatar({ id, name, size = 32, className = "" }: AvatarProps) {
  const emp = id ? EMPLOYEES.find((e) => e.id === id) : null;
  const display = name ?? emp?.name ?? "?";
  const seed = emp?.avatarSeed ?? display;
  const [c1, c2] = avatarPair(seed);
  const initials = initialsOf(display);
  const fontSize = Math.max(10, Math.round(size * 0.4));
  return (
    <div
      className={`shrink-0 inline-flex items-center justify-center rounded-full font-display font-semibold text-white shadow-sm ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
        fontSize,
      }}
      aria-label={display}
      title={display}
    >
      {initials}
    </div>
  );
}
