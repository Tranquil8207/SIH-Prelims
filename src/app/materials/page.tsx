import type { Metadata } from "next";
import { MaterialShow } from "@/components/material-show";
import { PageNav } from "@/components/page-nav";
import { listMaterialSets } from "@/lib/materials";

export const metadata: Metadata = {
  title: "Images from the video",
  description: "Pictures and documents used to make the video. Image sets open as a slideshow.",
};

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const sets = await listMaterialSets();
  return (
    <main className="dash-page">
      <div className="sheet-head">
        <header className="flow-banner">
          <div className="flow-banner-text">
            <p className="flow-kicker">Video stills</p>
            <h1>Images from the video</h1>
            <p className="flow-lede">
              Pictures and documents used to make the video. Open an image set to move through the pictures in order.
            </p>
          </div>
          <PageNav current="/materials" />
        </header>
      </div>
      <div className="dash">
        <MaterialShow sets={sets} />
      </div>
    </main>
  );
}
