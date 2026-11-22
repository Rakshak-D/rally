export function MemberAvatar({ name, isSelf = false, size = "normal" }: { name: string; isSelf?: boolean; size?: "normal" | "small" }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}` : name.slice(0, 2)).toUpperCase();

  return (
    <span className={`member-avatar${size === "small" ? " member-avatar--small" : ""}${isSelf ? " member-avatar--self" : ""}`} aria-hidden="true">
      {initials || "R"}
    </span>
  );
}
