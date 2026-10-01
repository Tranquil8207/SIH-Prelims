import Link from "next/link";

export default function Home() {
  return (
    <main className="flow">
      <header className="flow-banner">
        <p className="flow-kicker">SIH Prelims</p>
        <h1>Engine digital twin</h1>
        <p className="flow-lede">
          Three figures for the deck, and a sample mission view for the ground operator. The figures do not run the engine model.
        </p>
      </header>
      <div className="toc">
        <Link href="/visuals/physics" className="toc-card">
          <span>01</span>
          <strong>Physics model</strong>
          <p>Left-to-right plant flow, from flight phase and wear through the cylinder, cooling path, and predicted gauges.</p>
        </Link>
        <Link href="/visuals/architecture" className="toc-card">
          <span>02</span>
          <strong>Systems architecture</strong>
          <p>Left-to-right flow from the live measurement through the filter, the anomaly checks, and the model update.</p>
        </Link>
        <Link href="/visuals/deployment" className="toc-card">
          <span>03</span>
          <strong>Fleet deployment</strong>
          <p>One hub, many ground nodes, and the aircraft on each node. The aircraft flies the model it took off with. The next model is loaded at a later preflight.</p>
        </Link>
        <Link href="/dashboard" className="toc-card">
          <span>Sample</span>
          <strong>Mission dashboard</strong>
          <p>One hot-weather endurance sortie, read from takeoff to landing, with the ground operator&apos;s call.</p>
        </Link>
        <Link href="/references" className="toc-card">
          <span>Sources</span>
          <strong>References</strong>
          <p>Sources for the figures and the dashboard.</p>
        </Link>
      </div>
    </main>
  );
}
