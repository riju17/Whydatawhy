"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
      disabled={pending}
    >
      {pending ? "Signing in..." : "Enter"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form
      action={formAction}
      className="space-y-6 rounded-3xl bg-card/80 p-8 shadow-card ring-1 ring-border backdrop-blur"
    >
      <div className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
          Private entry
        </p>
        <h1 className="text-2xl font-display text-foreground">
          Unlock Our Mailbox
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose your role and step inside. Passcodes are temporarily disabled.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-inner transition hover:border-primary/50">
          <input
            type="radio"
            name="role"
            value="recipient"
            defaultChecked
            className="accent-primary"
          />
          <span className="font-medium text-foreground">Recipient (K)</span>
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-inner transition hover:border-primary/50">
          <input
            type="radio"
            name="role"
            value="admin"
            className="accent-primary"
          />
          <span className="font-medium text-foreground">Admin (R)</span>
        </label>
      </div>

      {state.error ? (
        <p className="rounded-xl bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
