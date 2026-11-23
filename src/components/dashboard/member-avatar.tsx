import type { CSSProperties } from "react";

import { avatarUrl } from "@/lib/supabase/avatar";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export function MemberAvatar({
  src,
  name,
  userId,
  isSelf = false,
  size = "md",
  ring = false,
  decorative = true,
}: {
  src?: string | null;
  name: string;
  userId?: string;
  isSelf?: boolean;
  size?: AvatarSize;
  ring?: boolean;
  decorative?: boolean;
}) {
  const cleanName = name.trim() || "Rally member";
  const parts = cleanName.split(/\s+/).filter(Boolean);
  const initials = (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}` : cleanName.slice(0, 2)).toUpperCase();
  const imageUrl = avatarUrl(src);
  const style = { "--avatar-hue": deterministicHue(userId ?? cleanName) } as CSSProperties;

  return (
    <span
      className={`member-avatar member-avatar--${size}${isSelf ? " member-avatar--self" : ""}${ring ? " member-avatar--ring" : ""}${imageUrl ? " member-avatar--photo" : ""}`}
      style={style}
      aria-hidden={decorative}
    >
      {imageUrl ? <img src={imageUrl} width={avatarSize[size]} height={avatarSize[size]} alt="" loading="lazy" decoding="async" /> : initials || "R"}
    </span>
  );
}

const avatarSize: Record<AvatarSize, number> = { xs: 24, sm: 32, md: 40, lg: 72, xl: 112 };

function deterministicHue(value: string): number {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return Math.abs(hash) % 360;
}
