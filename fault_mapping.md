# Aero-Piston Engine Digital Twin — Fault → Component → Maintenance → Inventory Mapping

## Purpose

This document converts digital-twin abnormalities into **component-level maintenance and inventory decisions**.

The intended logic is:

```text
PHYSICS MODEL RESIDUAL
        ↓
Observed abnormal trend
        ↓
Operating-condition normalization
(RPM, MAP, altitude, ambient T, fuel flow, load)
        ↓
Supporting evidence
(EGT / CHT / oil P-T / cylinder pressure / vibration / acoustic)
        ↓
Failure mechanism
        ↓
Physical component
        ↓
Inspection / confirmation test
        ↓
Repair / replacement
        ↓
Inventory item
```

The objective is **not** to create a simplistic mapping such as:

> High EGT → check cooling system.

Instead, the digital twin should reason:

> High EGT + abnormal cylinder pressure + normal acoustic signature + normal fuel command + abnormal valve-lift signature → increase probability of valve-train degradation → inspect tappet/pushrod/rocker/cam → stock the relevant service parts according to criticality.

---

# 1. Evidence and confidence classification

Every diagnostic relationship should be tagged according to the strength of its source.

| Label | Meaning |
|---|---|
| **FAA-PUBLISHED** | Explicitly supported by FAA troubleshooting, maintenance, or engine-operation guidance |
| **OEM-PUBLISHED** | Supported by applicable Rotax documentation, parts information, maintenance documentation, or service information |
| **ENGINEERING-INFERENCE** | Mechanically/thermodynamically reasonable inference from the measured signature; must be validated against the specific engine and OEM maintenance documentation |
| **MODEL-ASSUMED** | An assumption introduced specifically for the digital-twin model and not claimed to be a published engine fact |

### Important limitation

FAA guidance is generalized maintenance guidance. It does **not** replace the applicable manufacturer's maintenance manual.

For an actual Rotax 916 iS installation, the applicable Rotax maintenance documentation, service instructions, engine serial number, installed configuration, and authorized maintenance procedures take precedence.

This project is a **research/hackathon digital twin**, not a certified airworthiness or maintenance decision system.

---

# 2. Diagnostic philosophy

A sensor abnormality should not directly determine a replacement part.

Instead:

```text
Sensor/model abnormality
        ↓
Normalize for operating condition
        ↓
Find supporting evidence
        ↓
Generate competing hypotheses
        ↓
Rank failure mechanisms
        ↓
Map mechanism → physical component
        ↓
Select confirmation test
        ↓
Maintenance action
        ↓
Inventory requirement
```

The key idea is:

> **One symptom can have several physical causes, so supporting evidence is required before assigning a component-level diagnosis.**

---

# 3. Core maintenance-inference table

## 3.1 Combustion / cylinder / valve-train faults

