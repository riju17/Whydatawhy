"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  saveDraftAction,
  sendLetterAction,
  scheduleLetterAction,
  type ComposeState,
} from "./actions";
import { ImageUploader } from "./image-uploader";

const templates = ["postcard", "ancient", "sticky", "polaroid", "telegram", "openwhen"] as const;
const palettes = ["rose", "navy", "sage"] as const;
const lockTypes = ["none", "pin", "quiz"] as const;

const initialState: ComposeState = {};

type FormState = {
  id: string | null;
  title: string;
  openWhen: string;
  content: string;
  template: (typeof templates)[number];
  palette: (typeof palettes)[number];
  coverEmoji: string;
  lockType: (typeof lockTypes)[number];
  pin: string;
  quizPrompt: string;
  quizAnswer: string;
  hint: string;
  allowSkip: boolean;
  sendAt: string;
  imageUrl: string;
};

function isValidTemplate(value: string): value is (typeof templates)[number] {
  return (templates as readonly string[]).includes(value);
}

export function ComposeForm({ initialTemplate = "postcard" }: { initialTemplate?: string }) {
  const [sendState, sendAction] = useActionState(sendLetterAction, initialState);
  const [draftState, draftAction] = useActionState(saveDraftAction, initialState);
  const [scheduleState, scheduleAction] = useActionState(scheduleLetterAction, initialState);
  const [form, setForm] = useState<FormState>({
    id: null,
    title: "",
    openWhen: "",
    content: "",
    template: isValidTemplate(initialTemplate) ? initialTemplate : "postcard",
    palette: "rose",
    coverEmoji: "",
    lockType: "none",
    pin: "",
    quizPrompt: "",
    quizAnswer: "",
    hint: "",
    allowSkip: false,
    sendAt: "",
    imageUrl: "",
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  // Capture returned draft id
  useEffect(() => {
    if (draftState?.draftId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm((prev) => ({ ...prev, id: draftState.draftId ?? prev.id }));
      setStatusMessage("Draft saved");
    }
  }, [draftState?.draftId]);

  useEffect(() => {
    if (sendState?.draftId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm((prev) => ({ ...prev, id: sendState.draftId ?? prev.id }));
    }
  }, [sendState?.draftId]);

  useEffect(() => {
    if (scheduleState?.draftId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm((prev) => ({ ...prev, id: scheduleState.draftId ?? prev.id }));
      if (scheduleState?.status === "success") setStatusMessage("Scheduled");
    }
  }, [scheduleState?.draftId, scheduleState?.status]);

  // Autosave every 3s when form changes and has any content
  useEffect(() => {
    const hasContent =
      form.title.trim() ||
      form.openWhen.trim() ||
      form.content.trim() ||
      form.coverEmoji.trim();

    if (!hasContent) return;

    const timer = setTimeout(() => {
      startSaving(async () => {
        const fd = new FormData();
        if (form.id) fd.append("id", form.id);
        fd.append("title", form.title);
        fd.append("openWhen", form.openWhen);
        fd.append("content", form.content);
        fd.append("template", form.template);
        fd.append("palette", form.palette);
        fd.append("coverEmoji", form.coverEmoji);
        fd.append("lockType", form.lockType);
        fd.append("pin", form.pin);
        fd.append("quizPrompt", form.quizPrompt);
        fd.append("quizAnswer", form.quizAnswer);
        fd.append("hint", form.hint);
        fd.append("imageUrl", form.imageUrl);
        if (form.allowSkip) fd.append("allowSkip", "on");
        if (form.sendAt) fd.append("sendAt", form.sendAt);
        const res = await saveDraftAction(draftState, fd);
        if (res?.draftId) {
          setForm((prev) => ({ ...prev, id: res.draftId ?? prev.id }));
        }
        if (res?.status === "success") setStatusMessage("Draft autosaved");
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [
    draftState,
    form.allowSkip,
    form.content,
    form.coverEmoji,
    form.id,
    form.lockType,
    form.openWhen,
    form.pin,
    form.quizAnswer,
    form.quizPrompt,
    form.imageUrl,
    form.hint,
    form.sendAt,
    form.palette,
    form.template,
    form.title,
  ]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <form
        className="space-y-6 rounded-3xl bg-card/80 p-8 shadow-card ring-1 ring-border"
      >
        <input type="hidden" name="id" value={form.id ?? ""} readOnly />
        <input type="hidden" name="template" value={form.template} readOnly />
        {form.template !== "openwhen" ? (
          <input type="hidden" name="palette" value={form.palette} readOnly />
        ) : null}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Compose
            </p>
            <h1 className="text-2xl font-display text-foreground">New Letter</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              formAction={draftAction}
              className="inline-flex items-center justify-center rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/50"
            >
              Save Draft
            </button>
            <button
              type="submit"
              formAction={sendAction}
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Send Now
            </button>
            <button
              type="submit"
              formAction={scheduleAction}
              className="inline-flex items-center justify-center rounded-full border border-primary px-5 py-3 text-sm font-semibold text-primary shadow-sm transition hover:border-primary/70 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Schedule
            </button>
          </div>
        </div>

        {isSaving ? (
          <p className="text-sm text-muted-foreground">Autosaving…</p>
        ) : statusMessage ? (
          <p className="rounded-xl bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
            {statusMessage}
          </p>
        ) : null}
        {sendState.status === "error" && sendState.message ? (
          <p className="rounded-xl bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive">
            {sendState.message}
          </p>
        ) : null}
        {scheduleState.status === "error" && scheduleState.message ? (
          <p className="rounded-xl bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive">
            {scheduleState.message}
          </p>
        ) : null}

        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground">
            Title
          </label>
          <input
            name="title"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground shadow-inner outline-none ring-offset-background transition focus:ring-2 focus:ring-ring focus:ring-offset-2"
            placeholder="Open when you can't sleep"
          />
          {sendState.errors?.title ? (
            <p className="text-sm text-destructive">{sendState.errors.title}</p>
          ) : null}
        </div>

        <ImageUploader
          imageUrl={form.imageUrl}
          onChange={(url) => setField("imageUrl", url)}
        />

        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground">
            Open when
          </label>
          <input
            name="openWhen"
            value={form.openWhen}
            onChange={(e) => setField("openWhen", e.target.value)}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground shadow-inner outline-none ring-offset-background transition focus:ring-2 focus:ring-ring focus:ring-offset-2"
            placeholder="You need a smile"
          />
          {sendState.errors?.openWhen ? (
            <p className="text-sm text-destructive">{sendState.errors.openWhen}</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {form.template === "openwhen" ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">
                Palette
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                {palettes.map((p) => (
                  <label
                    key={p}
                    className={`flex cursor-pointer flex-col gap-2 rounded-2xl border border-border bg-background p-4 text-sm shadow-inner transition hover:border-primary/60 ${
                      form.palette === p ? "ring-2 ring-primary/60" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="palette"
                      value={p}
                      checked={form.palette === p}
                      onChange={() => setField("palette", p)}
                      className="sr-only"
                    />
                    <span className="text-sm font-semibold capitalize text-foreground">
                      {p}
                    </span>
                    <span
                      className="h-8 w-full rounded-full"
                      style={{
                        background:
                          p === "rose"
                            ? "linear-gradient(90deg, #f7f1e8, #f0d9cf)"
                            : p === "navy"
                              ? "linear-gradient(90deg, #0f1c3f, #1f3158)"
                              : "linear-gradient(90deg, #e8f0eb, #c8d8cd)",
                      }}
                    />
                  </label>
                ))}
              </div>
              {sendState.errors?.palette ? (
                <p className="text-sm text-destructive">{sendState.errors.palette}</p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Cover emoji (optional)
            </label>
            <input
              name="coverEmoji"
              value={form.coverEmoji}
              onChange={(e) => setField("coverEmoji", e.target.value)}
              maxLength={8}
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground shadow-inner outline-none ring-offset-background transition focus:ring-2 focus:ring-ring focus:ring-offset-2"
              placeholder="💌"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground">
            Content (Markdown)
          </label>
          <textarea
            name="content"
            value={form.content}
            rows={10}
            onChange={(e) => setField("content", e.target.value)}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground shadow-inner outline-none ring-offset-background transition focus:ring-2 focus:ring-ring focus:ring-offset-2"
            placeholder="Write from the heart..."
          />
          {sendState.errors?.content ? (
            <p className="text-sm text-destructive">{sendState.errors.content}</p>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-display text-foreground">Lock</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {lockTypes.map((type) => (
              <label
                key={type}
                className="flex cursor-pointer items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-inner transition hover:border-primary/50"
              >
                <input
                  type="radio"
                  name="lockType"
                  value={type}
                  checked={form.lockType === type}
                  onChange={() => setField("lockType", type)}
                  className="accent-primary"
                />
                <span className="capitalize">{type}</span>
              </label>
            ))}
          </div>

          {form.lockType === "pin" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  PIN
                </label>
                <input
                  name="pin"
                  value={form.pin}
                  onChange={(e) => setField("pin", e.target.value)}
                  minLength={4}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground shadow-inner outline-none ring-offset-background transition focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  placeholder="••••"
                />
                {sendState.errors?.pin ? (
                  <p className="text-sm text-destructive">{sendState.errors.pin}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Hint (optional)
                </label>
                <input
                  name="hint"
                  value={form.hint}
                  onChange={(e) => setField("hint", e.target.value)}
                  maxLength={160}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground shadow-inner outline-none ring-offset-background transition focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  placeholder="Where did we first meet?"
                />
              </div>
            </div>
          ) : null}

          {form.lockType === "quiz" ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Question
                </label>
                <input
                  name="quizPrompt"
                  value={form.quizPrompt}
                  onChange={(e) => setField("quizPrompt", e.target.value)}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground shadow-inner outline-none ring-offset-background transition focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  placeholder="What song played during our first dance?"
                />
                {sendState.errors?.quizPrompt ? (
                  <p className="text-sm text-destructive">{sendState.errors.quizPrompt}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Answer
                </label>
                <input
                  name="quizAnswer"
                  value={form.quizAnswer}
                  onChange={(e) => setField("quizAnswer", e.target.value)}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground shadow-inner outline-none ring-offset-background transition focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  placeholder="Our song..."
                />
                {sendState.errors?.quizAnswer ? (
                  <p className="text-sm text-destructive">{sendState.errors.quizAnswer}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Hint (optional)
                </label>
                <input
                  name="hint"
                  value={form.hint}
                  onChange={(e) => setField("hint", e.target.value)}
                  maxLength={160}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground shadow-inner outline-none ring-offset-background transition focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  placeholder="Think of the slow chorus..."
                />
              </div>
            </div>
          ) : null}

          {form.lockType !== "none" ? (
            <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                name="allowSkip"
                checked={form.allowSkip}
                onChange={(e) => setField("allowSkip", e.target.checked)}
                className="accent-primary"
              />
              Allow “Skip &amp; Open” after 2 failed attempts
            </label>
          ) : null}
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground">
            Schedule (optional)
          </label>
          <input
            type="datetime-local"
            name="sendAt"
            value={form.sendAt}
            onChange={(e) => setField("sendAt", e.target.value)}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground shadow-inner outline-none ring-offset-background transition focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
          {scheduleState.errors?.sendAt ? (
            <p className="text-sm text-destructive">{scheduleState.errors.sendAt}</p>
          ) : null}
        </div>
      </form>

      <aside className="space-y-4 rounded-3xl bg-card/70 p-6 shadow-card ring-1 ring-border">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Preview
          </p>
          <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {form.template === "openwhen"
              ? `Palette: ${form.palette}`
              : form.template}
          </span>
        </div>
        <div className="rounded-2xl bg-background/80 p-5 shadow-inner ring-1 ring-border/70">
          <p className="text-sm font-semibold text-muted-foreground">
            Open when {form.openWhen || "..."}
          </p>
          <h3 className="mt-1 font-display text-xl text-foreground">
            {form.title || "Untitled letter"}
          </h3>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
            {form.content || "Content preview will appear here as you type."}
          </div>
        </div>
      </aside>
    </div>
  );
}
