import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mission dashboard",
  description: "A sample ground-operator view of one hot-weather endurance sortie.",
};

const phases = [
  ["Start and takeoff", "0:00–0:11", "93", "Gauges inside limits. Throttle movement kept out of the slow checks."],
  ["Climb", "0:11–0:24", "91", "Head and exhaust rose with power. Residual stayed inside the band."],
  ["Endurance cruise", "0:24–2:06", "91 → 84", "Head residual walked from +2 °C to +7 °C. Oil, fuel, and the bus did not."],
  ["Descent and landing", "2:06–2:28", "84", "Power came off. Residual narrowed to +4 °C. No new flag."],
];

const gauges = [
  ["Engine speed", "5,480 rpm", "5,210 rpm", "1,650 rpm", "Followed the profile"],
  ["Cylinder-head temperature", "104 °C", "118 °C", "96 °C", "Live sat above the prediction and the gap grew in cruise"],
  ["Head residual", "+2 °C", "+7 °C", "+4 °C", "Slow climb, then it eased on descent"],
  ["Exhaust-gas temperature", "690 °C", "674 °C", "520 °C", "Moved with the head. No hole, no hot spike"],
  ["Oil pressure", "4.6 bar", "4.1 bar", "3.4 bar", "On the map for each speed"],
  ["Oil temperature", "82 °C", "97 °C", "94 °C", "Settled and stayed"],
  ["Fuel flow, reported", "27 L/h", "18.6 L/h", "6 L/h", "Stayed inside the 10% band"],
  ["Bus voltage", "13.6 V", "13.9 V", "13.8 V", "In regulation after start"],
  ["Roughness", "0.014", "0.011", "0.010", "Quiet at every firing check"],
];

const subsystems = [
  ["Cooling", 71, "Slipped through the cruise. This is the only subsystem that spent health.", true],
  ["Oil", 93, "Flat after warm-up.", false],
  ["Fuel delivery", 90, "Pump a few percent down from the first hour. Reported flow still agreed.", false],
  ["Combustion", 96, "Roughness low for the whole flight. Exhaust never separated from the head.", false],
  ["Electrics", 95, "Bus recovered after start and held.", false],
  ["Sensors", 92, "No gauge walked off by itself.", false],
];

const trace = [
  { label: "Takeoff", live: 104, pred: 102 },
  { label: "Climb", live: 110, pred: 108 },
  { label: "Cruise", live: 112, pred: 110 },
  { label: "Mid", live: 116, pred: 111 },
  { label: "Late", live: 118, pred: 111 },
  { label: "Descent", live: 108, pred: 104 },
  { label: "Landing", live: 96, pred: 92 },
];

