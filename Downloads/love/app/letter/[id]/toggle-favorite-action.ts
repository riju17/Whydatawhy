"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function toggleFavoriteAction(formData: FormData) {
  const id = formData.get("id");
  if (!id || typeof id !== "string") {
    return;
  }

  await db.execute({
    sql: `
      UPDATE letters
      SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END,
          favorite_toggles = COALESCE(favorite_toggles, 0) + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    args: [id],
  });

  revalidatePath(`/letter/${id}`);
}
