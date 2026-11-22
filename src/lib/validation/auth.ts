import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((email) => email.toLowerCase());

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(256),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: z.string().min(12).max(256),
  displayName: z.string().trim().min(1).max(80),
});

export const emailSchemaForRecovery = z.object({ email: emailSchema });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
