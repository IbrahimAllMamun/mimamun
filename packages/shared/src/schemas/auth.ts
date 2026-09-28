import { z } from "zod";
import { USER_STATUSES } from "../enums";
import { ALL_PERMISSIONS } from "../permissions";
import { email, requiredText, uuid } from "./common";

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Password policy (NIST SP 800-63B style): length over composition rules.
 * 12–128 characters; the maximum bounds hashing cost.
 */
export const password = z
  .string({ error: "Password is required" })
  .min(PASSWORD_MIN_LENGTH, { error: `Use at least ${PASSWORD_MIN_LENGTH} characters` })
  .max(PASSWORD_MAX_LENGTH, { error: `Use at most ${PASSWORD_MAX_LENGTH} characters` })
  .refine((value) => new Set(value).size >= 5, {
    error: "Password is too repetitive",
  });

export const loginInput = z.object({
  email: z.string().trim().toLowerCase().pipe(email),
  // Length-limited but not policy-checked, so old passwords still work after a policy change.
  password: z.string().min(1, { error: "Password is required" }).max(PASSWORD_MAX_LENGTH),
});
export type LoginInput = z.infer<typeof loginInput>;

export const forgotPasswordInput = z.object({
  email: z.string().trim().toLowerCase().pipe(email),
});

export const resetPasswordInput = z.object({
  token: z.string().min(20).max(200),
  password,
});

export const changePasswordInput = z
  .object({
    currentPassword: z
      .string()
      .min(1, { error: "Current password is required" })
      .max(PASSWORD_MAX_LENGTH),
    newPassword: password,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    error: "Choose a password you have not used here before",
    path: ["newPassword"],
  });

export const userCreateInput = z.object({
  email: z.string().trim().toLowerCase().pipe(email),
  name: requiredText(120, "Name"),
  roleId: uuid,
  password,
});
export type UserCreateInput = z.infer<typeof userCreateInput>;

export const userUpdateInput = z.object({
  name: requiredText(120, "Name"),
  roleId: uuid,
  status: z.enum(USER_STATUSES),
});
export type UserUpdateInput = z.infer<typeof userUpdateInput>;

export const roleInput = z.object({
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9_]{1,31}$/, { error: "Use 2–32 capital letters, digits or underscores" }),
  name: requiredText(80, "Name"),
  description: z.string().trim().max(300).default(""),
  permissions: z.array(z.enum(ALL_PERMISSIONS as [string, ...string[]])).max(50),
});
export type RoleInput = z.infer<typeof roleInput>;