| Digital-twin abnormality | Supporting physical evidence | Most likely mechanism | Component(s) to inspect first | Confirmation test | Likely maintenance action | Inventory relevance |
|---|---|---|---|---|---|---|
| **EGT ↑ on one cylinder + cylinder pressure ↓** | CHT may decrease/oscillate; power contribution decreases; EGT becomes abnormal | Incomplete/late combustion or loss of compression | Exhaust valve, valve seat, valve guide, valve train, piston/rings | Differential compression + valve leakage test | Repair cylinder head/valve or replace affected components | Cylinder-head/valve consumables |
| **EGT ↑ + weak/late heat-release signature + compression normal** | Fuel flow may be normal; no strong mechanical vibration | Ignition/combustion-phasing problem | Spark plug, ignition lead/coil/ignition module | Ignition-system test / plug inspection | Replace defective ignition component | Spark plugs + ignition consumables |
| **EGT ↓ sharply + cylinder pressure/IMEP ↓** | RPM may fall or fluctuate; cylinder contribution falls | Cylinder misfire / no combustion | Injector/fuel delivery or ignition | Injector/fuel-flow test + ignition test | Replace injector/ignition component depending on test | Injector + ignition spares |
| **EGT ↑ + fuel flow ↑ + cylinder pressure ↓** | Richer command but poor work extraction | Poor combustion efficiency / compression loss | Valve sealing, piston/rings, cylinder | Compression + leak-down | Cylinder repair/overhaul | Cylinder/valve/ring stock |
| **EGT ↓ + fuel flow ↓ for one cylinder** | Injector command may remain normal while inferred fuel delivery falls | Injector restriction / fuel-delivery degradation | Injector, injector filter/orifice, fuel-rail branch | Injector flow test | Clean/replace injector | Injectors |
| **EGT oscillatory + pressure oscillatory + RPM fluctuation** | Strong cycle-to-cycle variation | Intermittent misfire | Ignition plug/lead/coil; injector | Cylinder contribution test / ignition and injector tests | Replace failed ignition/fuel component | High-priority fast-moving spares |
| **EGT abnormal + pressure abnormal + no acoustic/vibration signature** | Mechanical noise not elevated | Combustion or gas-exchange fault more likely than gross mechanical imbalance | Injector, ignition, valve sealing | Compression + injector + ignition tests | Component-specific repair | Injector/plug/valve parts |
| **EGT abnormal + pressure abnormal + valve-lift signature reduced** | Intake/exhaust flow reduction; possible cylinder filling loss | Cam lobe/tappet/lifter wear | Camshaft + tappet/lifter + pushrod/rocker interface | Measure valve lift / inspect cam and tappet | Replace damaged valve-train components according to OEM procedure | Cam/tappet assembly |
| **Pressure trace progressively deteriorates over many cycles + no sudden event** | Metal/debris may appear in oil trend | Progressive valve-train wear | Cam lobe/tappet/lifter | Valve-lift measurement + oil/filter inspection | Replace worn valve-train components | Cam/tappet stock |
| **Compression ↓ progressively + oil consumption ↑** | Blow-by ↑; crankcase contamination may increase | Piston-ring/cylinder wear | Piston rings, cylinder wall, piston | Differential compression + borescope + oil analysis | Replace rings / recondition cylinder as permitted | Ring sets + cylinder assemblies |
| **Compression ↓ + leakage through exhaust** | EGT abnormal; exhaust-side thermal signature changes | Exhaust-valve/seat leakage | Exhaust valve + seat + guide | Leak-down listening at exhaust | Valve/seat repair | Exhaust valves/seats |
| **Compression ↓ + leakage through intake** | Intake-flow anomaly | Intake-valve/seat leakage | Intake valve + seat + guide | Leak-down listening at intake | Valve/seat repair | Intake valves/seats |
| **Compression ↓ + crankcase leakage** | Oil consumption/blow-by ↑ | Ring/cylinder sealing failure | Piston rings / piston / cylinder | Leak-down at crankcase + borescope | Ring/cylinder repair | Ring sets / piston / cylinder |
| **Valve-lift ↓ but ignition/fuel signals normal** | EGT/pressure degradation follows valve event | Valve-train geometry degradation | Camshaft → tappet → pushrod → rocker | Measure actual valve lift | Replace damaged valve-train part | Tappets + pushrods; camshaft lower-frequency stock |

### FAA grounding

FAA troubleshooting material identifies low cylinder compression, faulty ignition, defective spark plugs, ignition wires, incorrect valve clearance, and related causes among possible causes of low power or uneven running.

The important design principle for this project is not to copy a single FAA symptom table directly, but to use it as the **maintenance-logic foundation** and add higher-resolution digital-twin evidence.

---

# 4. Detailed example: abnormal EGT + abnormal pressure + no acoustic signal

Consider:

```text
EGT = abnormal
        ↓
Cylinder pressure = abnormal
        ↓
Acoustic signal = normal
        ↓
RPM/load = approximately normal
```

Do **not** immediately conclude:

```text
Misfire → replace spark plug
```

Instead, construct competing hypotheses.

## Hypothesis ranking

| Rank | Hypothesis | Why? | Evidence that strengthens it | Maintenance target |
|---:|---|---|---|---|
| 1 | **Partial/intermittent combustion failure** | EGT and pressure both affected | Cycle-to-cycle pressure variation | Injector / ignition |
| 2 | **Valve sealing problem** | Pressure loss can produce EGT abnormality without strong mechanical noise | Low compression + leakage through intake/exhaust | Valve/seat/guide |
| 3 | **Valve-train lift degradation** | Reduced lift changes cylinder filling and pressure evolution | Reduced valve lift / abnormal valve-event timing | Cam/tappet/pushrod/rocker |
| 4 | **Injector delivery degradation** | Changes combustion energy without requiring mechanical noise | Injector command normal but inferred fuel delivery/EGT abnormal | Injector |
| 5 | **Ignition degradation** | Can cause late/weak combustion and EGT anomaly | Ignition test identifies weak spark | Plug/lead/coil/module |

---

# 5. When should CAM/TAPPET become a strong hypothesis?

A particularly useful diagnostic chain is:

```text
EGT abnormal
       │
       ├── Fuel delivery abnormal? ── YES → injector branch
       │
       └── NO
            │
            ↓
       Pressure residual abnormal
            │
            ├── Cycle-to-cycle? ── YES
            │       ↓
            │    ignition / injector
            │
            └── Persistent
                    ↓
             Compression abnormal?
                    │
              ┌─────┴─────┐
             YES          NO
              │             │
              ↓             ↓
       valve/ring       valve-train
       investigation    investigation
                            │
                            ↓
                     Valve lift reduced?
                            │
                           YES
                            ↓
                     CAM / TAPPET /
                     PUSHROD / ROCKER
```

### Important correction

A persistent abnormal cylinder-pressure trace does **not by itself identify misfire**.

