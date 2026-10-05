import { readMaterialImage } from "@/lib/materials";

export const runtime = "nodejs";

export function GET(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get("name") ?? "";
  const image = readMaterialImage(url.searchParams.get("set") ?? "", name);
  if (!image) return new Response("Not found", { status: 404 });
  const filename = name.replace(/["\r\n]/g, "");
  return new Response(new Uint8Array(image.body), {
    headers: {
      "Content-Type": image.type,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
