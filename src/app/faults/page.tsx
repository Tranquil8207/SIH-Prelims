import type { Metadata } from "next";
import { PageNav } from "@/components/page-nav";

export const metadata: Metadata = {
  title: "Fault mapping",
  description: "From a residual to a failure mechanism, a component, a confirmation test, and a spare.",
};

function MapTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: string[][] }) {
  return (
    <div className="dash-table-wrap">
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("|")}>
              {row.map((cell, index) => (
                <td key={index}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FaultsPage() {
  return (
    <main className="dash-page">
      <div className="sheet-head">
        <header className="flow-banner">
          <div className="flow-banner-text">
            <p className="flow-kicker">Maintenance</p>
            <h1>Fault mapping</h1>
            <p className="flow-lede">
              This sits after the residual. A residual is not a spare part. The page ranks a mechanism, names a
              component, and names the test that has to pass before anyone replaces that component. It is a research
              mapping for this digital twin. It does not replace the applicable maintenance manual, and it is not an
              airworthiness decision.
            </p>
          </div>
          <PageNav current="/faults" />
        </header>
      </div>
      <div className="dash">
        <section className="dash-card">
          <h2>Where this sits</h2>
          <p>Detection is already on the systems page. Everything below that line is this page.</p>
          <MapTable
            caption="Layers from detection to inventory"
            headers={["Layer", "Question"]}
            rows={[
              ["Detection", "Is the engine behaving abnormally?"],
              ["Diagnosis", "Which failure mechanism best explains the abnormality?"],
              ["Localization", "Which physical component is most likely responsible?"],
              ["Confirmation", "Which physical test should verify that diagnosis?"],
              ["Maintenance", "Monitor, inspect, repair, or replace?"],
              ["Inventory", "Which part should be stocked, and how critical is a shortage?"],
            ]}
          />
        </section>

        <section className="dash-card">
          <h2>From a residual to a spare</h2>
          <p>One symptom can have several causes. Supporting evidence is required before a component is named.</p>
          <MapTable
            caption="Steps from a residual to a spare part"
            headers={["Step", "What is used"]}
            rows={[
              ["Residual", "Live gauge minus the lagged prediction, after the frozen mission offset."],
              ["Operating condition", "Speed, manifold pressure, altitude, ambient temperature, fuel flow, and load."],
              ["Supporting evidence", "Exhaust temperature, head temperature, oil pressure and temperature, cylinder pressure, vibration, and acoustic level."],
              ["Failure mechanism", "The ranked explanation, not a single fault label."],
              ["Component", "The part that mechanism points to first."],
              ["Confirmation test", "The inspection that can tell this mechanism from the others."],
              ["Maintenance action", "Monitor, inspect, repair, or replace. Replacement waits for a failed test."],
              ["Spare", "The part and its stock priority. Priorities here are an engineering classification, not a published maintenance limit."],
            ]}
          />
        </section>

        <section className="dash-card">
          <h2>How strong a row is</h2>
          <MapTable
            caption="Evidence strength labels"
            headers={["Label", "Meaning"]}
            rows={[
              ["Published maintenance guidance", "Supported by general engine troubleshooting and maintenance guidance. It does not replace the applicable maintenance manual."],
              ["Applicable manual", "Supported by that engine's maintenance documentation, parts information, or service information."],
              ["Engineering inference", "Mechanically reasonable from the measured signature. It still has to be checked against that engine and its manual."],
              ["Model assumption", "Introduced for this digital twin. Not claimed as a published engine fact."],
            ]}
          />
        </section>

        <section className="dash-card">
          <h2>Combustion, cylinder, and valve train</h2>
          <p>These rows are engineering inferences. A published troubleshooting guide is the maintenance-logic foundation. It is not copied here as a single symptom table.</p>
          <MapTable
            caption="Combustion and valve-train abnormalities"
            headers={["Abnormality", "Supporting evidence", "Likely mechanism", "Inspect first", "Confirmation", "Maintenance", "Spares"]}
            rows={[
              ["Exhaust temperature up on one cylinder, cylinder pressure down", "Head temperature may fall or oscillate. That cylinder's power contribution falls.", "Late or incomplete combustion, or loss of compression", "Exhaust valve, seat, guide, valve train, piston and rings", "Differential compression and a valve leakage test", "Repair the head or valve, or replace the affected parts", "Cylinder-head and valve consumables"],
              ["Exhaust temperature up, weak or late heat release, compression normal", "Fuel flow may be normal. No strong mechanical vibration.", "Ignition or combustion phasing", "Spark plug, lead, coil, ignition module", "Ignition test and plug inspection", "Replace the failed ignition part", "Spark plugs and ignition consumables"],
              ["Exhaust temperature down sharply, pressure and work down", "Speed may fall or fluctuate. That cylinder's contribution falls.", "Misfire, or no combustion", "Injector or ignition", "Injector flow test and an ignition test", "Replace the injector or the ignition part, according to the test", "Injector and ignition spares"],
              ["Exhaust temperature up, fuel flow up, cylinder pressure down", "A richer command with poor work from the cylinder", "Poor combustion, or compression loss", "Valve sealing, piston, rings, cylinder", "Compression and leak-down", "Cylinder repair or overhaul", "Cylinder, valve, and ring stock"],
              ["Exhaust temperature down, fuel flow down on one cylinder", "Injector command can stay normal while inferred delivery falls", "Injector restriction", "Injector, its filter or orifice, that branch of the rail", "Injector flow test", "Clean or replace the injector", "Injectors"],
              ["Exhaust temperature, pressure, and speed all oscillating", "Strong cycle-to-cycle variation", "Intermittent misfire", "Plug, lead, coil, or injector", "Cylinder contribution, then ignition and injector tests", "Replace the failed ignition or fuel part", "Fast-moving ignition and injector spares"],
              ["Exhaust temperature and pressure abnormal, acoustic level not raised", "Mechanical noise is not elevated", "Combustion or gas exchange, rather than a gross mechanical imbalance", "Injector, ignition, valve sealing", "Compression, injector, and ignition tests", "Repair the part the test identifies", "Injector, plug, and valve parts"],
              ["Exhaust temperature and pressure abnormal, valve lift reduced", "Intake or exhaust flow is reduced. The cylinder fills less well.", "Cam lobe or tappet wear", "Camshaft, tappet, pushrod, and rocker", "Measure valve lift. Inspect the cam and tappet.", "Replace the damaged valve-train parts as the manual allows", "Cam and tappet assembly"],
              ["Pressure trace worsens over many cycles, with no sudden event", "Metal or debris may show in the oil trend", "Progressive valve-train wear", "Cam lobe and tappet", "Valve-lift measurement, and oil and filter inspection", "Replace the worn valve-train parts", "Cam and tappet stock"],
              ["Compression falls over time, oil consumption rises", "Blow-by rises. The crankcase may contaminate.", "Piston-ring or cylinder wear", "Rings, cylinder wall, piston", "Differential compression, borescope, oil analysis", "Replace rings or recondition the cylinder, as permitted", "Ring sets and cylinder assemblies"],
              ["Compression down, leakage at the exhaust", "Exhaust temperature and the exhaust-side thermal signature change", "Exhaust valve or seat leakage", "Exhaust valve, seat, and guide", "Leak-down, listening at the exhaust", "Valve or seat repair", "Exhaust valves and seats"],
              ["Compression down, leakage at the intake", "Intake flow is abnormal", "Intake valve or seat leakage", "Intake valve, seat, and guide", "Leak-down, listening at the intake", "Valve or seat repair", "Intake valves and seats"],
              ["Compression down, leakage into the crankcase", "Oil consumption and blow-by rise", "Ring or cylinder sealing", "Rings, piston, cylinder", "Leak-down at the crankcase, and a borescope", "Ring or cylinder repair", "Ring sets, piston, cylinder"],
              ["Valve lift down, ignition and fuel signals normal", "Exhaust temperature and pressure follow the valve event", "Valve-train geometry", "Cam, tappet, pushrod, rocker", "Measure actual valve lift", "Replace the damaged valve-train part", "Tappets and pushrods. The camshaft is stocked less often."],
            ]}
          />
        </section>

        <section className="dash-card">
          <h2>One residual, several hypotheses</h2>
          <p>
            Exhaust temperature abnormal, cylinder pressure abnormal, acoustic level normal, and speed and load about
            normal. Do not go straight to “misfire, replace the plug.”
          </p>
          <MapTable
            caption="Hypothesis ranking for abnormal exhaust temperature and cylinder pressure"
            headers={["Rank", "Hypothesis", "Why it is plausible", "What strengthens it", "Maintenance target"]}
            rows={[
              ["1", "Partial or intermittent combustion failure", "Both exhaust temperature and pressure are affected", "Cycle-to-cycle pressure variation", "Injector or ignition"],
              ["2", "Valve sealing", "Pressure loss can move exhaust temperature without loud mechanical noise", "Low compression and leakage at the intake or exhaust", "Valve, seat, or guide"],
              ["3", "Valve-train lift", "Less lift changes filling and the pressure trace", "Reduced valve lift, or a shifted valve event", "Cam, tappet, pushrod, or rocker"],
              ["4", "Injector delivery", "Combustion energy changes without mechanical noise", "Command normal, inferred delivery or exhaust temperature abnormal", "Injector"],
              ["5", "Ignition", "Late or weak combustion moves exhaust temperature", "An ignition test finds a weak spark", "Plug, lead, coil, or module"],
            ]}
          />
        </section>

        <section className="dash-card">
          <h2>How the same pressure trace splits</h2>
          <p>A persistent abnormal pressure trace is not, by itself, a misfire.</p>
          <MapTable
            caption="Three readings of an abnormal pressure trace"
            headers={["Pattern", "Reading", "Inspect"]}
            rows={[
              ["Pressure and exhaust temperature abnormal, cycle to cycle, compression normal, valve lift normal", "Misfire", "Injector and ignition"],
              ["Pressure and exhaust temperature abnormal, fuel command normal, ignition indications normal, compression normal, valve lift reduced", "Valve train", "Tappet, pushrod, rocker, and cam. Confirm with a valve-lift measurement."],
              ["Pressure abnormal and compression lost", "Cylinder sealing or valve leakage", "Valve, seat, guide, rings, and cylinder"],
            ]}
          />
        </section>

        <section className="dash-card">
          <h2>Acoustic level is a clue, not a gate</h2>
          <p>A quiet signature lowers the chance of faults that should shake the engine. It does not clear the valve train.</p>
          <MapTable
            caption="What an acoustic or vibration clue changes"
            headers={["Combination", "What rises"]}
            rows={[
              ["Pressure and exhaust temperature abnormal, acoustic level high", "Mechanical or valve-train hypothesis"],
              ["Pressure and exhaust temperature abnormal, acoustic level normal", "Combustion, fuel, or ignition hypothesis"],
              ["Pressure and exhaust temperature abnormal, and a valve-lift residual", "Cam and tappet hypothesis"],
              ["Pressure abnormal, compression lost", "Valve, ring, or cylinder hypothesis"],
              ["Exhaust temperature abnormal, pressure normal, fuel-flow residual", "Injector or fuel-system hypothesis"],
              ["Exhaust temperature abnormal, pressure normal, ignition residual", "Ignition hypothesis"],
              ["Vibration up, and metal in the oil trend", "Bearing or rotating-component hypothesis"],
              ["Vibration up, pressure normal, exhaust temperature normal", "Propeller, gearbox, or mount hypothesis"],
            ]}
          />
        </section>

        <section className="dash-card">
          <h2>Oil</h2>
          <p>Read oil pressure and oil temperature against speed, load, manifold pressure, ambient temperature, oil temperature, oil level, warm-up, and how long the engine has been running. A fixed threshold alone raises false maintenance calls.</p>
          <MapTable
            caption="Oil trends"
            headers={["Trend", "Supporting evidence", "Likely mechanism", "Inspect", "Possible replacement"]}
            rows={[
              ["Oil pressure falls over time", "Oil temperature rises", "Viscosity or flow", "Level, filter, lines, relief valve", "Filter or relief-valve parts"],
              ["Oil pressure down, metal particles up", "Bearing temperature or vibration may rise", "Bearing wear", "Debris in the oil and filter, then the bearings", "Bearings, or an overhaul"],
              ["Oil pressure down, level normal, no external leak", "No visible leak", "Pump, relief, or suction", "Pump, relief valve, suction path", "Pump or relief parts"],
              ["Oil temperature up, oil pressure down", "Heat rejection is poor", "Oil cooler, oil flow, or extra friction", "Cooler, lines, thermostat or flow control", "Cooler, thermostat, seals"],
              ["Oil temperature up, oil consumption up", "Blow-by rises", "Rings or cylinder", "Compression and a borescope", "Rings or cylinder"],
              ["Oil consumption up, pressure normal", "An external leak is possible", "Seal or gasket", "Visual leak inspection", "Gasket, O-ring, or seal"],
              ["Oil consumption up, blow-by up", "Compression down", "Rings or cylinder", "Differential compression", "Rings, piston, or cylinder"],
              ["Oil pressure oscillating", "The oscillation follows speed", "Relief valve, pump, or suction instability", "Relief valve, pump, suction path", "Relief valve or pump parts"],
            ]}
          />
        </section>

        <section className="dash-card">
          <h2>Cooling</h2>
          <p>These rows connect the cooling-degradation model to a maintenance target. They are engineering inferences, not a claim that a published guide names the radiator from this signature.</p>
          <MapTable
            caption="Cooling trends"
            headers={["Model trend", "Supporting evidence", "Reading", "Maintenance target"]}
            rows={[
              ["Head temperature up, coolant temperature up", "Oil temperature normal", "Coolant is rejecting less heat", "Radiator, coolant flow, or thermostat"],
              ["Head temperature up, coolant temperature about normal", "The problem stays on one head", "Head-side heat transfer, a passage, or local flow", "Cylinder head and its cooling passage"],
              ["Head temperature up and oil temperature up", "Both thermal paths are hot", "Too much heat to reject, or too little airflow", "Cooling airflow, radiator, oil cooler"],
              ["Head temperature up mainly at high power", "Low power looks normal", "Not enough cooling capacity under load", "Radiator, airflow, or coolant-flow capacity"],
              ["Head temperature rises with ambient temperature", "A strong ambient correlation", "Less margin to reject heat", "Cooling capacity and airflow"],
              ["Head temperature up, inferred coolant flow down", "The flow term in the model has fallen", "Pump or a flow restriction", "Pump, flow path, thermostat"],
              ["Head temperature up, coolant flow normal, radiator temperature drop abnormal", "Flow is present and rejection is poor", "Radiator blockage or an air-side problem", "Radiator"],
              ["Oil temperature up, coolant path normal", "The extra heat is in the oil path", "Oil cooler, its airflow, or oil flow", "Oil cooler and flow components"],
              ["Thermal response becomes slower", "Flow or thermal capacity has changed", "Circulation is degraded, or the sensor needs a check", "Coolant circuit, thermostat, and a sensor check"],
            ]}
          />
        </section>

        <section className="dash-card">
          <h2>Engine fault or sensor fault</h2>
          <p>One drifted sensor must not order an engine part. If exhaust temperature rises and cylinder pressure, fuel flow, head temperature, and the other cylinders stay normal, the exhaust-temperature sensor rises in the ranking.</p>
          <MapTable
            caption="Channels that can be a sensor fault instead of an engine fault"
            headers={["Channel", "Question before a part is named"]}
            rows={[
              ["Exhaust temperature", "Did cylinder pressure move as well?"],
              ["Manifold pressure", "Do the channels that should share that pressure agree?"],
              ["Manifold temperature", "Does density-sensitive behaviour agree with the reported temperature?"],
              ["Head or coolant temperature", "Did the other thermal channels move with it?"],
              ["Oil pressure", "Did oil temperature, level, and speed make that pressure expected?"],
              ["Oil temperature", "Did the cooler path and the other temperatures move with it?"],
              ["Fuel flow", "Does the commanded delivery agree with the reported flow?"],
              ["Engine speed", "Does the shaft behaviour agree with the reported speed?"],
            ]}
          />
        </section>

        <section className="dash-card">
          <h2>What the crew is asked to do</h2>
          <MapTable
            caption="Monitor, inspect, or replace"
            headers={["State", "When", "Action"]}
            rows={[
              ["Monitor", "The residual is up and nothing else supports it", "Keep watching. Do not schedule a part change."],
              ["Inspect", "The residual is up and supporting evidence agrees", "Schedule the confirmation test."],
              ["Repair or replace", "The residual, the supporting evidence, and a failed confirmation test agree", "Replace or repair the component the test identified."],
            ]}
          />
        </section>

        <section className="dash-card">
          <h2>Illustrative outputs</h2>
          <p>These three cases show the shape of a maintenance output. The rankings are not measured probabilities.</p>
          <MapTable
            caption="Three illustrative maintenance outputs"
            headers={["Case", "Evidence", "Reading", "Next test", "Spares"]}
            rows={[
              ["Cylinder 2 combustion", "Exhaust temperature up, fuel-flow residual up, cylinder pressure down, compression normal, valve lift normal, acoustic level normal", "Injector delivery", "Injector flow test. If it passes, test the ignition.", "Injector assembly and its seals. High priority."],
              ["Cylinder 2 gas exchange", "Exhaust temperature abnormal, pressure residual persistent, fuel and ignition normal, compression still normal, valve lift falling, acoustic level not necessarily high", "Valve train", "Valve-lift measurement, then tappet, pushrod, rocker, and cam lobe", "Tappet at medium to high priority. Pushrod and rocker at medium. Camshaft is less frequent and high criticality."],
              ["Progressive sealing", "Compression down, oil consumption up, blow-by up, exhaust-temperature trend abnormal, pressure amplitude down", "Piston rings or the cylinder", "Differential compression, borescope, oil and filter inspection", "Ring set, and the cylinder, piston, and gaskets if the inspection requires them."],
            ]}
          />
        </section>

        <section className="dash-card">
          <h2>Spares the mechanisms point to</h2>
          <MapTable
            caption="Failure mechanism to stock priority"
            headers={["Mechanism", "Parts", "Stock priority", "Why"]}
            rows={[
              ["Spark degradation", "Spark plugs", "High", "Accessible service part"],
              ["Ignition lead", "Leads and connectors", "High", "Small replaceable part"],
              ["Injector", "Injector and seals", "High", "Direct effect on combustion, and a modular replacement"],
              ["Valve leakage", "Intake or exhaust valve, seals, seat-related parts", "Medium to high", "Needs cylinder-head work"],
              ["Valve-guide wear", "Guide and seals", "Medium", "Deeper maintenance"],
              ["Hydraulic tappet", "Tappet", "Medium to high", "A strong candidate when valve lift falls"],
              ["Cam-lobe wear", "Camshaft", "Low quantity, high criticality", "Less frequent, and it can stop the engine"],
              ["Pushrod", "Pushrod assembly", "Medium", "Can reduce valve lift"],
              ["Rocker", "Rocker, bushing, or shaft", "Medium", "Valve-train wear"],
              ["Piston rings", "Ring set", "Medium", "Follows progressive compression loss"],
              ["Cylinder wear", "Cylinder assembly", "Low quantity, high criticality", "A larger maintenance event"],
              ["Valve seat", "Seat or head repair", "Low", "Usually a shop repair"],
              ["Bearings", "Main or rod bearings", "Low quantity, critical", "Usually a deeper overhaul"],
              ["Oil restriction", "Filters, strainers, seals", "High", "Common service items"],
              ["Oil pump", "Pump parts or the assembly", "Low to medium", "Important, not necessarily frequent"],
              ["Cooling", "Thermostat, valves, seals, or pump-related parts, depending on the installation", "Medium", "Depends on the cooling layout"],
              ["Oil leak", "Gaskets, O-rings, seals", "High", "Common and inexpensive"],
              ["Propeller or load vibration", "Propeller service parts", "Low to medium", "Not necessarily an internal engine fault"],
              ["Engine mount", "Mount and bushings", "Medium", "Can look like a rough-running engine"],
            ]}
          />
        </section>

        <section className="dash-card">
          <h2>First slice</h2>
          <p>The first demonstrable path uses exhaust temperature, cylinder pressure, fuel flow, speed, manifold pressure, and vibration or acoustic level. Five mechanisms are enough before the rest of the list.</p>
          <MapTable
            caption="Mechanisms in the first slice, then the later ones"
            headers={["Order", "Mechanism"]}
            rows={[
              ["1", "Injector degradation"],
              ["2", "Ignition degradation"],
              ["3", "Valve-train degradation"],
              ["4", "Valve or cylinder sealing"],
              ["5", "Sensor fault"],
              ["Later", "Cooling, lubrication, piston and ring wear, bearings, then propeller, mount, and other rotating-system faults"],
            ]}
          />
        </section>
      </div>
    </main>
  );
}
