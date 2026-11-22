export type DatabaseErrorLike = {
  code?: string;
  message?: string;
};

export type DatabaseFailureCopy = {
  fallback: string;
  permission: string;
  conflict: string;
  validation: string;
};

export function safeDatabaseMessage(
  error: DatabaseErrorLike | null | undefined,
  copy: DatabaseFailureCopy,
): string {
  if (error?.code === "P0001" && error.message?.trim().toLowerCase() === "rate limit exceeded") {
    return "Too many attempts. Please try again later.";
  }

  if (error?.code === "42501") return copy.permission;
  if (error?.code === "23505" || error?.code === "23P01") return copy.conflict;
  if (error?.code === "22023") return copy.validation;
  return copy.fallback;
}
