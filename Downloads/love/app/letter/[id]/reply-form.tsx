"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitReplyAction, type ReplyState } from "./reply-actions";

const reactions = ["❤️", "🌸", "🤗", "✨", "💌", "🌙"] as const;

const initialState: ReplyState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
      disabled={pending}
    >
      {pending ? "Sending..." : "Send"}
    </button>
  );
}

export function ReplyForm({ letterId }: { letterId: string }) {
  const [state, formAction] = useActionState(submitReplyAction, initialState);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-2xl bg-card/80 p-4 shadow-inner ring-1 ring-border"
    >
      <input type="hidden" name="letterId" value={letterId} />

      <div className="flex flex-wrap gap-2">
        {reactions.map((reaction, idx) => (
          <label
            key={reaction}
            className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm shadow-sm transition hover:border-primary/50"
          >
            <input
              type="radio"
              name="reaction"
              value={reaction}
              defaultChecked={idx === 0}
              className="accent-primary"
            />
            <span>{reaction}</span>
          </label>
        ))}
      </div>
      {state.errors?.reaction ? (
        <p className="text-sm text-destructive">{state.errors.reaction}</p>
      ) : null}

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Your reply (1–2 lines)
        </label>
        <textarea
          name="message"
          rows={2}
          maxLength={240}
          placeholder="A short, tender reply..."
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground shadow-inner outline-none ring-offset-background transition focus:ring-2 focus:ring-ring focus:ring-offset-2"
        />
        {state.errors?.message ? (
          <p className="text-sm text-destructive">{state.errors.message}</p>
        ) : null}
      </div>

      {state.status === "success" ? (
        <p className="rounded-xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
          {state.message}
        </p>
      ) : null}
      {state.status === "error" && state.message ? (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
