/** Shared shape for the login and register forms. Kept out of the "use server" file. */
export type AuthFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "phone" | "password", string[]>>;
  values?: Partial<Record<"name" | "email" | "phone", string>>;
};

export const initialAuthState: AuthFormState = { status: "idle" };
