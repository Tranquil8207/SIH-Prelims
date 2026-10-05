import { readMaterialThumbnail } from "@/lib/materials";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const set = url.searchParams.get("set") ?? "";
  const image = await readMaterialThumbnail(set);
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(image.body), {
    headers: {
      "Content-Type": image.type,
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