A better inference is:

```text
Persistent pressure abnormality
+
EGT abnormality
+
normal fuel command
+
normal ignition indicators
+
normal compression
+
reduced valve-lift / altered gas-exchange signature
        ↓
CAM / TAPPET / VALVE-TRAIN hypothesis
```

Whereas:

```text
Pressure abnormality
+
EGT abnormality
+
cycle-to-cycle variability
+
normal compression
+
normal valve lift
        ↓
MISFIRE hypothesis
        ↓
Injector / ignition
```

And:

```text
Pressure abnormality
+
compression loss
        ↓
Cylinder sealing / valve leakage
        ↓
Valve / seat / guide / rings / cylinder
```

This distinction is important for a defensible digital twin.

---

# 6. Mechanical fault → inventory component mapping

The diagnostic model can be inverted to determine which spare parts should be stocked.

| Failure mechanism inferred | Parts likely consumed during maintenance | Stock priority | Reasoning |
|---|---|---:|---|
| Spark degradation | Spark plugs | **HIGH** | Accessible, replaceable service component |
| Ignition lead failure | Ignition leads/connectors | **HIGH** | Small, replaceable component |
| Injector degradation | Injector + associated seals | **HIGH** | Direct combustion effect and modular replacement |
| Valve leakage | Intake/exhaust valve, seals, seat-related parts | **MED-HIGH** | Requires cylinder-head work |
| Valve-guide wear | Valve guide + associated seals | **MED** | Deeper maintenance |
| Hydraulic tappet degradation | Hydraulic tappet/lifter | **MED-HIGH** | Strong candidate when valve lift deteriorates |
| Cam-lobe wear | Camshaft | **LOW quantity / HIGH criticality** | Less frequent but potentially engine-down |
| Pushrod damage | Pushrod assembly | **MED** | Can produce reduced valve lift |
| Rocker wear | Rocker arm/bushing/shaft | **MED** | Valve-train degradation |
| Piston-ring wear | Ring set | **MED** | Associated with progressive compression loss |
| Cylinder wear/damage | Cylinder assembly | **LOW quantity / HIGH criticality** | Larger maintenance event |
| Valve-seat damage | Seat/cylinder-head repair | **LOW** | Usually maintenance-shop intervention |
| Bearing degradation | Main/rod bearings | **LOW quantity / CRITICAL** | Usually deeper overhaul |
| Oil-system restriction | Filters/strainers/seals | **HIGH** | Relatively common service items |
| Oil-pump degradation | Oil-pump components/assembly | **LOW-MED** | Important but not necessarily high-frequency |
| Cooling degradation | Thermostat/valves/seals/pump-related components depending on architecture | **MED** | Architecture-specific |
| Excessive oil leakage | Gaskets/O-rings/seals | **HIGH** | Cheap and commonly consumed |
| Propeller/load-induced vibration | Propeller-related service components | **LOW-MED** | Not necessarily an internal engine fault |
| Engine-mount degradation | Mount/bushings | **MED** | Can produce rough-running/vibration symptoms |

**Stock priority is an engineering inventory classification, not a published FAA or Rotax value.**

---

# 7. Oil-system diagnostic table

Oil trends are particularly useful because they can distinguish lubrication-system faults from internal mechanical wear.

| Digital-twin trend | Supporting evidence | Likely physical mechanism | Inspect | Potential replacement |
|---|---|---|---|---|
| Oil pressure ↓ progressively | Oil temperature ↑ | Oil viscosity/flow problem | Oil level, filter, lines, relief valve | Filter/relief-valve components |
| Oil pressure ↓ + metal particles ↑ | Bearing temperature/engine vibration may ↑ | Bearing wear | Oil/filter debris + bearing inspection | Bearings / overhaul |
| Oil pressure ↓ + oil level normal | No external leak | Pump/relief/suction problem | Oil pump, relief valve, suction path | Pump/relief components |
| Oil temperature ↑ + oil pressure ↓ | Heat rejection degraded | Oil cooler/flow problem or internal friction | Oil cooler, oil lines, thermostat/flow control | Cooler/thermostat/seals |
| Oil temperature ↑ + oil consumption ↑ | Blow-by ↑ | Ring/cylinder degradation | Compression + borescope | Rings/cylinder |
| Oil consumption ↑ + pressure normal | External leak possible | Seal/gasket failure | Visual leak inspection | Gasket/O-ring/seal |
| Oil consumption ↑ + blow-by ↑ | Compression ↓ | Ring/cylinder wear | Differential compression | Rings/piston/cylinder |
| Oil pressure oscillatory | RPM correlation | Relief-valve/pump/suction instability | Relief valve, pump, suction path | Relief valve/pump parts |

### Important modeling point

Oil pressure and oil temperature should be interpreted relative to:

- RPM
- engine load/MAP
- ambient temperature
- oil temperature
- engine warm-up state
- oil level
- operating duration

