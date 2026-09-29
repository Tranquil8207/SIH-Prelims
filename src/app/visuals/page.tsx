import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Visuals",
};

export default function VisualsIndex() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-3 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Visuals</h1>
      <p className="text-neutral-600">
        Add a figure as <code className="text-neutral-800">src/app/visuals/&lt;name&gt;/page.tsx</code>.
        The slide links to <code className="text-neutral-800">/visuals/&lt;name&gt;</code>.
      </p>
    </main>
  );
}
