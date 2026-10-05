import fs from "fs";
import path from "path";
import { getPdfThumbnail } from "@/lib/pdf-thumbnail";

export type MaterialSet = {
  slug: string;
  title: string;
  directory: string;
};

// Display titles are chosen here. Folder names are not shown on the page.
const sets: MaterialSet[] = [
  {
    slug: "overheating-and-cooling-degradation",
    title: "Overheating and cooling degradation",
    directory: "Ruhi's materials",
  },
  {
    slug: "misfire-and-engine-health-diagnostics",
    title: "Misfire and engine health diagnostics",
    directory: "Tejas's materials",
  },
  {
    slug: "digital-twin-solver-flow",
    title: "Digital twin solver flow, high level and step by step",
    directory: "Solver diagrams",
  },
];

const filePattern = /\.(jpe?g|png|webp|gif|pdf)$/i;

const root = path.join(process.cwd(), "Ref materials");

function slideKey(name: string) {
  const match = name.match(/(\d{1,2})\.(\d{2})\.(\d{2})\s*(AM|PM)(?:\s*\((\d+)\))?/i);
  if (!match) return { time: Number.MAX_SAFE_INTEGER, copy: 0, name };
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3]);
  const meridiem = match[4].toUpperCase();
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return {
    time: hour * 3600 + minute * 60 + second,
    copy: match[5] ? Number(match[5]) : 0,
    name,
  };
}

export type MaterialFile = {
  src: string;
  alt: string;
  kind: "image" | "pdf";
};

export type MaterialSetView = {
  slug: string;
  title: string;
  files: MaterialFile[];
  thumb: MaterialFile | null;
};

export async function listMaterialSets(): Promise<MaterialSetView[]> {
  return Promise.all(
    sets.map(async (set) => {
      const directory = path.join(root, set.directory);
      let names: string[] = [];
      if (fs.existsSync(directory)) {
        names = fs
          .readdirSync(directory)
          .filter((name) => filePattern.test(name))
          .sort((a, b) => {
            const left = slideKey(a);
            const right = slideKey(b);
            return left.time - right.time || left.copy - right.copy || left.name.localeCompare(right.name);
          });
      }
      const imageCount = names.filter((name) => !name.toLowerCase().endsWith(".pdf")).length;
      let imageIndex = 0;
      const files: MaterialFile[] = names.map((name) => {
        const pdf = name.toLowerCase().endsWith(".pdf");
        if (!pdf) imageIndex += 1;
        return {
          src: `/materials/file?set=${encodeURIComponent(set.slug)}&name=${encodeURIComponent(name)}`,
          alt: pdf ? set.title : `${set.title}, image ${imageIndex} of ${imageCount}`,
          kind: pdf ? "pdf" : "image",
        };
      });

      let thumb: MaterialFile | null = null;
      if (imageCount === 0) {
        const firstPdf = names.find((name) => name.toLowerCase().endsWith(".pdf"));
        if (firstPdf) {
          const pdfPath = path.join(directory, firstPdf);
          const rendered = await getPdfThumbnail(pdfPath, set.slug).catch(() => null);
          if (rendered) {
            thumb = {
              src: `/materials/thumb?set=${encodeURIComponent(set.slug)}`,
              alt: set.title,
              kind: "image",
            };
          }
        }
      }

      return { slug: set.slug, title: set.title, files, thumb };
    }),
  );
}

export function readMaterialImage(slug: string, name: string) {
  const set = sets.find((item) => item.slug === slug);
  if (!set || !name || !filePattern.test(name)) return null;
  if (name.includes("..") || name.includes("/") || name.includes("\\")) return null;
  const directory = path.resolve(root, set.directory);
  const file = path.resolve(directory, name);
  if (!file.startsWith(directory + path.sep)) return null;
  if (!fs.existsSync(file)) return null;
  const extension = path.extname(file).toLowerCase();
  const type =
    extension === ".png"
      ? "image/png"
      : extension === ".webp"
        ? "image/webp"
        : extension === ".gif"
          ? "image/gif"
          : extension === ".pdf"
            ? "application/pdf"
            : "image/jpeg";
  return { body: fs.readFileSync(file), type };
}

export async function readMaterialThumbnail(slug: string) {
  const set = sets.find((item) => item.slug === slug);
  if (!set) return null;
  const directory = path.join(root, set.directory);
  if (!fs.existsSync(directory)) return null;
  const firstPdf = fs
    .readdirSync(directory)
    .find((name) => filePattern.test(name) && name.toLowerCase().endsWith(".pdf"));
  if (!firstPdf) return null;
  const body = await getPdfThumbnail(path.join(directory, firstPdf), set.slug).catch(() => null);
  if (!body) return null;
  return { body, type: "image/png" };
}