A fixed threshold alone can generate false maintenance alerts.

---

# 8. Cooling / thermal diagnostic table

This section maps your existing cooling-degradation model to physical maintenance targets.

| Model trend | Supporting evidence | Physical interpretation | Maintenance target |
|---|---|---|---|
| CHT/T_head ↑ + coolant temperature ↑ | Oil T normal | Reduced coolant heat rejection | Radiator / coolant flow / thermostat |
| CHT ↑ + coolant temperature relatively normal | Localized cylinder/head thermal problem | Head-side heat transfer / coolant passage / local flow | Cylinder head/cooling passage |
| CHT ↑ + oil T ↑ | Both thermal systems affected | High total heat-rejection requirement or poor airflow | Cooling airflow / radiator / oil cooler |
| CHT ↑ mainly at high power | Low-power operation normal | Insufficient cooling capacity under load | Radiator/airflow/coolant-flow capacity |
| CHT ↑ with increasing ambient temperature | Strong ambient correlation | Reduced heat-rejection margin | Cooling capacity/airflow |
| CHT ↑ + inferred coolant flow ↓ | Direct model evidence | Pump/flow restriction | Pump/flow path/thermostat |
| CHT ↑ + coolant flow normal + radiator ΔT abnormal | Flow exists but heat rejection poor | Radiator degradation/blockage/air-side problem | Radiator |
| Oil T ↑ + coolant system normal | Thermal load concentrated in lubrication path | Oil cooler/airflow/oil flow issue | Oil cooler/flow components |
| Thermal response time becomes slower | Flow/thermal capacitance changed | Degraded circulation or altered thermal response | Coolant circuit / thermostat / sensor validation |

### Important distinction

These are primarily **engineering-inference mappings** for the digital twin.

They should not be represented as exact FAA statements such as:

> "FAA says this sensor signature means radiator failure."

Instead:

> "The model interprets this combination as being more consistent with radiator/air-side degradation, subject to confirmation."

---

# 9. Vibration/acoustic signals as discriminators

Acoustic or vibration data should be used as a **hypothesis discriminator**, not as an absolute gate.

Do not use:

```text
No acoustic signal → mechanical fault impossible
```

Use:

```text
No acoustic signature
        ↓
Reduce probability of faults expected to produce strong mechanical excitation
        ↓
Do not eliminate mechanical faults
```

## Example diagnostic combinations

| Signal combination | Interpretation |
|---|---|
| Pressure abnormal + EGT abnormal + **acoustic high** | Mechanical/valvetrain hypothesis rises |
| Pressure abnormal + EGT abnormal + **acoustic normal** | Combustion/fuel/ignition hypothesis rises |
| Pressure abnormal + EGT abnormal + **valve-lift residual** | Cam/tappet hypothesis rises strongly |
| Pressure abnormal + **compression loss** | Valve/ring/cylinder hypothesis rises |
| EGT abnormal + pressure normal + fuel-flow residual | Injector/fuel-system hypothesis rises |
| EGT abnormal + pressure normal + ignition residual | Ignition hypothesis rises |
| Vibration ↑ + oil-metal trend ↑ | Bearing/rotating-component hypothesis rises |
| Vibration ↑ + pressure normal + EGT normal | Propeller/gearbox/mount hypothesis rises |

---

# 10. Example digital-twin maintenance outputs

The final system should output **diagnostic reasoning**, not merely a fault label.

## Example 1 — Injector

```text
FAULT:
Cylinder 2 combustion degradation

EVIDENCE:
EGT₂ ↑
Fuel-flow model residual ↑
Cylinder pressure ↓
Compression normal
Valve-lift residual normal
Acoustic residual normal

DIAGNOSIS:
HIGH likelihood → injector delivery degradation

MAINTENANCE:
Inspect injector flow / contamination.
Replace injector if flow test fails.

INVENTORY:
Injector assembly × 1
Associated seals × 1 service set
```

---

## Example 2 — Cam/tappet

```text
FAULT:
Cylinder 2 gas-exchange degradation

EVIDENCE:
EGT₂ abnormal
Cylinder pressure residual persistent
Fuel delivery normal
Ignition residual normal
Compression initially normal
Valve-lift estimate ↓ progressively
Acoustic signal not necessarily elevated

DIAGNOSIS:
HIGH likelihood → valve-train degradation

MAINTENANCE:
Inspect:
1. Tappet/lifter
2. Pushrod
3. Rocker
4. Cam lobe

INVENTORY:
Hydraulic tappet = MEDIUM/HIGH priority
Pushrod = MEDIUM
Rocker/bushing = MEDIUM
Camshaft = LOW frequency / HIGH criticality
```

---

## Example 3 — Piston rings

