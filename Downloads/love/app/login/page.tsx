import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="relative isolate w-full max-w-lg">
        <div className="pointer-events-none absolute -left-16 -top-24 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 -bottom-24 h-48 w-48 rounded-full bg-secondary/60 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-10 top-6 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="relative">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
