import type { Metadata } from "next";
import { Figure, type FlowColumn, type FlowEdge } from "@/components/flowchart";

export const metadata: Metadata = {
  title: "Systems architecture",
  description: "Left-to-right flow from the predicted measurement through residuals, anomaly checks, and the pack update.",
};

const columns: FlowColumn[] = [
  {
    id: "sources",
    title: "Sources",
    nodes: [
      {
        id: "pred",
        title: "Predicted measurement",
        text: "Output of the physics model after sensor lag and the mission offset. This is the gauge vector expected from a healthy engine on the current mission.",
        eq: String.raw`\hat{x}_{used} = \mathrm{lag}(F(w,\theta)) + b(\mathrm{profile})`,
      },
      {
        id: "live",
        title: "Live measurement",
        text: "Engine speed, cylinder-head temperature, exhaust-gas temperature, oil pressure, oil temperature, fuel flow, vibration, bus voltage, and injection timing, as reported by the engine controller.",
      },
    ],
  },
  {
    id: "ingest",
    title: "Ingest",
    nodes: [
      {
        id: "can",
        title: "Bus decode",
        text: "Controller-area-network frames are decoded with the interface database, time-stamped, and appended to a hash-chained log. Samples that fail a plausibility check are flagged and retained.",
      },
      {
        id: "regime",
        title: "Regime tag",
        text: "Each sample is labelled with the flight phase. The label selects the residual band. Samples inside a rapid-throttle window are excluded from the slow cumulative sum.",
      },
    ],
  },
  {
    id: "ukf",
    title: "Unscented Kalman filter",
    nodes: [
      {
        id: "sig",
        title: "Sigma points",
        text: "Wear is propagated as a random walk. The unscented transform places 2n+1 sigma points about the current wear estimate. The present airborne state has three wear terms.",
        eq: String.raw`\theta_k = \theta_{k-1} + \xi_k, \quad \xi_k \sim \mathcal{N}(0, Q)`,
      },
      {
        id: "mean",
        title: "Measurement mean",
        text: "Each sigma point is evaluated in the plant. The predicted measurement is the weighted mean. On the aircraft the plant is the cycle-average reduction. The crank-angle integration is reserved for ground replay.",
        eq: String.raw`\hat{z} = \sum_i W_i\, F(w, \chi_i)`,
      },
      {
        id: "inn",
        title: "Innovation",
        text: "The residual is the live measurement minus the sigma-point mean. Detection uses this innovation. An incorrect mission label is corrected in the operating condition or the offset, not by inflating process noise.",
        eq: String.raw`r = z - \hat{z}`,
      },
      {
        id: "upd",
        title: "Wear update",
        text: "The Kalman gain moves the wear estimate. The updated wear is the plant input at the next step. The misfire check does not wait for this update.",
        eq: String.raw`\hat{\theta} = \hat{\theta}^{-} + K r`,
      },
    ],
  },
  {
    id: "checks",
    title: "Anomaly checks",
    nodes: [
      {
        id: "oem",
        title: "OEM envelope",
        text: "Oil pressure, oil temperature, exhaust-gas temperature, boost, and time at takeoff speed are compared with the OEM limits on the raw measurement. A breach is a land-now call. The plant and the mission offset are not consulted.",
      },
      {
        id: "thc",
        title: "Thermal residual",
        text: "Cylinder-head and coolant temperatures are compared with the cooling network after the mission offset. A cumulative sum trips on a persistent residual and decays when the residual re-enters the healthy band.",
      },
      {
        id: "oilc",
        title: "Oil residual",
        text: "Oil pressure and temperature are compared with the oil map. Bearing-film thickness is computed on the ground, where a bearing load can be assumed. It is not treated as an airborne measurement.",
      },
      {
        id: "fuel",
        title: "Fuel and exhaust",
        text: "Real fuel flow is compared with the flow reported by the controller. Exhaust-gas temperature is compared with the lagged prediction. A hot exhaust residual without roughness is the injector signature.",
        eq: String.raw`r_{fuel} = \dot{m}_f - \dot{m}_{f,\mathrm{ECU}}`,
      },
      {
        id: "mis",
        title: "Misfire",
        text: "Roughness is evaluated over approximately half a revolution. The call requires high roughness together with an exhaust-temperature hole. The check runs at firing rate and does not wait for the wear estimate.",
        eq: String.raw`L_k = (\omega_{max} - \omega_{min})/\omega_{avg}`,
      },
      {
        id: "knk",
        title: "Knock",
        text: "Oil entering the cylinder shortens ignition delay, represented by a Livengood–Wu integral. The check is performed on the ground and is gated so that a knock-driven exhaust spike is not classified as a misfire.",
      },
      {
        id: "sen",
        title: "Sensor",
        text: "One channel drifts while channels that share its physics remain consistent. After isolation, the model value may replace that channel. The substituted value is not used to update a wear term on the same channel.",
      },
      {
        id: "unk",
        title: "Unknown",
        text: "No named check has tripped, and the residual remains inconsistent with the healthy plant. The sample is logged and is not assigned to a component.",
      },
    ],
  },
  {
    id: "decide",
    title: "Decision",
    nodes: [
      {
        id: "pri",
        title: "Isolation priority",
        text: "When more than one check trips, precedence is the OEM limit, then lubrication, misfire, injector, sensor, and unknown. The lowest health index is a display of the wear vector, not a substitute for this order.",
      },
      {
        id: "rul",
        title: "Remaining useful life",
        text: "Only the slow thermal residual, the slow oil residual, and, later, the wear estimate are projected to an OEM temperature limit or the oil-pressure floor. A land-now event, a throttle transient, and an unknown flag are excluded. The published result is a low, mid, or high band.",
      },
    ],
  },
  {
    id: "where",
    title: "Where it runs",
    nodes: [
      {
        id: "edge",
        title: "Aircraft",
        text: "Ingest, the cycle-average prediction, the OEM-limit check, and the roughness check run on board. Land-now and the misfire check remain available if the radio link is lost. The loaded pack is not rewritten in flight.",
      },
      {
        id: "gcs",
        title: "Ground station",
        text: "The log is replayed through the crank-angle plant and through the lubrication, knock, and sensor-drift checks. A language model may answer only by calling those tools. It does not update wear or remaining useful life.",
      },
      {
        id: "hub",
        title: "Hub",
        text: "Healthy hours are used to refit the mission offset. Confirmed faults are written to the signature table. The next pack is signed here. The hub does not issue a land-now call. Simulator logs are excluded from the healthy set.",
      },
    ],
  },
  {
    id: "close",
    title: "Model update",
    nodes: [
      {
        id: "pack",
        title: "Next pack",
        text: "Contents are the mission-offset table, residual bands, cooling and oil calibration, and the threshold symbols. The pack is loaded at the next preflight.",
      },
      {
        id: "back",
        title: "Updated plant",
        text: "The physics model is unchanged in structure. It receives the revised offset, bands, and calibration. Live wear from the current sortie is not written back into the plant during flight.",
        eq: String.raw`F \leftarrow \mathrm{pack}\ N{+}1`,
      },
    ],
  },
];

