import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Visuals",
};

export default function VisualsIndex() {
  return (
    <main className="flow">
      <header className="flow-banner">
        <p className="flow-kicker">SIH Prelims</p>
        <h1>Visuals</h1>
        <p className="flow-lede">Each figure has its own address for a slide to open.</p>
      </header>
      <div className="toc">
        <Link href="/visuals/physics" className="toc-card">
          <span>/visuals/physics</span>
          <strong>Physics model</strong>
          <p>One four-stroke cycle, with every symbol defined where it is used.</p>
        </Link>
        <Link href="/visuals/architecture" className="toc-card">
          <span>/visuals/architecture</span>
          <strong>Systems architecture</strong>
          <p>Solver order for one cycle, then the residual, the wear update, and the anomaly checks.</p>
        </Link>
        <Link href="/visuals/deployment" className="toc-card">
          <span>/visuals/deployment</span>
          <strong>Fleet deployment</strong>
          <p>Aircraft, ground node, and hub, including a lost radio or a lost fibre link.</p>
        </Link>
        <Link href="/dashboard" className="toc-card">
          <span>/dashboard</span>
          <strong>Mission dashboard</strong>
          <p>Sample ground view of one sortie, from takeoff to landing.</p>
        </Link>
        <Link href="/references" className="toc-card">
          <span>/references</span>
          <strong>References</strong>
          <p>Sources for the figures and the dashboard.</p>
        </Link>
      </div>
    </main>
  );
}
