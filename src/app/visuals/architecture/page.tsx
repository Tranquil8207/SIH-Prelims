import type { Metadata } from "next";
import { Figure, type FlowColumn, type FlowEdge } from "@/components/flowchart";

export const metadata: Metadata = {
  title: "Systems architecture",
  description: "How one engine cycle is solved: direct steps, a crank-angle march, an inner pressure loop, then the slow updates.",
};

const columns: FlowColumn[] = [
  {
    id: "init",
    title: "Once",
    nodes: [
      {
        id: "init",
        title: "Initialize",
        text: "Load the fixed model data and the starting state before the first cycle. Wiebe parameters, combustion phasing, injector area, thermal conductances, and the friction constant are fitted quantities, not a published manufacturer calibration.",
        defs: [
          { tex: "L, D, V_d", meaning: "stroke, bore, and displacement volume of the cylinder" },
          { tex: "\\rho_f, \\mathrm{LHV}", meaning: "fuel density and lower heating value" },
          { tex: "C, C_1, C_2", meaning: "Woschni coefficient, and the two velocity coefficients. C_1 is 2.28. C_2 is 0.00324 during combustion and expansion, and 0 during compression. C follows the pressure unit." },
          { tex: "J_{eff}", meaning: "effective rotating inertia" },
          { tex: "K_p", meaning: "propeller-load coefficient" },
          { tex: "N", meaning: "starting engine speed, rpm" },
          { tex: "T_{wall}, T_{cool}, T_{oil}", meaning: "starting wall, coolant, and oil temperatures" },
          { tex: "C_w, m_c, c_p", meaning: "wall thermal capacity, coolant mass, and coolant specific heat" },
        ],
      },
    ],
  },
  {
    id: "cycle",
    title: "Each cycle",
    nodes: [
      {
        id: "read",
        title: "Read the operating point",
        text: "Step 0 of cycle n. These values are known for the cycle. They are not solved. Exhaust pressure is stored for a later pumping model and is not part of the torque sum.",
        defs: [
          { tex: "n", meaning: "cycle index" },
          { tex: "N", meaning: "engine speed, rpm" },
          { tex: "p_{MAP}, T_{MAT}", meaning: "intake-manifold absolute pressure and temperature" },
          { tex: "p_{exh}", meaning: "exhaust-manifold pressure" },
          { tex: "\\eta_v", meaning: "volumetric efficiency" },
          { tex: "x_{res}", meaning: "residual-gas fraction" },
          { tex: "u_k", meaning: "normalised fuel-rail command" },
          { tex: "\\theta_{inj}", meaning: "injector duty, from 0 to 1" },
          { tex: "T_{amb}, v_{ram}", meaning: "ambient temperature and ram-air velocity" },
        ],
      },
    ],
  },
  {
    id: "direct",
    title: "Direct",
    nodes: [
      {
        id: "direct",
        title: "Geometry, fuel, charge, start",
        text: "Steps 1 to 4 run once per cycle, in that order, with no iteration. Geometry from speed. Fuel mass from the rail command, the manifold pressure, and the injector duty. Trapped mass from the fresh charge, the residual, and the fuel. The cylinder then starts at intake-valve closing, at bottom dead centre.",
        defs: [
          { tex: "\\omega", meaning: "crank angular speed, rad/s, from engine speed in rpm" },
          { tex: "S_p", meaning: "mean piston speed, 2LN/60" },
          { tex: "V(\\theta)", meaning: "cylinder volume at the current crank angle" },
          { tex: "m_{f,cycle}", meaning: "fuel mass in the four-stroke cycle" },
          { tex: "m_{trapped}", meaning: "fresh mass plus residual mass plus fuel mass" },
          { tex: "p_r, T_r, V_r", meaning: "pressure, temperature, and volume at intake-valve closing. These are the Woschni reference and the cylinder’s starting state." },
          { tex: "U", meaning: "internal energy at that starting state" },
        ],
      },
    ],
  },
  {
    id: "crank",
    title: "Fast loop",
    nodes: [
      {
        id: "crank",
        title: "Crank angle, then pressure",
        tone: "loop",
        text: "For each crank step from 0° to 720°, update the volume and the combustion heat directly. Then repeat gas velocity, wall heat, the first law, temperature, and pressure. Keep the step when both relative changes are under their tolerances. Otherwise go around again from the gas velocity. Store pressure, temperature, burned fraction, and wall heat, and advance one crank step. A converged state is the start of the next crank step.",
        eq: [
          String.raw`\epsilon_T = \frac{|T^{(j+1)} - T^{(j)}|}{\max(T^{(j)}, 1)}`,
          String.raw`\epsilon_p = \frac{|p^{(j+1)} - p^{(j)}|}{\max(p^{(j)}, 1)}`,
          String.raw`\epsilon_T < \epsilon_{T,tol} \quad\text{and}\quad \epsilon_p < \epsilon_{p,tol}`,
        ],
        defs: [
          { tex: "\\theta", meaning: "crank angle. The march runs from 0° to 720°." },
          { tex: "k", meaning: "crank-step index" },
          { tex: "j", meaning: "pass index inside one crank step" },
          { tex: "V", meaning: "cylinder volume at the crank step. Direct from the geometry." },
          { tex: "dQ_{comb}", meaning: "combustion heat over the step, from the double-Wiebe burned fraction. Direct." },
          { tex: "w", meaning: "characteristic gas velocity. Depends on the current pressure." },
          { tex: "h", meaning: "gas-side heat-transfer coefficient. Depends on pressure, temperature, and gas velocity." },
          { tex: "dQ_{wall}", meaning: "heat from the gas to the wall over the step" },
          { tex: "U", meaning: "internal energy. Updated from combustion heat, wall heat, and p dV." },
          { tex: "T", meaning: "gas temperature, inverted from internal energy and the property model" },
          { tex: "p", meaning: "cylinder pressure, from temperature, trapped mass, and volume" },
          { tex: "\\epsilon_T, \\epsilon_p", meaning: "relative changes between passes" },
          { tex: "\\epsilon_{T,tol}, \\epsilon_{p,tol}", meaning: "acceptance tolerances. Both must pass." },
        ],
      },
    ],
  },
  {
    id: "slow",
    title: "After 720°",
    nodes: [
      {
        id: "slow",
        title: "Work, shaft, then heat",
        text: "Steps 6 to 11 run once the trace is complete, in that order. Indicated work and friction use the finished pressure trace. Shaft speed is then integrated. Wall, coolant, and oil use the cycle’s wall heat. Degradation scales cooling capacity only.",
        defs: [
          { tex: "W_i", meaning: "indicated work, the closed integral of p dV" },
          { tex: "p_{max}", meaning: "peak pressure, used by the friction relation" },
          { tex: "T_{ind}, T_{fric}, T_{load}", meaning: "indicated, friction, and load torque. Net torque is the first minus the other two." },
          { tex: "J_{eff}", meaning: "inertia that turns net torque into a change of crank speed" },
          { tex: "N", meaning: "updated engine speed" },
          { tex: "T_w, T_{cool}, T_{oil}", meaning: "updated wall, coolant, and oil temperatures" },
          { tex: "D_{rad}, D_{oil}, D_{flow}, D_{air}", meaning: "degradation of the radiator, oil cooler, coolant flow, and ram air. Each scales a healthy capacity. None of them edits the burn." },
        ],
      },
    ],
  },
  {
    id: "advance",
    title: "Close the cycle",
    nodes: [
      {
        id: "advance",
        title: "Check, report, advance",
        text: "Check units, a positive trapped mass, a positive absolute pressure, and a physical volume. On a periodic cycle the gas energy change is about zero, so fuel energy is about cycle work plus wall heat, apart from exhaust and other losses. Then carry speed and the three temperatures to cycle n+1 and return to the operating point.",
        eq: [
          String.raw`Q_{fuel} \approx W_{cycle} + Q_{wall}`,
          String.raw`n \rightarrow n+1`,
        ],
        defs: [
          { tex: "Q_{fuel}", meaning: "chemical energy of the fuel in the cycle" },
          { tex: "W_{cycle}", meaning: "gas work over the cycle" },
          { tex: "Q_{wall}", meaning: "heat delivered to the wall over the cycle" },
          { tex: "\\Delta U", meaning: "change in gas internal energy over the cycle. About zero when the cycle is periodic." },
          { tex: "N, T_{wall}, T_{cool}, T_{oil}", meaning: "the state carried into the next cycle" },
          { tex: "n", meaning: "cycle index" },
        ],
      },
    ],
  },
  {
    id: "after",
    title: "After the cycle",
    nodes: [
      {
        id: "resid",
        title: "Lag, offset, residual",
        text: "This sits after the cycle outputs, before any check and before the wear correction. The cycle means are mapped onto the gauges: speed from the shaft step, head or coolant temperature from the cooling step rather than peak gas temperature, exhaust temperature from blowdown at exhaust-valve opening plus a thermocouple lag, oil pressure and temperature from the oil map and the oil node, and fuel flow from the injector step. Controller-reported fuel flow is that same formula without pump health. Vibration is not a cycle mean. It needs the crank-angle torque pulse. Bus voltage needs alternator gains that are not in this solver. Injection timing is an input, the injector duty and the spark angle. A hot day changes ambient temperature in the operating point. It does not change the cooling multipliers.",
        eq: [
          String.raw`\hat{x}_{\mathrm{phys}} = F_{\mathrm{slow}}(w, \theta)`,
          String.raw`\hat{x}_{\mathrm{sensor}} = \mathrm{lag}(\hat{x}_{\mathrm{phys}})`,
          String.raw`\hat{x}_{\mathrm{used}} = \hat{x}_{\mathrm{sensor}} + b(\mathrm{profile})`,
          String.raw`r = x_s - \hat{x}_{\mathrm{used}}`,
        ],
        defs: [
          { tex: "\\hat{x}_{\\mathrm{phys}}", meaning: "physical prediction. The solver cycle means, not the crank-angle states." },
          { tex: "F_{\\mathrm{slow}}", meaning: "slow measurement map. It reads the finished cycle." },
          { tex: "w", meaning: "operating condition for the cycle: speed, manifold pressure and temperature, ambient temperature, ram air, and the other Step 0 inputs." },
          { tex: "\\theta", meaning: "wear. Three terms: one cooling multiplier, pump health, and a friction offset." },
          { tex: "\\mathrm{lag}", meaning: "first-order sensor lag." },
          { tex: "\\hat{x}_{\\mathrm{sensor}}", meaning: "prediction after that lag." },
          { tex: "b(\\mathrm{profile})", meaning: "mission offset. Chosen before takeoff, frozen until landing, and added only after the lag. An unknown profile uses zero. It is not added to manifold pressure, ambient temperature, or wear." },
          { tex: "\\hat{x}_{\\mathrm{used}}", meaning: "prediction the residual is taken against." },
          { tex: "x_s", meaning: "live gauge vector from the aircraft." },
          { tex: "r", meaning: "residual. Live gauges minus that prediction. The wear update and the checks below both read it." },
        ],
      },
      {
        id: "wear",
        title: "Unscented wear update",
        text: "Once per slow step, not inside the crank-angle march. The predicted wear is a random walk. Seven sigma points, two for each of the three wear terms plus the centre, are run through the slow map, lagged, and shifted by the same mission offset. Their weighted mean is the predicted measurement, and the residual is the innovation. The correction is added to the predicted wear. The result is an input of the next cycle. It does not rewrite the Wiebe parameters, the Woschni coefficients, or the geometry. The misfire check does not wait for it. Process noise is not enlarged to hide a missing offset, and measurement noise is not the scatter of head temperature across different missions. If this update is off, wear stays at the healthy value and the residual and the checks still run.",
        eq: String.raw`\hat{\theta} = \hat{\theta}^{-} + K r`,
        defs: [
          { tex: "\\hat{\\theta}^{-}", meaning: "wear predicted forward from the previous update, before this residual is applied." },
          { tex: "\\hat{\\theta}", meaning: "corrected wear, carried into the next cycle as the wear input." },
          { tex: "K", meaning: "unscented gain." },
          { tex: "r", meaning: "residual from the card above." },
          { tex: "\\theta_{\\mathrm{cool}}", meaning: "the one airborne cooling multiplier. It stands in for the radiator, oil-cooler, coolant-flow, and ram-air degradations in the plant." },
          { tex: "D_{\\mathrm{pump}}", meaning: "pump health. The same multiplier as in the fuel step." },
          { tex: "\\theta_{\\mathrm{fric}}", meaning: "offset on the constant term of the friction relation." },
        ],
      },
      {
        id: "checks",
        title: "Anomaly checks",
        text: "These read the residual and the raw gauges. They do not write the crank-angle loop, and they are not the cooling multipliers inside the plant. Those multipliers are how a sick cooler is simulated. An OEM breach is the land-now call. Thermal and oil each keep their own cumulative sum. The slack in each sum is at least the sensor-lag and fuel-tolerance uncertainty. A rapid throttle change is left out of those sums. If several checks fire, the order is OEM, lubrication, misfire, injector, sensor, then unknown. Remaining life, when it is used, trends only the slow thermal residual, the slow oil residual, or later the wear estimate. It does not trend a throttle transient or an unknown flag.",
        defs: [
          { tex: "r", meaning: "residual from the first card in this column." },
          { tex: "\\mathrm{OEM}", meaning: "envelope on the raw gauges: oil pressure, oil temperature, exhaust temperature, boost, and time at takeoff speed. It does not use the solver, the offset, or the filter. A breach is land-now." },
          { tex: "\\mathrm{thermal}", meaning: "residual of head or coolant temperature after the offset. Not the peak gas temperature." },
          { tex: "\\mathrm{oil}", meaning: "residual of oil pressure and oil temperature against the oil map. Bearing-film thickness stays on the ground." },
          { tex: "\\mathrm{fuel}", meaning: "measured fuel flow minus the controller-reported flow, together with the exhaust residual. There is no mass-air-flow sensor in this check." },
          { tex: "\\mathrm{misfire}", meaning: "half-revolution roughness, plus an exhaust-temperature hole in the residual. Not a forced high-exhaust flag, and it does not wait for the wear update." },
          { tex: "\\mathrm{sensor}", meaning: "one channel moves while the channels that share its physics do not. The mission offset is not the explanation." },
          { tex: "\\mathrm{unknown}", meaning: "no named check tripped, and the residual is still foreign. No component is named." },
        ],
      },
    ],
  },
];

const edges: FlowEdge[] = [
  { from: "init", to: "read" },
  { from: "read", to: "direct" },
  { from: "direct", to: "crank" },
  { from: "crank", to: "slow" },
  { from: "slow", to: "advance" },
  { from: "advance", to: "resid" },
  { from: "advance", to: "read", via: "below", label: "Next cycle" },
];

export default function ArchitecturePage() {
  return (
    <Figure
      kicker="Figure 02"
      title="Systems architecture"
      lede="How the cycle is solved, then how it is compared with the aircraft. Read left to right through the cycle. The outlined card repeats pressure and temperature until both settle. The last column makes the residual, then the wear update and the checks read that residual. The line under the row carries speed and temperature into the next cycle. Wear, when the filter is on, is an input of that next cycle."
      current="architecture"
      columns={columns}
      edges={edges}
    />
  );
}
