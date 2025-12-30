"use client";

import { useState } from "react";

type Props = {
  imageUrl: string;
  onChange: (url: string) => void;
};

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function ImageUploader({ imageUrl, onChange }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      setStatus("Only JPG, PNG, or WEBP files are allowed.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setStatus("File is too large (max 5MB).");
      return;
    }

    setStatus(null);
    setUploading(true);

    try {
      const sigRes = await fetch("/api/upload-image");
      if (!sigRes.ok) throw new Error("Could not get upload signature.");
      const { signature, timestamp, cloudName, apiKey, folder } =
        (await sigRes.json()) as {
          signature: string;
          timestamp: number;
          cloudName: string;
          apiKey: string;
          folder: string;
        };

      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", apiKey);
      fd.append("timestamp", String(timestamp));
      fd.append("signature", signature);
      if (folder) fd.append("folder", folder);

      const upload = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        { method: "POST", body: fd },
      );
      if (!upload.ok) throw new Error("Upload failed.");
      const json = (await upload.json()) as { secure_url: string };
      onChange(json.secure_url);
      setStatus("Uploaded");
    } catch (err) {
      console.error(err);
      setStatus("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-foreground">
        Image (JPG/PNG/WEBP, max 5MB)
      </label>
      {imageUrl ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Preview"
            className="h-20 w-20 rounded-lg object-cover ring-1 ring-border"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:border-destructive hover:text-destructive"
          >
            Remove
          </button>
        </div>
      ) : (
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
          className="w-full cursor-pointer rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-inner outline-none ring-offset-background transition focus:ring-2 focus:ring-ring focus:ring-offset-2"
        />
      )}
      {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
      {uploading ? <p className="text-xs text-muted-foreground">Uploading…</p> : null}
    </div>
  );
}