```text
FAULT:
Progressive cylinder sealing degradation

EVIDENCE:
Compression ↓
Oil consumption ↑
Blow-by ↑
EGT trend abnormal
Pressure amplitude ↓

DIAGNOSIS:
Piston-ring/cylinder wear

MAINTENANCE:
Differential compression
Borescope
Oil/filter inspection

INVENTORY:
Ring set
Cylinder assembly
Piston
Cylinder seals/gaskets
```

---

# 11. Component-level diagnostic ontology

A useful internal representation is:

```text
Observed Trend
    ↓
Abnormal State
    ↓
Failure Mechanism
    ↓
Component
    ↓
Confirmation Test
    ↓
Maintenance Action
    ↓
Inventory Item
```

For example:

```text
EGT₂ ↑
+
P₂ pressure residual ↑
+
fuel command normal
+
ignition normal
+
valve-lift ↓
        ↓
Cylinder 2 gas-exchange degradation
        ↓
Valve-train wear
        ↓
Tappet / cam / pushrod / rocker
        ↓
Valve-lift measurement + visual inspection
        ↓
Replace worn component
        ↓
Tappet / pushrod / rocker / camshaft inventory
```

---

# 12. Probabilistic maintenance inference

The digital twin should eventually avoid a deterministic:

```text
Fault = X
```

architecture.

Instead:

```text
Failure mechanism probability
        ↓
Component probability
        ↓
Maintenance action probability
        ↓
Expected spare demand
```

For example:

| Component | P(failure) | Maintenance action | Inventory priority |
|---|---:|---|---|
| Injector | 0.62 | Inspect → replace if flow test fails | **HIGH** |
| Spark plug | 0.48 | Inspect/test → replace if defective | **HIGH** |
| Hydraulic tappet | 0.31 | Inspect valve lift | **MEDIUM** |
| Camshaft | 0.17 | Inspect only if tappet/lift abnormal | **LOW frequency / HIGH criticality** |
| Exhaust valve | 0.23 | Compression/leak test | **MEDIUM** |
| Piston rings | 0.08 | No immediate replacement; monitor | **LOW** |

These probabilities are **model outputs**, not published Rotax/FAA probabilities.

They must eventually be calibrated using:

- historical maintenance records
- synthetic fault injection
- component-level test data
- teardown findings
- engine-dyno data
- fleet observations

---

# 13. Expected spare demand

Once component failure probabilities are available, the digital twin can connect PHM to logistics.

A simple expected-demand model is:

\[
E[N_i]
=
\sum_{j=1}^{N_{\mathrm{engines}}}
P(\text{component }i\text{ requires replacement}\mid\text{observations}_j)
\]

where:

- \(E[N_i]\) = expected number of component \(i\) required
- \(N_{\mathrm{engines}}\) = fleet population
- \(P(\text{component }i\text{ requires replacement}\mid\text{observations}_j)\) = predicted replacement probability for engine \(j\)

For a fleet:

```text
Digital Twin
     ↓
Health state
     ↓
Failure mechanism probability
     ↓
Component failure probability
     ↓
Remaining-life / maintenance prediction
     ↓
Expected spare demand
     ↓
Inventory optimization
```

This creates a direct:

> **Digital Twin → PHM → Maintenance → Logistics**

architecture.

---

# 14. Why this is better than a conventional fault classifier

A conventional system might produce:

```text
Input:
RPM
EGT
CHT
Oil pressure
Fuel flow
Vibration

        ↓

Neural network

        ↓

MISFIRE
```

That is useful for anomaly detection, but it does not directly answer:

> What does the maintenance crew do next?

Your proposed system instead produces:

```text
Input:
RPM
MAP
EGT
CHT
Fuel flow
Cylinder pressure
Vibration/acoustic
Model residuals
        ↓
Physics baseline
        ↓
Residual pattern
        ↓
Failure-mechanism ranking
        ↓
Component ranking
        ↓
Confirmation test
        ↓
Maintenance action
        ↓
Inventory requirement
```

This is much closer to a **maintenance-oriented digital twin**.

---

# 15. Recommended architecture for the project

The maintenance layer should sit after the physics/health-estimation layer:

