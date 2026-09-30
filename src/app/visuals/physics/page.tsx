import type { Metadata } from "next";
import { Figure, type FlowColumn, type FlowEdge } from "@/components/flowchart";

export const metadata: Metadata = {
  title: "Physics model",
  description: "Left-to-right flow of the engine plant, from flight phase to the predicted measurement.",
};

const columns: FlowColumn[] = [
  {
    id: "phase",
    title: "Flight phase",
    nodes: [
      {
        id: "pha",
        title: "High altitude",
        text: "Ambient pressure decreases with altitude. Intake density falls and the compressor pressure ratio changes. Wear is held at the healthy value.",
      },
      {
        id: "phh",
        title: "Hot weather",
        text: "Ambient temperature is increased. The cooling network rejects heat to a warmer sink, so metal and oil temperatures rise with cooling health unchanged.",
      },
      {
        id: "phe",
        title: "Endurance",
        text: "The operating condition is held for a long duration. Wear may vary slowly. A life estimate may use only that slow variation.",
      },
      {
        id: "phr",
        title: "Rapid throttle",
        text: "Throttle angle and the fuel-rail command change. In the present model, turbo shaft speed is not driven by the throttle. Exhaust temperature and speed roughness may rise briefly, then recover.",
      },
    ],
  },
  {
    id: "inputs",
    title: "Inputs",
    nodes: [
      {
        id: "w",
        title: "Operating condition",
        text: "Altitude, airspeed, throttle, engine speed, ambient temperature, ram-air speed, and rail command. The flight phase selects the time schedule of this vector.",
        eq: String.raw`w = [h,\, V,\, \theta_{th},\, N,\, T_{amb},\, v_{ram},\, u]^{\mathsf T}`,
      },
      {
        id: "th",
        title: "Wear parameters",
        text: "Cooling multiplier, pump health, and a friction offset. Injector duty and the rail command remain operating inputs.",
        eq: String.raw`\theta = [\theta_{cool},\, \theta_{pump},\, \theta_{fric}]^{\mathsf T}`,
      },
    ],
  },
  {
    id: "intake",
    title: "Intake",
    nodes: [
      {
        id: "s1",
        title: "Atmosphere",
        text: "Ambient temperature and pressure follow the International Standard Atmosphere. The relation is valid below 11 km.",
        eq: String.raw`T_{amb} = T_0 - 0.0065\, h, \quad p_{amb} = p_0 (T_{amb}/T_0)^{5.2561}`,
      },
      {
        id: "s2",
        title: "Compressor",
        text: "Shaft speed and intercooler pressure set the pressure ratio. Mass flow is read from a head-coefficient map. A manufacturer map replaces the surrogate when available.",
        eq: String.raw`T_2 = T_1\left[1 + \frac{1}{\eta_C}\left(\pi_C^{(\kappa-1)/\kappa} - 1\right)\right]`,
      },
      {
        id: "s3",
        title: "Intercooler",
        text: "Charge air is cooled toward the coolant temperature. The exchanger stores no mass. Plenum pressure integrates compressor delivery minus throttle flow.",
        eq: String.raw`T_{ic} = T_2 - \varepsilon_{ic}(T_2 - T_{cool})`,
      },
    ],
  },
  {
    id: "charge",
    title: "Manifold and fuel",
    nodes: [
      {
        id: "s4",
        title: "Throttle and manifold",
        text: "Throttle flow is an orifice at the pressure ratio across the blade. Manifold pressure integrates throttle flow minus engine airflow. Throttling is taken as isenthalpic.",
        eq: String.raw`\dot{m}_{thr} = C_{d,th} A_{th}(\theta_{th})\, \dfrac{p_{ic}}{\sqrt{R T_{ic}}}\, \Psi`,
      },
      {
        id: "s5",
        title: "Cylinder filling",
        text: "Fresh air follows speed-density. Trapped mass includes fuel and residual gas. Volumetric efficiency and residual fraction are recalculated inputs, not wear terms.",
        eq: String.raw`m_a = \dfrac{\eta_v p_{im} V_d}{R_a T_{im}}, \quad m_{cyl} = \dfrac{m_a + m_f}{1 - x_{res}}`,
      },
      {
        id: "s6",
        title: "Port fuel injection",
        text: "The controller sets rail command and injector duty from the demanded air-fuel ratio. Pump health scales real rail pressure and is invisible to the controller, so real and reported fuel flow differ.",
        eq: String.raw`P_{rail} = k_{rail}\, \theta_{pump}\, u, \quad \dot{m}_f = C_d A_{max}\, \theta_{inj}\sqrt{2\rho_f \Delta P}`,
      },
    ],
  },
  {
    id: "cycle",
    title: "Closed cycle",
    nodes: [
      {
        id: "s7",
        title: "Slider-crank kinematics",
        text: "Piston position, cylinder volume, surface area, and mean piston speed are algebraic functions of crank angle and engine speed.",
        eq: String.raw`V(\varphi) = V_c + A_p\left[r(1-\cos\varphi) + l - \sqrt{l^2 - r^2\sin^2\varphi}\right]`,
      },
      {
        id: "s8",
        title: "Double Wiebe heat release",
        text: "Burned fraction is the sum of two Wiebe functions. It is an algebraic function of crank angle. Combustion phasing is an input. There is no ignition-delay state in the plant.",
        eq: String.raw`x_b = f_1 x_{b1} + f_2 x_{b2}`,
      },
      {
        id: "s9",
        title: "Woschni heat transfer",
        text: "The gas-side coefficient depends on bore, pressure, and temperature. In this relation, w is gas speed: mean piston speed plus a combustion-pressure term, which is zero during compression.",
        eq: String.raw`h = C\, D^{-0.2}\, p^{0.8}\, T^{-0.53}\, w^{0.8}`,
      },
      {
        id: "s10",
        title: "Cylinder first law",
        text: "One cylinder is integrated from intake-valve closing to exhaust-valve opening. Specific heat varies with temperature. Outputs are the pressure trace, gross work, peak pressure, and wall heat per cycle.",
        eq: String.raw`\frac{dp}{d\varphi} = \frac{1}{V}\left[(\gamma-1)\left(\frac{dQ_{comb}}{d\varphi} - \frac{dQ_{ht}}{d\varphi}\right) - \gamma p \frac{dV}{d\varphi}\right]`,
      },
    ],
  },
  {
    id: "power",
    title: "Exhaust and crank",
    nodes: [
      {
        id: "avg",
        title: "Cycle average",
        text: "Crank-angle results are reduced to cycle means of torque, fuel, exhaust temperature, and wall heat. The airborne prediction uses these means. The crank-resolved trace is retained for ground replay.",
        eq: String.raw`\bar{Q}_{wall} = \oint \dot{Q}_w\, dt`,
      },
      {
        id: "s11",
        title: "Gas exchange",
        text: "Pumping work is the intake-to-exhaust pressure difference times displacement. Exhaust temperature follows a blowdown from the exhaust-valve-opening state to manifold pressure.",
        eq: String.raw`T_{exh} = T_{EVO}\left(\frac{p_{em}}{p_{EVO}}\right)^{(\gamma-1)/\gamma}(1-\varepsilon_{loss})`,
      },
      {
        id: "s12",
        title: "Turbine and wastegate",
        text: "Turbine power is taken from the exhaust pressure ratio. Wastegate flow is a proportional-integral command on manifold-pressure error. Coupling of that reference to the throttle schedule is not yet closed.",
        eq: String.raw`P_T = \eta_T \dot{m}_T c_{p,g} T_3 \left[1 - \left(\frac{p_4}{p_3}\right)^{(\kappa_g-1)/\kappa_g}\right]`,
      },
      {
        id: "s13",
        title: "Turbo shaft",
        text: "Shaft speed integrates turbine power minus compressor power. The steady pressure-ratio expression is an initial guess, not the per-step equation. Shaft power returns to the compressor.",
        eq: String.raw`J_{tc}\dot{\omega}_{tc} = (\eta_m P_T - P_C)/\omega_{tc}`,
      },
      {
        id: "s14",
        title: "Indicated torque",
        text: "Cycle-mean indicated torque sums gross work and pumping work. The crank-angle torque sum agrees with this mean over one revolution.",
        eq: String.raw`T_{ind} = N_{cyl}(W_{gross} + W_{pump})/(4\pi)`,
      },
      {
        id: "s15",
        title: "Friction and propeller",
        text: "Friction mean effective pressure retains the Chen–Flynn form. Propeller torque is quadratic in propeller speed and is referred through the gearbox. Wear enters as an offset on friction torque.",
        eq: String.raw`\mathrm{FMEP} = C_f + 0.005\, p_{max} + 0.162\, S_p`,
      },
      {
        id: "spd",
        title: "Crankshaft",
        text: "Engine speed integrates indicated torque minus friction and propeller load. Effective inertia includes the propeller referred through the gear ratio.",
        eq: String.raw`J_{eff}\dot{\omega} = T_{ind} - \tau_{fric} - \tau_{load}`,
      },
    ],
  },
  {
    id: "aux",
    title: "One-way auxiliaries",
    nodes: [
      {
        id: "cool",
        title: "Cooling network",
        text: "Cycle wall heat enters a lumped network. The head rejects heat to coolant and then the radiator. The cylinder may reject heat to ram air, coolant, or both. Piston heat enters the oil.",
        eq: String.raw`\dot{Q} = UA(T_1 - T_2), \quad UA_{air} = UA_0 + k\, v_{ram}^{n}`,
      },
      {
        id: "deg",
        title: "Cooling degradation",
        text: "Radiator effectiveness, oil-cooler effectiveness, coolant flow, ram-air heat transfer, and the wall-to-coolant coefficient are scaled by separate damage fractions. The airborne wear term is one multiplier on conductance. A hot day does not change that multiplier.",
      },
      {
        id: "oil",
        title: "Oil circuit",
        text: "Oil temperature integrates friction power and a fraction of wall heat, minus rejection to ambient. Oil pressure is a map of speed and temperature, limited by the relief valve.",
        eq: String.raw`C_o \dot{T}_{oil} = P_{fric} + f_{oil}\dot{Q}_{wall} - h_o(T_{oil} - T_{amb})`,
      },
      {
        id: "elec",
        title: "Electrical",
        text: "Bus voltage lags a speed-dependent alternator target. The target is limited by the regulator and reduced by load current through the battery resistance.",
        eq: String.raw`\tau_e \dot{V}_{bus} = \min(k_{alt} N,\, V_{reg}) - I_{load} R_{batt} - V_{bus}`,
      },
      {
        id: "vib",
        title: "Vibration",
        text: "A single structural resonance is forced at the first three firing harmonics. Force amplitude is proportional to the cylinder pressure range.",
        eq: String.raw`f_{fire} = (N/60)\,(N_{cyl}/2)`,
      },
    ],
  },
  {
    id: "meas",
    title: "Measurement",
    nodes: [
      {
        id: "s17",
        title: "Sensor dynamics",
        text: "Each channel is a first-order lag of its true value, plus bias and noise. Cylinder-head, oil, and manifold temperatures use a thermistor. Exhaust temperature uses a thermocouple. Fuel flow reported by the controller is a computed value, stated to within 10 percent.",
        eq: String.raw`\tau_s \dot{y} = x - y`,
      },
      {
        id: "bias",
        title: "Mission offset",
        text: "A frozen offset is added to the lagged prediction only. It is selected from the mission label before takeoff and held until landing. A missing label sets the offset to zero. The offset is not a wear term.",
        eq: String.raw`\hat{x}_{used} = \mathrm{lag}(\hat{x}) + b(\mathrm{profile})`,
      },
      {
        id: "pred",
        title: "Predicted measurement",
        text: "Engine speed, cylinder-head temperature, exhaust-gas temperature, oil pressure, oil temperature, fuel flow, vibration, bus voltage, and injection timing. This vector is the input to the architecture figure.",
      },
    ],
  },
];

