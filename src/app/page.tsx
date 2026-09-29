import { Equation } from "@/components/equation";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-neutral-500">SIH Prelims</p>
        <h1 className="text-3xl font-semibold tracking-tight">Visual elements</h1>
        <p className="max-w-xl text-neutral-600">
          Flowcharts and figures for the deck. Each visual is a route under{" "}
          <code className="text-neutral-800">/visuals/&lt;name&gt;</code> so a slide can link straight to it.
        </p>
      </header>
      <section className="flex flex-col gap-4 rounded-xl border border-neutral-200 p-6">
        <h2 className="text-lg font-medium">Math check</h2>
        <p>
          Inline: <Equation tex="E = mc^2" /> and a shared symbol <Equation tex="x \in \R" />.
        </p>
        <Equation display tex="\nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0}" />
      </section>
    </main>
  );
}