```text
                  ┌──────────────────────────┐
                  │       Engine sensors     │
                  │ RPM, MAP, EGT, CHT, Oil │
                  │ P/T, fuel flow, vibration│
                  └────────────┬─────────────┘
                               ↓
                  ┌──────────────────────────┐
                  │      Physics Digital     │
                  │          Twin             │
                  │ Combustion + heat + oil  │
                  │ + crankshaft + cooling   │
                  └────────────┬─────────────┘
                               ↓
                  ┌──────────────────────────┐
                  │       Model residuals    │
                  │ measured - predicted     │
                  └────────────┬─────────────┘
                               ↓
                  ┌──────────────────────────┐
                  │   Health-state estimator │
                  │ degradation parameters   │
                  └────────────┬─────────────┘
                               ↓
                  ┌──────────────────────────┐
                  │ Failure-mechanism layer  │
                  │ misfire / valve / rings │
                  │ injector / cooling etc. │
                  └────────────┬─────────────┘
                               ↓
                  ┌──────────────────────────┐
                  │ Component inference      │
                  │ injector / tappet / cam │
                  │ valve / ring / radiator │
                  └────────────┬─────────────┘
                               ↓
                  ┌──────────────────────────┐
                  │ Confirmation test        │
                  │ compression / flow /     │
                  │ valve lift / ignition    │
                  └────────────┬─────────────┘
                               ↓
                  ┌──────────────────────────┐
                  │ Maintenance action       │
                  │ inspect / repair /       │
                  │ replace / monitor        │
                  └────────────┬─────────────┘
                               ↓
                  ┌──────────────────────────┐
                  │ Inventory prediction     │
                  │ part + quantity +        │
                  │ criticality + lead time  │
                  └──────────────────────────┘
```

---

# 16. Recommended fault families

For the complete ontology, use the following top-level groups.

## Combustion

- Misfire
- Incomplete combustion
- Abnormal combustion phasing
- Excessively rich/lean operation
- Cylinder imbalance

## Fuel system

- Injector restriction
- Injector flow degradation
- Fuel pressure abnormality
- Fuel-pump degradation
- Fuel delivery restriction

## Ignition

- Spark plug degradation
- Ignition lead degradation
- Coil/module degradation
- Ignition timing abnormality

## Valve train

- Valve clearance abnormality
- Valve-seat leakage
- Valve-guide wear
- Hydraulic tappet degradation
- Pushrod damage
- Rocker wear
- Cam-lobe wear
- Camshaft degradation

## Cylinder / piston

- Piston-ring wear
- Cylinder wear
- Piston damage
- Compression loss
- Blow-by

## Lubrication

- Low oil pressure
- High oil temperature
- Oil-flow restriction
- Oil-pump degradation
- Relief-valve problem
- Bearing wear
- Oil leakage
- Excessive oil consumption

## Cooling

- Radiator degradation
- Coolant-flow restriction
- Pump degradation
- Thermostat/flow-control issue
- Air-side cooling degradation
- Oil-cooler degradation

## Rotating / structural

- Propeller imbalance
- Gearbox/drive vibration where applicable
- Engine-mount degradation
- Bearing-related vibration

## Sensors / FADEC

- EGT sensor drift
- CHT/coolant-temperature sensor drift
- MAP sensor drift
- MAT sensor drift
- Oil-pressure sensor drift
- Oil-temperature sensor drift
- Fuel-flow estimation/sensor error
- RPM sensing error

---

# 17. Sensor-fault discrimination

A particularly important feature is separating:

```text
ENGINE FAULT
```

from:

```text
SENSOR FAULT
```

For example:

### Apparent EGT rise

```text
EGT ↑
        ↓
Does cylinder pressure also change?
        │
   ┌────┴────┐
  YES       NO
   │          │
   ↓          ↓
Likely       Check
engine       EGT sensor
effect        consistency
```

If:

```text
EGT₂ ↑
BUT
Cylinder pressure normal
Fuel flow normal
CHT normal
Other cylinders normal
```

then an EGT-sensor problem should rise in the hypothesis ranking.

The same principle applies to:

- MAP
- MAT
- CHT/coolant temperature
- oil pressure
- oil temperature
- RPM
- fuel-flow measurement

This is essential because a digital twin should not order an engine component replacement simply because one sensor has drifted.

---

# 18. Operating-condition normalization

Every trend should be interpreted relative to operating state.

At minimum:

| Variable | Role |
|---|---|
| RPM | Engine speed |
| MAP | Engine intake manifold absolute pressure |
| Ambient pressure | Altitude/loading context |
| Ambient temperature | Thermal and density context |
| Fuel flow | Engine fueling/load indicator |
| Oil temperature | Lubrication/thermal state |
| CHT/coolant temperature | Cylinder/head thermal state |
| Engine load | Mechanical load |
| Time since start | Warm-up/transient state |

For example:

```text
EGT = 850 °C
```

is not inherently a fault.

Instead:

```text
EGT_measured
-
EGT_expected(RPM, MAP, altitude, ambient T, fuel flow, engine state)
=
EGT residual
```

The residual is much more useful for diagnostics.

---

# 19. Diagnostic confidence should combine evidence

A useful conceptual score is:

\[
S_k =
\sum_i w_i\,e_{ik}
\]

where:

- \(S_k\) = diagnostic score for failure mechanism \(k\)
- \(w_i\) = importance/reliability weighting of evidence \(i\)
- \(e_{ik}\) = degree to which evidence \(i\) supports mechanism \(k\)

For example:

```text
Mechanism = valve-train degradation

Evidence:
Pressure residual       → +++
Valve-lift residual     → ++++
Fuel-flow residual      → 0
Ignition residual       → 0
Acoustic residual       → +
Compression loss        → +
Oil-metal trend         → ++
```

