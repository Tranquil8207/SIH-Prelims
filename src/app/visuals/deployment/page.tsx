import type { Metadata } from "next";
import Link from "next/link";
import { FleetMap, type FleetDetail, type FleetLink, type FleetNode } from "@/components/fleet-map";

export const metadata: Metadata = {
  title: "Fleet deployment",
  description: "How the twin is deployed across aircraft, ground nodes, and one hub.",
};

const aircraftDetails: FleetDetail[] = [
  {
    title: "Ingest",
    text: "The eight live channels and the operating-condition vector are read from the engine bus. Each sample carries the shared clock, the site identity, and the asset identity.",
  },
  {
    title: "Edge engineering model",
    text: "The cycle-average plant is the one in the signed model loaded before flight. The mission offset is added only to the lagged prediction. The residual is the live measurement minus that prediction. Crank-angle integration is not the airborne rate. No language model is carried on the aircraft.",
    eq: String.raw`r = x_s - \big(F(w,\theta) + b(\mathrm{profile})\big)`,
  },
  {
    title: "OEM envelope",
    text: "Oil, exhaust temperature, boost, and time at takeoff speed are compared with the OEM limits on the raw measurement. A breach is land-now. Hub reachability is not required.",
  },
  {
    title: "Fast path",
    text: "Roughness, the exhaust residual, and the hold-on timer run at firing rate. This path does not wait for the wear estimate or for a radio acknowledgement.",
  },
  {
    title: "Advisory",
    text: "The edge model emits a compact advisory from its own checks. A language model cannot issue that advisory, a land-now call, or a replacement model.",
  },
];

const handover: FleetDetail[] = [
  {
    title: "Model handover",
    text: "The node sends the current signed model, the mission key, and the offset. The aircraft refuses to arm if the model is unsigned or the format does not match. The model is not replaced after arming.",
  },
];

const radio: FleetDetail[] = [
  {
    title: "Status report",
    text: "Health indices, residual peaks, detector flags, and a heartbeat, with the aircraft identity and the mission key. Sent at a low rate for the whole sortie. Recorded time series are not carried on this radio.",
  },
  {
    title: "Alert snapshot",
    text: "A short raw window around a trip: the live channels, the operating condition, and timestamps. Emitted when a detection head or the OEM limit trips.",
  },
  {
    title: "Radio lost",
    text: "That aircraft continues with the model it took off with and the OEM-limit check. Other aircraft on the same node keep reporting. The aircraft never addresses the hub, or another node's language model, directly.",
  },
];

const nodes: FleetNode[] = [
  {
    id: "ac1",
    title: "Aircraft 1",
    summary: "Flies the model it took off with.",
    x: 500,
    y: 760,
    panel: "down",
    details: aircraftDetails,
  },
  {
    id: "ac2",
    title: "Aircraft 2",
    summary: "Flies the model it took off with.",
    x: 980,
    y: 760,
    panel: "down",
    details: aircraftDetails,
  },
  {
    id: "ac3",
    title: "Aircraft 3",
    summary: "Flies the model it took off with.",
    x: 1460,
    y: 760,
    panel: "down",
    details: aircraftDetails,
  },
  {
    id: "ground",
    title: "Ground node",
    summary: "One site. Explains the sortie and holds the queue.",
    x: 980,
    y: 380,
    panel: "left-up",
    details: [
      {
        title: "Mission profile",
        text: "The operator or scheduler selects the mission key: high altitude, hot weather, endurance, rapid throttle, a combination, or unknown. The key is stored with the sortie.",
      },
      {
        title: "Mission offset",
        text: "The node looks up the offset for that profile in the signed model already held at the site. An unknown profile sets the offset to zero. The value is frozen for the sortie. It is not revised in flight, including during endurance.",
        eq: String.raw`b = b(\mathrm{profile})`,
      },
      {
        title: "Landed log",
        text: "After landing, the tamper-evident log is copied to the node. The node does not invent samples the aircraft did not record. One node is one site and may hold several aircraft.",
      },
      {
        title: "Node engineering model",
        text: "The log is replayed through the two-timescale plant, including the crank-angle cylinder step, and through the three diagnostic models. The replay does not replace the wear estimate computed in flight.",
      },
      {
        title: "Node interface model",
        text: "A language model answers maintainers at that site through tools bound to that node's logs, signed model, and aircraft. If a quantity is not in a tool, the model reports that it does not have it. It does not estimate temperatures, wear, or remaining life from prose.",
      },
      {
        title: "Upload queue",
        text: "The status report is never queued behind recorded data. An alert snapshot may pause a bulk upload. The queue is retained if the link to the hub is down, and the node keeps the model it already holds.",
      },
    ],
  },
  {
    id: "hub",
    title: "Hub",
    summary: "Signs the next model between flights.",
    x: 980,
    y: 36,
    panel: "right-down",
    tone: "hub",
    details: [
      {
        title: "Collation",
        text: "Status reports, allowed recordings, and maintenance labels are aligned across sites by identity. An object that lacks the site, the aircraft, the model version, the mission, the time, or the message kind cannot be combined with the others.",
      },
      {
        title: "Central fit",
        text: "Known-good hours and confirmed findings refit the offset table, residual bands, cumulative-sum slack, the open-set model, and thermal calibration after the gains are rescaled. Simulator logs are excluded. Rare faults still come from the injection library.",
      },
      {
        title: "Federated aggregate",
        text: "Updates from the nodes are combined and treated as untrusted input. Live filter state, language-model weights, and crank-resolved coefficients are not aggregated. The result is still one signed model.",
      },
      {
        title: "Fleet interface model",
        text: "Answers a fleet officer from aggregated status reports and labels. It is not a substitute for a site model when that site's fibre is down, and it cannot issue a new model or land-now.",
      },
      {
        title: "Signed model",
        text: "The hub signs the next model, with a record of what changed. The same model structure is used on the aircraft, the node, and the hub. It is not written into an aircraft that is already airborne. The hub does not issue land-now.",
      },
    ],
  },
];