function HeadTrace() {
  const width = 680;
  const height = 280;
  const pad = { l: 44, r: 36, t: 18, b: 36 };
  const yMin = 88;
  const yMax = 126;
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const xOf = (index: number) => pad.l + (index / (trace.length - 1)) * innerW;
  const yOf = (value: number) => pad.t + (1 - (value - yMin) / (yMax - yMin)) * innerH;
  const path = (key: "live" | "pred") =>
    trace.map((point, index) => `${index === 0 ? "M" : "L"} ${xOf(index)} ${yOf(point[key])}`).join(" ");
  const ticks = [90, 100, 110, 120];

  return (
    <svg className="dash-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Cylinder-head temperature across the mission. The live trace sits above the prediction through the cruise.">
      <rect x={xOf(2)} y={pad.t} width={xOf(4) - xOf(2)} height={innerH} fill="#e7f1fa" />
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={pad.l} x2={width - pad.r} y1={yOf(tick)} y2={yOf(tick)} stroke="#e4e7ec" />
          <text x={pad.l - 8} y={yOf(tick) + 4} textAnchor="end" fill="#667085" fontSize="12">
            {tick}
          </text>
        </g>
      ))}
      <path d={path("pred")} fill="none" stroke="#8aa4be" strokeWidth="2.5" strokeDasharray="6 5" />
      <path d={path("live")} fill="none" stroke="#0f2c4c" strokeWidth="2.75" />
      {trace.map((point, index) => (
        <g key={point.label}>
          <circle cx={xOf(index)} cy={yOf(point.live)} r="3.5" fill="#0f2c4c" />
          <text
            x={xOf(index)}
            y={height - 12}
            textAnchor={index === 0 ? "start" : index === trace.length - 1 ? "end" : "middle"}
            fill="#667085"
            fontSize="12"
          >
            {point.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function DashboardPage() {
  return (
    <main className="dash">
      <header className="flow-banner">
        <p className="flow-kicker">Ground operator · sample sortie</p>
        <h1>Tail 12 · hot-weather endurance</h1>
        <p className="flow-lede">
          Site North. Block 2 h 28 min. The offset for this profile was frozen at preflight, and the aircraft flew
          the model it took off with until landing. Radio stayed up. These figures are illustrative. This page does
          not run the model.
        </p>
        <nav className="flow-nav" aria-label="Pages">
          <Link href="/">Home</Link>
          <Link href="/visuals/physics">Physics model</Link>
          <Link href="/visuals/architecture">Systems architecture</Link>
          <Link href="/visuals/deployment">Fleet deployment</Link>
          <Link href="/dashboard" aria-current="page">
            Mission dashboard
          </Link>
        </nav>
      </header>

      <section className="dash-card dash-health">
        <div>
          <p className="dash-kicker">Overall health across the mission</p>
          <p className="health-score">
            84 <span>Good</span>
          </p>
          <p className="dash-call">Fly it as planned, then inspect cooling on the ground.</p>
        </div>
        <p className="dash-note">
          It left the chocks at 93 and gave the points back slowly in the cruise, all of it on the head. Nothing in
          the trace asked for an early return.
        </p>
      </section>

      <section className="dash-card dash-recs">
        <h2>Recommendations</h2>
        <ol>
          <li>
            <strong>The mission was flyable from start to landing.</strong> Raw oil pressure, oil temperature,
            exhaust temperature, and boost stayed inside the OEM limits the entire time.
          </li>
          <li>
            <strong>Write the sortie up as a slow cooling trend.</strong> The head residual grew only in the settled
            cruise, after the hot day and the mission offset were already in the prediction.
          </li>
          <li>
            <strong>Before the next hot-weather flight, check the radiator, coolant flow, and baffles.</strong>{" "}
            Cooling ended a little weak. The pump was only slightly down, so fuel delivery can wait.
          </li>
          <li>
            <strong>Keep this aircraft on the model it flew today.</strong> A revised offset, if the healthy-hour fit
            supports one, loads at a later preflight.
          </li>
          <li>
            <strong>Replay is optional.</strong> Oil-film and knock checks can run on the landed log. Nothing in the
            mission trace is asking for them.
          </li>
        </ol>
      </section>

      <section className="dash-card">
        <h2>Engine across the mission</h2>
        <p className="dash-note">
          Ambient 37–39 °C. Cruise at 2,400 m, throttle about 64%, engine speed held near 5,200 rpm. The shaded band
          is the endurance cruise. Climb and the power change at 1:12 are left out of the slow sum.
        </p>
        <HeadTrace />
        <div className="dash-legend">
          <span>
            <i className="swatch live" /> Live head temperature
          </span>
          <span>
            <i className="swatch pred" /> Predicted, with the hot day and the frozen offset
          </span>
        </div>
        <div className="dash-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Gauge</th>
                <th>Takeoff</th>
                <th>Mid-cruise</th>
                <th>Landing</th>
                <th>How it behaved</th>
              </tr>
            </thead>
            <tbody>
              {gauges.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell) => (
                    <td key={cell}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="dash-split">
        <section className="dash-card">
          <h2>Health by phase</h2>
          <div className="dash-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Phase</th>
                  <th>Time</th>
                  <th>Health</th>
                  <th>What changed</th>
                </tr>
              </thead>
              <tbody>
                {phases.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell) => (
                      <td key={cell}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="dash-card">
          <h2>Subsystem health at landing</h2>
          <ul className="subsystems">
            {subsystems.map(([name, score, detail, warn]) => (
              <li key={name as string}>
                <div className="sub-top">
                  <strong>{name}</strong>
                  <span>{score}</span>
                </div>
                <div className={warn ? "bar warn" : "bar"}>
                  <span style={{ width: `${score}%` }} />
                </div>
                <p>{detail}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="dash-card">
        <h2>Remaining life</h2>
        <p className="dash-call">Mid band, from the cruise trend only.</p>
        <p className="dash-note">
          If the next sorties repeat this hot-weather endurance, hours left toward an illustrative head limit of 135
          °C. Oil did not enter the estimate. Neither did takeoff, the power change, or the descent.
        </p>
        <div className="rul">
          <div>
            <span>Low</span>
            <strong>35 h</strong>
          </div>
          <div>
            <span>Mid</span>
            <strong>60 h</strong>
          </div>
          <div>
            <span>High</span>
            <strong>95 h</strong>
          </div>
        </div>
      </section>
    </main>
  );
}