This is a conceptual architecture at this stage, not a finalized statistical model.

---

# 20. Maintenance decision logic

The system should distinguish three states:

### Monitor

Evidence is insufficient for maintenance intervention.

```text
Residual ↑
but
no supporting evidence
        ↓
Continue monitoring
```

### Inspect

Evidence is sufficiently strong to justify a confirmation test.

```text
Residual ↑
+
supporting evidence
        ↓
Schedule inspection/test
```

### Replace/repair

The confirmation test establishes the physical failure.

```text
Residual ↑
+
supporting evidence
+
confirmation test failed
        ↓
Replace/repair component
```

This avoids turning model uncertainty into unnecessary maintenance.

---

# 21. Critical distinction: detection vs diagnosis vs maintenance

These should remain separate layers.

| Layer | Question |
|---|---|
| **Detection** | Is the engine behaving abnormally? |
| **Diagnosis** | What failure mechanism best explains the abnormality? |
| **Localization** | Which physical component is most likely responsible? |
| **Confirmation** | What physical test should verify the diagnosis? |
| **Maintenance decision** | Inspect, monitor, repair, or replace? |
| **Inventory decision** | Which part should be stocked and in what quantity? |

The digital twin becomes significantly more useful when it reaches the last two layers.

---

# 22. FAA/OEM foundation

The FAA engine-operation and maintenance material supports the general troubleshooting philosophy that:

1. Engine symptoms should be investigated systematically.
2. Operating condition/power setting helps narrow the malfunction.
3. Instrument readings provide diagnostic evidence.
4. Multiple possible physical causes should be considered.
5. Troubleshooting should eventually identify the defective component and corrective action.

FAA Chapter 10 also provides examples connecting symptoms to physical causes and maintenance actions involving:

- ignition components
- spark plugs
- ignition wires
- cylinder compression
- valve clearance
- oil strainers
- oil gauges
- oil-pressure relief valves
- oil passages
- oil pumps
- bearings
- piston rings
- seals
- engine mounts/bushings

For this project, those FAA relationships form the **maintenance reasoning foundation**, while the physics digital twin adds more detailed continuous evidence.

---

# 23. Rotax-specific component consideration

For a Rotax-family engine, the valve-train hypothesis is physically meaningful because the manufacturer's parts documentation includes components such as:

- hydraulic valve tappets
- pushrods
- rocker arms
- valve guides
- camshaft assemblies

Therefore, a diagnostic branch such as:

```text
Pressure abnormal
+
EGT abnormal
+
fuel/ignition evidence normal
+
valve-lift residual abnormal
        ↓
Valve-train hypothesis
        ↓
Tappet / pushrod / rocker / cam inspection
```

is mechanically plausible.

However, **the exact failure modes, service limits, inspection criteria, allowable wear, and replacement procedure must come from the applicable Rotax maintenance documentation**.

---

# 24. What should NOT be claimed

Avoid statements such as:

> "High EGT proves injector failure."

Instead:

> "High EGT increases the probability of an injector/fueling or combustion-related issue when supported by the corresponding fuel-flow and cylinder-pressure residuals."

Avoid:

> "No acoustic signal means the camshaft is fine."

Instead:

> "A normal acoustic signature reduces the likelihood of faults expected to produce strong mechanical excitation but does not eliminate valve-train degradation."

Avoid:

> "The FAA says this exact sensor combination means a bad tappet."

Instead:

> "The FAA provides the general troubleshooting relationship; the sensor-combination-to-tappet inference is an engineering extension of that logic and requires validation."

---

# 25. Recommended final digital-twin output

For each detected anomaly, the dashboard should ideally show:

```text
ENGINE HEALTH
────────────────────────────
Cylinder: 2

Abnormality:
Combustion/gas-exchange degradation

Confidence:
72%

Top hypotheses:
1. Injector degradation        41%
2. Ignition degradation       27%
3. Valve-train degradation    21%
4. Valve leakage               8%
5. Sensor fault                3%

Supporting evidence:
✓ EGT₂ residual
✓ Cylinder-pressure residual
✓ Fuel command normal
✓ Acoustic residual normal
✓ Valve-lift residual elevated

Recommended next test:
Injector flow test

If injector passes:
→ ignition test

If ignition passes:
→ compression/leak-down test

If compression passes:
→ valve-lift / valve-train inspection

Likely maintenance parts:
Injector — HIGH priority
Spark plug — HIGH priority
Hydraulic tappet — MEDIUM priority
Pushrod — MEDIUM priority
Camshaft — LOW-frequency / HIGH-criticality
```

This is the level of output that connects the physics model to actual maintenance operations.

---

# 26. Recommended inventory representation

For every physical component, maintain:

