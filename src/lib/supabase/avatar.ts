import { getSupabasePublicConfig } from "@/lib/config";

const avatarPathPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/avatar\.(?:webp|jpg)$/i;

export function avatarUrl(path: string | null | undefined): string | null {
  if (!path || !avatarPathPattern.test(path)) return null;
  const config = getSupabasePublicConfig();
  if (!config) return null;
  const objectPath = path.split("/").map(encodeURIComponent).join("/");
  return `${config.url.replace(/\/$/, "")}/storage/v1/object/public/avatars/${objectPath}`;
}
