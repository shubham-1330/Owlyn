/** Shared result shape for account forms driven by useActionState. Kept out of "use server" files. */
export type ActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const idleState: ActionState = { status: "idle" };

export function fieldError(state: ActionState, name: string): string | undefined {
  return state.fieldErrors?.[name]?.[0];
}
