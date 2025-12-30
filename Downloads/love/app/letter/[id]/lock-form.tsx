"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { LockInfo } from "./page";
import {
  skipLockAction,
  verifyLockAction,
  type LockState,
} from "./lock-actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
      disabled={pending}
    >
      {pending ? "Checking..." : "Unlock"}
    </button>
  );
}

type LockFormProps = {
  letterId: string;
  lock: LockInfo;
  initialState: LockState;
};

export function LockForm({ letterId, lock, initialState }: LockFormProps) {
  const [state, formAction] = useActionState(verifyLockAction, initialState);
  const [skipState, skipAction] = useActionState(skipLockAction, initialState);

  const showHint = (state.showHint && state.hint) || (skipState.showHint && skipState.hint);
  const canSkip = state.canSkip || skipState.canSkip;
  const error = state.error || skipState.error;
  const attempts = Math.max(state.attempts, skipState.attempts);

  return (
    <div className="w-full max-w-xl rounded-3xl bg-card/80 p-6 shadow-card ring-1 ring-border">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="id" value={letterId} />
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            {lock.type === "pin" ? "Enter PIN" : "Answer to unlock"}
          </p>
          {lock.type === "quiz" && lock.quizPrompt ? (
            <p className="text-sm font-semibold text-foreground">{lock.quizPrompt}</p>
          ) : null}
          <input
            name="answer"
            type={lock.type === "pin" ? "password" : "text"}
            inputMode={lock.type === "pin" ? "numeric" : "text"}
            autoComplete="off"
            required
            minLength={lock.type === "pin" ? 4 : 1}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground shadow-inner outline-none ring-offset-background transition focus:ring-2 focus:ring-ring focus:ring-offset-2"
            placeholder={lock.type === "pin" ? "••••" : "Type your answer"}
          />
        </div>

        {error ? (
          <p className="rounded-xl bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        {showHint ? (
          <p className="rounded-xl bg-accent/20 px-4 py-2 text-sm text-foreground">
            Hint: {state.hint ?? skipState.hint}
          </p>
        ) : null}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Attempts: {attempts}</span>
          {canSkip ? (
            <button
              type="submit"
              formAction={skipAction}
              className="rounded-full bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground transition hover:bg-muted/80"
            >
              Skip &amp; Open
            </button>
          ) : (
            <span className="rounded-full bg-muted/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
              Locked
            </span>
          )}
        </div>

        <SubmitButton />
      </form>
    </div>
  );
}
