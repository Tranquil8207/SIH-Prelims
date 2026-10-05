import fs from "fs";
import path from "path";
import { createCanvas } from "@napi-rs/canvas";

const cacheDir = path.join(process.cwd(), ".cache", "material-thumbs");
const targetWidth = 480;

async function renderFirstPage(pdfPath: string): Promise<Buffer> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = fs.readFileSync(pdfPath);
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data) });
  const doc = await loadingTask.promise;
  const page = await doc.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = targetWidth / baseViewport.width;
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  await page.render({
    // @napi-rs/canvas is structurally compatible with the DOM canvas pdf.js expects,
    // but not nominally typed as one.
    canvas: canvas as unknown as HTMLCanvasElement,
    canvasContext: canvas.getContext("2d") as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;
  await loadingTask.destroy();
  return canvas.toBuffer("image/png");
}

// Renders and caches the first page of a PDF as a PNG, keyed by the PDF's own
// mtime so an edited source file invalidates the cached thumbnail.
export async function getPdfThumbnail(pdfPath: string, cacheKey: string): Promise<Buffer | null> {
  if (!fs.existsSync(pdfPath)) return null;
  const sourceMtime = fs.statSync(pdfPath).mtimeMs;
  const cachePath = path.join(cacheDir, `${cacheKey}.png`);
  const metaPath = path.join(cacheDir, `${cacheKey}.meta.json`);

  if (fs.existsSync(cachePath) && fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      if (meta.sourceMtime === sourceMtime) return fs.readFileSync(cachePath);
    } catch {
      // Fall through and regenerate on a corrupt or unreadable cache entry.
    }
  }

  const buffer = await renderFirstPage(pdfPath);
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(cachePath, buffer);
  fs.writeFileSync(metaPath, JSON.stringify({ sourceMtime }));
  return buffer;
}
