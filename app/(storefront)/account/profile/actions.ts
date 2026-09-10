"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionState } from "@/lib/account/form-state";
import {
  cancelEmailChange,
  changePassword,
  ProfileError,
  requestEmailChange,
  updateProfile,
} from "@/lib/account/profile";
import { unstable_update } from "@/lib/auth";
import { requireUser } from "@/lib/auth/guards";
import { createRateLimiter } from "@/lib/rate-limit";
import { emailChangeSchema, passwordChangeSchema, profileSchema } from "@/lib/validations/account";

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

const sensitiveLimiter = createRateLimiter({
  name: "profile-sensitive",
  limit: 5,
  windowSeconds: 600,
});

function profileFailure(error: unknown): ActionState {
  if (error instanceof ProfileError) {
    return {
      status: "error",
      message: error.field ? undefined : error.message,
      fieldErrors: error.field ? { [error.field]: [error.message] } : undefined,
    };
  }
  console.error("profile action failed", error);
  return { status: "error", message: "Something went wrong. Try again in a minute." };
}

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/account/profile");
  const parsed = profileSchema.safeParse({
    name: str(formData.get("name")),
    phone: str(formData.get("phone")),
  });
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }
  await updateProfile(user.id, parsed.data);
  revalidatePath("/account");
  revalidatePath("/account/profile");
  return { status: "success", message: "Saved." };
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/account/profile");
  const limited = await sensitiveLimiter.limit(user.id);
  if (!limited.success)
    return { status: "error", message: "Too many attempts. Try again in a few minutes." };
  const parsed = passwordChangeSchema.safeParse({
    currentPassword: str(formData.get("currentPassword")) || undefined,
    newPassword: str(formData.get("newPassword")),
    confirmPassword: str(formData.get("confirmPassword")),
  });
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }
  try {
    await changePassword(user.id, parsed.data);
  } catch (error) {
    return profileFailure(error);
  }
  // Re-read the bumped session version into this session's cookie; every other
  // session is now stale. Then leave the request: a re-render here would still
  // read the old cookie header and see a mismatch.
  await unstable_update({});
  redirect("/account/profile?password=changed");
}

export async function requestEmailChangeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/account/profile");
  const limited = await sensitiveLimiter.limit(user.id);
  if (!limited.success)
    return { status: "error", message: "Too many attempts. Try again in a few minutes." };
  const parsed = emailChangeSchema.safeParse({
    email: str(formData.get("email")),
    currentPassword: str(formData.get("currentPassword")) || undefined,
  });
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }
  try {
    const result = await requestEmailChange(user.id, parsed.data);
    revalidatePath("/account/profile");
    return {
      status: "success",
      message: `We sent a link to ${result.pendingEmail}. Your address changes once you confirm it; until then, sign in with the old one.`,
    };
  } catch (error) {
    return profileFailure(error);
  }
}

export async function cancelEmailChangeAction(): Promise<void> {
  const user = await requireUser("/account/profile");
  await cancelEmailChange(user.id);
  revalidatePath("/account/profile");
}
