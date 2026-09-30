import Link from "next/link";

export default function Home() {
  return (
    <main className="flow">
      <header className="flow-banner">
        <p className="flow-kicker">SIH Prelims</p>
        <h1>Engine digital twin</h1>
        <p className="flow-lede">
          Two figures for the deck. They show the calculation chain. They do not run the engine model.
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
          <p>Left-to-right flow from the live measurement through the filter, the anomaly checks, and the pack update.</p>
        </Link>
      </div>
    </main>
  );
}
