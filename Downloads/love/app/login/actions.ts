"use server";

import { redirect } from "next/navigation";
import { clearSession, setSession } from "@/lib/auth/session";

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const role = (formData.get("role") as string | null) === "admin" ? "admin" : "recipient";
  await setSession({ role });
  redirect(role === "admin" ? "/admin" : "/inbox");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