const edges: FlowEdge[] = [
  { from: "pha", to: "w" },
  { from: "phh", to: "w" },
  { from: "phe", to: "w" },
  { from: "phr", to: "w" },
  { from: "w", to: "s1" },
  { from: "w", to: "s4", label: "throttle" },
  { from: "w", to: "s7", label: "engine speed" },
  { from: "w", to: "s6", label: "rail command" },
  { from: "th", to: "s6", label: "pump health" },
  { from: "th", to: "deg", label: "cooling" },
  { from: "th", to: "s15", label: "friction" },
  { from: "s1", to: "s2" },
  { from: "s2", to: "s3" },
  { from: "s3", to: "s4" },
  { from: "s4", to: "s5" },
  { from: "s4", to: "s6", label: "manifold pressure" },
  { from: "s5", to: "s6", label: "air mass" },
  { from: "s5", to: "s10", label: "trapped mass" },
  { from: "s6", to: "s8", label: "fuel energy" },
  { from: "s7", to: "s8" },
  { from: "s7", to: "s9" },
  { from: "s7", to: "s10", label: "volume" },
  { from: "s8", to: "s9" },
  { from: "s8", to: "s10" },
  { from: "s9", to: "s10", label: "wall heat" },
  { from: "s10", to: "avg" },
  { from: "s10", to: "s11" },
  { from: "s10", to: "s14", label: "pressure trace" },
  { from: "s10", to: "vib", label: "pressure range" },
  { from: "avg", to: "cool" },
  { from: "s11", to: "s12" },
  { from: "s11", to: "s17", label: "exhaust temperature" },
  { from: "s12", to: "s13" },
  { from: "s13", to: "s2", via: "below", label: "shaft power" },
  { from: "s14", to: "s15" },
  { from: "s15", to: "spd" },
  { from: "s15", to: "oil", label: "friction power" },
  { from: "spd", to: "elec" },
  { from: "spd", to: "vib" },
  { from: "spd", to: "s17", label: "engine speed" },
  { from: "spd", to: "s7", via: "below", label: "engine speed" },
  { from: "s11", to: "s5", via: "below", label: "previous exhaust temperature" },
  { from: "cool", to: "deg" },
  { from: "cool", to: "oil" },
  { from: "cool", to: "s17", label: "head temperature" },
  { from: "oil", to: "s17" },
  { from: "elec", to: "s17" },
  { from: "vib", to: "s17" },
  { from: "s6", to: "s17", label: "fuel flow" },
  { from: "s17", to: "bias" },
  { from: "bias", to: "pred" },
];

export default function PhysicsPage() {
  return (
    <Figure
      kicker="Figure 01"
      title="Physics model"
      lede="Dependency flow of the plant. Operating condition and wear enter on the left. The predicted measurement leaves on the right. Feedback paths run under the diagram."
      current="physics"
      columns={columns}
      edges={edges}
    />
  );
}