const edges: FlowEdge[] = [
  { from: "pred", to: "mean", label: "plant" },
  { from: "live", to: "can" },
  { from: "can", to: "regime" },
  { from: "regime", to: "inn", label: "band" },
  { from: "sig", to: "mean" },
  { from: "mean", to: "inn" },
  { from: "can", to: "inn", label: "measurement" },
  { from: "inn", to: "upd" },
  { from: "inn", to: "oem" },
  { from: "inn", to: "thc" },
  { from: "inn", to: "oilc" },
  { from: "inn", to: "fuel" },
  { from: "inn", to: "mis" },
  { from: "oilc", to: "knk", label: "oil ingress" },
  { from: "upd", to: "sig", via: "below", label: "next step" },
  { from: "inn", to: "sen" },
  { from: "inn", to: "unk" },
  { from: "oem", to: "pri", label: "land now" },
  { from: "thc", to: "pri" },
  { from: "oilc", to: "pri" },
  { from: "fuel", to: "pri" },
  { from: "mis", to: "pri" },
  { from: "knk", to: "pri" },
  { from: "sen", to: "pri" },
  { from: "unk", to: "pri" },
  { from: "thc", to: "rul" },
  { from: "oilc", to: "rul" },
  { from: "upd", to: "rul", label: "later" },
  { from: "pri", to: "edge" },
  { from: "oem", to: "edge", label: "land now" },
  { from: "edge", to: "gcs", label: "log" },
  { from: "gcs", to: "hub" },
  { from: "hub", to: "pack" },
  { from: "pack", to: "back" },
  { from: "back", to: "pred", via: "below", label: "next preflight" },
];

export default function ArchitecturePage() {
  return (
    <Figure
      kicker="Figure 02"
      title="Systems architecture"
      lede="Dependency flow from the predicted measurement and the live engine, through the residual and the anomaly checks, to the pack loaded at the next preflight."
      current="architecture"
      columns={columns}
      edges={edges}
    />
  );
}
