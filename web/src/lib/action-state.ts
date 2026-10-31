/** Resultado de una Server Action para formularios (serializable al cliente). */
export type ActionState =
  | { readonly status: "idle" }
  | { readonly status: "success"; readonly message?: string; readonly at: number }
  | {
      readonly status: "error";
      readonly message: string;
      readonly fieldErrors: Readonly<Record<string, string>>;
      readonly at: number;
    };

export const IDLE: ActionState = { status: "idle" };
