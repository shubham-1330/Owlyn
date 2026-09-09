"use server";

import { Prisma } from "@prisma/client";
import { AuthError } from "next-auth";
import { z } from "zod";

import { signIn, signOut } from "@/lib/auth";
import { hashPassword } from "@/lib/auth/password";
import { safeNextPath } from "@/lib/auth/safe-next";
import { db } from "@/lib/db";
import { loginSchema, registerSchema } from "@/lib/validations/auth";

import { initialAuthState, type AuthFormState } from "./form-state";

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const raw = {
    email: str(formData.get("email")),
    password: str(formData.get("password")),
    next: str(formData.get("next")) || undefined,
  };
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values: { email: raw.email },
    };
  }

  const redirectTo = safeNextPath(parsed.data.next, "/account");
  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        status: "error",
        message: "That email and password do not match.",
        values: { email: raw.email },
      };
    }
    throw error;
  }
  return initialAuthState;
}

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const raw = {
    name: str(formData.get("name")),
    email: str(formData.get("email")),
    phone: str(formData.get("phone")),
    password: str(formData.get("password")),
    next: str(formData.get("next")) || undefined,
  };
  const values = { name: raw.name, email: raw.email, phone: raw.phone };
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const { name, email, phone, password } = parsed.data;
  const duplicate = {
    status: "error" as const,
    fieldErrors: { email: ["An account with this email already exists. Sign in instead."] },
    values,
  };

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return duplicate;

  try {
    await db.user.create({
      data: {
        name,
        email,
        phone: phone ?? null,
        passwordHash: await hashPassword(password),
        role: "CUSTOMER",
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return duplicate;
    throw error;
  }

  const redirectTo = safeNextPath(parsed.data.next, "/account?welcome=1");
  try {
    await signIn("credentials", { email, password, redirectTo });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        status: "error",
        message: "Your account was created but sign-in failed. Try signing in.",
        values,
      };
    }
    throw error;
  }
  return initialAuthState;
}

export async function googleSignInAction(next: string | undefined): Promise<void> {
  await signIn("google", { redirectTo: safeNextPath(next, "/account") });
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
