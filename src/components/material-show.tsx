"use client";

import { useEffect, useState } from "react";
import type { MaterialFile, MaterialSetView } from "@/lib/materials";

function countLabel(files: MaterialFile[]) {
  const images = files.filter((file) => file.kind === "image").length;
  const documents = files.length - images;
  const parts: string[] = [];
  if (images === 1) parts.push("1 image");
  if (images > 1) parts.push(`${images} images`);
  if (documents === 1) parts.push("1 document");
  if (documents > 1) parts.push(`${documents} documents`);
  return parts.join(", ") || "No files yet";
}

export function MaterialShow({ sets }: { sets: MaterialSetView[] }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const open = sets.find((set) => set.slug === openSlug) ?? null;
  const count = open?.files.length ?? 0;
  const file = open && count > 0 ? open.files[Math.min(index, count - 1)] : null;

  useEffect(() => {
    if (!openSlug || count < 1) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((current) => Math.min(current + 1, count - 1));
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((current) => Math.max(current - 1, 0));
      }
      if (event.key === "Escape") setOpenSlug(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSlug, count]);

  if (open && file) {
    const atStart = index <= 0;
    const atEnd = index >= count - 1;
    return (
      <section className="mat-stage" aria-label={open.title}>
        <div className="mat-controls">
          <div className="mat-actions">
            <button type="button" onClick={() => setOpenSlug(null)}>
              All materials
            </button>
            {count > 1 ? (
              <button type="button" onClick={() => setIndex((current) => current - 1)} disabled={atStart}>
                Previous
              </button>
            ) : null}
          </div>
          <p>
            {open.title}
            {count > 1 ? (
              <span>
                {Math.min(index, count - 1) + 1} of {count}
              </span>
            ) : null}
          </p>
          <div className="mat-actions">
            {count > 1 ? (
              <button type="button" onClick={() => setIndex((current) => current + 1)} disabled={atEnd}>
                Next
              </button>
            ) : null}
            <span className="mat-keys">{count > 1 ? "Arrow keys move through the images" : ""}</span>
          </div>
        </div>
        <div className="mat-frame">
          {file.kind === "pdf" ? (
            <iframe src={file.src} title={file.alt} />
          ) : (
            // The slideshow source is a same-origin file route, not a known remote host.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={file.src} alt={file.alt} />
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="mat-list">
      {sets.map((set) => {
        const thumb = set.thumb ?? set.files.find((item) => item.kind === "image");
        const documentOnly = !thumb && set.files.some((item) => item.kind === "pdf");
        return (
          <button
            key={set.slug}
            type="button"
            className="mat-card"
            onClick={() => {
              setIndex(0);
              setOpenSlug(set.slug);
            }}
          >
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb.src} alt="" />
            ) : (
              <span className="mat-empty">{documentOnly ? "Document" : "No files yet"}</span>
            )}
            <span>
              <strong>{set.title}</strong>
              <em>{countLabel(set.files)}</em>
            </span>
          </button>
        );
      })}
    </div>
  );
}
