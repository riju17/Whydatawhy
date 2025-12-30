import { ComposeForm } from "./compose-form";

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const params = await searchParams;
  const initialTemplate = params?.template;

  return (
    <main className="min-h-screen px-5 py-12 sm:px-8 lg:px-12">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Admin
          </p>
          <h1 className="text-3xl font-display text-foreground sm:text-4xl">
            Compose &amp; Send
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Pick a template, choose a lock, and send a new letter.
          </p>
        </header>

        <ComposeForm initialTemplate={initialTemplate} />
      </section>
    </main>
  );
}