const links: FleetLink[] = [
  { id: "a1-model", from: "ground", to: "ac1", label: "Signed model", bow: 72, details: handover },
  { id: "a1-radio", from: "ac1", to: "ground", label: "Status report", bow: -72, details: radio },
  { id: "a2-model", from: "ground", to: "ac2", label: "Signed model", bow: 64, details: handover },
  { id: "a2-radio", from: "ac2", to: "ground", label: "Status report", bow: -64, details: radio },
  { id: "a3-model", from: "ground", to: "ac3", label: "Signed model", bow: 72, details: handover },
  { id: "a3-radio", from: "ac3", to: "ground", label: "Status report", bow: -72, details: radio },
  {
    id: "uplink",
    from: "ground",
    to: "hub",
    label: "After landing",
    bow: -48,
    labelAt: 0.28,
    details: [
      {
        title: "Central uplink",
        text: "Default when policy allows recorded data to leave the site after landing. Order is the status report with maintenance labels, then alert snapshots, then the priority channels, then the remaining channels, then the night archive. A new alert can interrupt a bulk transfer, and that transfer resumes afterwards. Every object carries the site, the aircraft, the model version, the mission, the time, and the kind of message.",
      },
      {
        title: "Federated delta",
        text: "Used only when recorded data must not leave the node. The node sends a model update computed on local logs, and the status report if policy allows. Bulk time series stay on the node. One training objective is chosen per round.",
      },
      {
        title: "Fibre lost",
        text: "The node keeps the model it already holds, its interface model, and the queue. Aircraft on that node are unchanged. Other nodes that still reach the hub continue. No revised model arrives for this site until the link returns.",
      },
    ],
  },
  {
    id: "return",
    from: "hub",
    to: "ground",
    label: "Next preflight",
    bow: -120,
    labelAt: 0.28,
    details: [
      {
        title: "What may be revised",
        text: "The offset table, residual bands, open-set model, rescaled thermal and electrical calibration, and detector thresholds may move. The crank-angle structure, the Woschni heat-transfer form, the fuel-rail structure, and the OEM limits do not move without a laboratory review.",
      },
      {
        title: "Load at the next preflight",
        text: "Nodes receive the signed model. Each aircraft keeps the model it took off with until a later preflight loads the new one. An offset received during the sortie is not applied. If the hub itself is dark, every node remains an island on the model it already holds, and land-now still belongs to the aircraft.",
      },
    ],
  },
];

export default function DeploymentPage() {
  return (
    <main className="sheet">
      <div className="sheet-head">
        <header className="flow-banner">
          <p className="flow-kicker">Figure 03</p>
          <h1>Fleet deployment</h1>
          <p className="flow-lede">
            One hub, one ground node, and the aircraft on that node. Hover a node or a line for its detail. The
            aircraft flies the model loaded before takeoff. The node explains the sortie. The hub signs the next
            model between flights. A cut link does not stop the computer below it.
          </p>
          <nav className="flow-nav" aria-label="Figures">
            <Link href="/visuals/physics">Physics model</Link>
            <Link href="/visuals/architecture">Systems architecture</Link>
            <Link href="/visuals/deployment" aria-current="page">
              Fleet deployment
            </Link>
          </nav>
        </header>
      </div>
      <FleetMap nodes={nodes} links={links} />
    </main>
  );
}
