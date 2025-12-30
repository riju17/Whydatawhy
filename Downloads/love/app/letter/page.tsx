import { getSession } from "@/lib/auth/session";

export default async function LetterPage() {
  const session = await getSession();

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl rounded-3xl bg-card/80 px-8 py-10 shadow-card ring-1 ring-border backdrop-blur">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
          Recipient
        </p>
        <h1 className="mt-2 text-3xl font-display text-foreground">
          Letter View
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Signed in as <span className="font-semibold">{session?.role}</span>.
          This page will eventually render a single letter.
        </p>
      </div>
    </main>
  );
}
