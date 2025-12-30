"use server";

import { cookies } from "next/headers";
import { z } from "zod";

const themes = ["cozy", "stamps", "quilt", "blue"] as const;

const schema = z.object({
  theme: z.enum(themes),
});

export type ThemeState = {
  status?: "success" | "error";
  message?: string;
};

export async function setThemeAction(
  _prev: ThemeState,
  formData: FormData,
): Promise<ThemeState> {
  const parsed = schema.safeParse({
    theme: formData.get("theme"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Invalid theme." };
  }

  const store = await cookies();
  store.set("theme", parsed.data.theme, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return { status: "success", message: "Theme updated." };
}
