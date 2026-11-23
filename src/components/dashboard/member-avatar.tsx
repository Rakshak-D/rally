import Image from "next/image";

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
  const tone = deterministicTone(userId ?? cleanName);

  return (
    <span
      className={`member-avatar member-avatar--${size} member-avatar--tone-${tone}${isSelf ? " member-avatar--self" : ""}${ring ? " member-avatar--ring" : ""}${imageUrl ? " member-avatar--photo" : ""}`}
      aria-hidden={decorative}
    >
      {imageUrl ? <Image src={imageUrl} width={avatarSize[size]} height={avatarSize[size]} alt="" loading="lazy" decoding="async" unoptimized /> : initials || "R"}
    </span>
  );
}

const avatarSize: Record<AvatarSize, number> = { xs: 24, sm: 32, md: 40, lg: 72, xl: 112 };

function deterministicTone(value: string): number {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return Math.abs(hash) % 6 + 1;
}