| Field | Description |
|---|---|
| `component_id` | Internal component identifier |
| `component_name` | Physical component |
| `failure_mechanisms` | Failure mechanisms associated with the component |
| `diagnostic_signatures` | Residual/trend signatures supporting the component |
| `confirmation_tests` | Tests that should be performed |
| `maintenance_action` | Inspect / repair / replace |
| `replacement_frequency` | Historical/model-estimated frequency |
| `criticality` | Consequence of component unavailability |
| `lead_time` | Procurement lead time |
| `stock_level` | Current stock |
| `minimum_stock` | Minimum desired inventory |
| `engine_down_if_missing` | Whether absence causes prolonged engine downtime |
| `confidence` | Confidence in mapping |
| `source_class` | FAA / OEM / engineering inference / assumption |

This gives you a clean bridge from engineering diagnosis to inventory optimization.

---

# 27. Thin vertical slice recommended for the hackathon

Do **not** implement all 30–50 failure modes initially.

The first demonstrable vertical slice should be:

```text
EGT
+
cylinder pressure
+
fuel flow
+
RPM/MAP
+
vibration/acoustic
        ↓
Physics residual
        ↓
Combustion abnormality
        ↓
3 competing hypotheses
        ↓
Injector / ignition / valve-train
        ↓
Confirmation test
        ↓
Component
        ↓
Inventory recommendation
```

I would initially implement only:

1. **Injector degradation**
2. **Ignition degradation**
3. **Valve-train degradation**
4. **Valve/cylinder sealing degradation**
5. **Sensor fault**

Then expand to:

6. Cooling degradation  
7. Lubrication degradation  
8. Piston/ring wear  
9. Bearing degradation  
10. Propeller/mount/rotating-system faults  

This keeps the hackathon prototype explainable and prevents an enormous rule base from being built before the core physics-to-maintenance pathway works.

---

# 28. Final architecture concept

The central concept for the project should be:

```text
                 PHYSICS
                    │
                    ▼
          ┌──────────────────┐
          │ Digital Twin     │
          │ predicted state  │
          └────────┬─────────┘
                   │
                   ▼
          ┌──────────────────┐
          │ Residual Engine  │
          │ measured-predicted│
          └────────┬─────────┘
                   │
                   ▼
          ┌──────────────────┐
          │ Health Estimator │
          │ degradation      │
          └────────┬─────────┘
                   │
                   ▼
          ┌──────────────────┐
          │ Fault Mechanism  │
          │ Diagnosis        │
          └────────┬─────────┘
                   │
                   ▼
          ┌──────────────────┐
          │ Component        │
          │ Localization     │
          └────────┬─────────┘
                   │
                   ▼
          ┌──────────────────┐
          │ Confirmation     │
          │ Test             │
          └────────┬─────────┘
                   │
                   ▼
          ┌──────────────────┐
          │ Maintenance      │
          │ Action           │
          └────────┬─────────┘
                   │
                   ▼
          ┌──────────────────┐
          │ Spare Parts /    │
          │ Inventory        │
          └──────────────────┘
```

The key innovation is therefore not simply:

> **"AI predicts an engine fault."**

It is:

> **"The digital twin identifies a physically interpretable degradation signature, ranks the mechanisms capable of producing it, recommends the maintenance test that can discriminate between them, localizes the likely component, and converts that diagnosis into a spare-parts requirement."**

---

# 29. Source notes

The following source families should be checked against the latest applicable revisions before being used as formal references in the final project:

- **FAA AMT Powerplant Handbook, Chapter 10 — Engine Operation, Inspection, Maintenance, and Troubleshooting**
- **FAA AC 20-105 — Reciprocating Engine Power-Loss Trend Monitoring**
- **Rotax 912 iS / 915 iS / 916 iS applicable maintenance documentation**
- **Rotax Illustrated Parts Catalog / parts documentation**
- Applicable engine-specific maintenance manuals and service instructions

For the final report/presentation, cite the **exact document revision and page/equation/table number** rather than relying on a generic web citation.

---

# 30. Key takeaway

The final diagnostic relationship should be:

```text
TREND
  ↓
CONTEXT
  ↓
SUPPORTING CONDITION
  ↓
FAILURE MECHANISM
  ↓
COMPONENT
  ↓
CONFIRMATION TEST
  ↓
MAINTENANCE ACTION
  ↓
SPARE PART
```

For example:

```text
EGT abnormal
+
persistent cylinder-pressure abnormality
+
normal acoustic signature
+
normal fuel command
+
normal ignition indicators
+
reduced valve lift
        ↓
Valve-train degradation
        ↓
Tappet / pushrod / rocker / cam
        ↓
Valve-lift measurement + physical inspection
        ↓
Replace failed component
        ↓
Update tappet/pushrod/rocker/cam inventory demand
```

This is the bridge between the **physics-based digital twin**, **PHM**, **maintenance decision support**, and **inventory planning**.
