# Twin modules — technical context

Context for another agent consuming this chat.
Not a pitch. Not a slide deck. Not marketing.

The parent system is the UAV piston-engine digital twin already specified
in UAV_Engine_Digital_Twin_Pipeline (Stages 0 through 11).
Three assigned tasks sit on that pipeline. They are not a second product.

1. Anomaly detection
2. Mission profile simulation, including live mission bias
3. Fleet architecture, including a federated fallback

This file records how those three were specified, what is locked, what
was rejected, and what is still open.

---

## 0. Parent pipeline (do not reinvent)

Stage 0   plant F(w, theta), calibration, injection library, known-good
Stage 1   live ingest of the eight channels plus w
Stage 2   UKF-ready state (theta walk when enabled)
Stage 3   measurement prediction and residual
Stage 4   detectors
Stage 5   health index
Stage 6   isolation / signature table
Stage 7   theta / HI publish
Stage 8   RUL
Stage 9   advisory
Stage 10  downlink
Stage 11  GCS replay / feedback into Stage 0

EM = Stages 0-10 as executable code plus pack artefacts.
IM = ground language model. Tools only. No closed loop on theta or RUL.

---

## 1. Locked identities

Operating conditions w are measured or commanded.
Health parameters theta are wear.

    xhat      = F(w, theta)
    xhat_used = xhat + b(profile)
    r         = x_s - xhat_used

b is applied to predicted sensors only.
b is not added to w.
b is not added to theta.
b is frozen from preflight until landing.
Unknown or missing profile => b = 0.

Cap ||b|| so a large bias cannot hide a failed engine.
Order-of-magnitude cap discussed: 10-15 C on CHT. Not calibrated.

When a UKF is present:

    theta(t) = theta(t-1) + xi(t),   xi ~ N(0, Q)
    x_s      = F(w, theta) + eps,    eps ~ N(0, R)

Residual used for detection is the innovation after the sigma-point
mean, not a point-to-point subtract across sigma points.

R is estimated from repeatability at a fixed operating point or from
sensor datasheets. Do not set R to the variance of CHT across mixed
missions and climates.

Q must not be inflated to swallow a missing b. If residuals are large
because the mission label is wrong, fix the label or F, not Q.

CUSUM (thermal and oil heads only):

    S(t) = max(0, S(t-1) + r_group(t) - slack)
    trip if S(t) > H
    drain toward 0 when r_group is inside the healthy band

Not a lifetime integral.
Not applied to slam-throttle spikes.
Slack and H are unset.

Roughness (mech head and fast path):

    L_k = (omega_max - omega_min) / omega_avg

Window approximately half a revolution. Compute at high rate.
Do not low-pass L_k over minutes.

---

## 2. Channels

Eight live channels used as x_s (hackathon list):

- RPM
- CHT
- EGT
- oil pressure
- oil temperature
- fuel flow
- vibration
- battery / alternator / bus
- injection timing

(The spoken "eight" sometimes folds oil P and T together.)

w includes at least:

- MAP / boost
- OAT
- pressure altitude / p_amb
- throttle or commanded load
- ram-air when the airframe provides it
- intake temperature when present

theta candidates when the UKF exists (formulae not frozen):

- cooling effectiveness / UA multiplier
- injector or volumetric-efficiency style knob
- FMEP / friction offset
- electrical / charging health

Until theta formulae exist, detect on r of the eight versus healthy F.
Do not block misfire detection on theta-hat.

---

## 3. Task 1 — Anomaly detection

### 3.1 Placement

Stages 4-6 of the parent twin.
A fast path runs in parallel with Stage 4.
This task does not replace F.
This task does not replace the UKF.

### 3.2 Layer 0 — envelope

Compare live oil P/T, EGT, MAP, and time-at-takeoff-RPM to the OEM
hard limits. Use the OEM limit pack.

Out of envelope => LAND NOW.
No call to F.
No call to b.
No call to the hub.
No call to the IM.

### 3.3 Layer 1 — plant residual

Onboard F is the cycle-average / mean-value reduction of the team
crank-angle ODEs plus the lumped thermal network from the overheating
poster.

Do not integrate Hohenberg or Woschni at crank angle on the UAV.
Ground replay may run the higher-rate plant.

Compute r only after b is applied to xhat.

### 3.4 Layer 2 — partitioned heads

Thermal
- Channels: CHT, coolant if present, oil temperature.
- Plant: lumped thermal network (Woschni or Hohenberg wall heat
  already baked into cycle-average Q_wall, then UA lumps).
- Method: in-control band on r_heat, plus CUSUM on slow slope.
- Clock: minutes to hours.
- Trip name: cooling / overheat / soak.

Burn / fuel
- Channels: EGT, fuel flow, injection timing.
- Plant: cycle-average heat release from Wiebe or premix/diffusion
  ODEs, reduced to expected EGT and fuel.
- Method: magnitude of r versus a model scale; signature table when
  the pattern is known.
- Clock: seconds to minutes.
- Trip name: injector / mixture.

Mech
- Channels: vibration, crank speed.
- Plant: mean-value shaft equation
      J * d(omega)/dt = T_ind - T_fric - T_load
  with T_ind from cycle integral p dV, T_fric from FMEP line.
- Method: L_k on a half-revolution window.
- Clock: 1-2 seconds.
- Trip name: misfire / torque hole.
- A misfire is a hole in torque. It is not a Hohenberg flag.

Lube
- Channels in air: oil pressure, oil temperature.
- Plant: FMEP / viscosity map (Walther + fuel dilution as in
  lubrication.py).
- Method: r versus the map at current RPM and oil T.
- Clock: about 1 Hz.
- Trip name: lubrication.
- Sommerfeld number and min film h0 are ground-only. They need a load
  assumption that is not a live gauge. Do not run h0 at 1 kHz on edge.

Open set
- Channels: the full residual vector r.
- Method: one-class or reconstruction model trained only on known-good
  r (after b). High reconstruction error => unnamed unknown.
- Clock: when no named head trips.
- This head does not isolate a component.

Fast path
- Channels: L_k, EGT split across pipes if available, vib RMS.
- Method: change detector. Hold-on timer 1.5-3 s is debounce, not
  physics.
- Clock: 1-2 seconds.
- Trip name: misfire / knock.
- Does not wait for theta-hat.
- Livengood-Wu integral is optional and offline unless live P and T
  are trusted. The misfire.py demo held P and T constant; do not treat
  that as a flight plant.

### 3.5 Layer 3 — isolation

| Evidence | Isolation |
| --- | --- |
| OEM limit | LAND NOW |
| thermal band or CUSUM | cooling / soak |
| hot EGT + odd fuel, heads quieter | injector / mixture |
| high L_k + EGT hole | misfire |
| oil map trip | lube |
| only one channel moves | sensor |
| no named head, r still foreign | unknown |

Signature table is the piston analogue of the turbofan cause-symptom
chart. It is empty until F's influence of each theta on the eight is
written down. Until then isolation is stub rules plus unknown.

Flags clear when the driving signal recovers, except LAND NOW, which
is a crew / GCS decision.

### 3.6 CUSUM notes

Input is the grouped residual after b, not raw CHT.
Subtract slack so healthy jitter does not accumulate.
Reset or leak S toward 0 inside the band.
Do not feed slam-window residuals into S.
Do not share one CUSUM across thermal and mech.

### 3.7 v1 versus later

v1 implements: Layer 0, F+b residual, bands, CUSUM, L_k, stub
signatures, unknown bin.

Later may add: UKF theta as extra features on thermal and lube heads,
a fitted one-class model, regime-conditional thresholds.

Mahalanobis distance of r against innovation covariance S was
discussed and parked. Do not implement unless a later instruction
reopens it.

### 3.8 Rejected for this task

A single supervised net on raw x_s as the only detector.
Copying turbofan GPA, VIGV, VSV, or CMAPSS DNN rows from the survey
table as v1.
Synthetic feature buses from misfire.py (EGT_res = 70 if trigger).
Blocking fast detection on hub connectivity.

---

## 4. Task 2 — Mission profiles and bias

### 4.1 Role

Not four extra plants.
Two uses of the same machinery:

- Simulation: Stage 0.3-0.4 input tapes into F.
- Live: a profile label that selects b.

### 4.2 Four owners

High altitude
- Change w: pressure altitude, p_amb, MAP the turbo can hold at that
  altitude, ram-air consistent with the airframe.
- Hold theta at healthy.
- Do not invent a slam-specific b.
- Healthy r after b should be small. Remaining climb in CHT at
  constant power is cooling, not "forgot we are high."

Hot weather
- Change w: T_amb, T_in.
- Optional: ISA or density-altitude normaliser on atmospheric
  channels.
- Hold theta_cool at healthy.
- F should already predict hotter metal. b is only the systematic
  sliver the lumps miss.
- Do not simulate a hot day by lowering theta_cool. That is a failed
  cooling system.

Endurance
- Change duration and a steady cruise w tape.
- Optional: slow theta random-walk or scheduled walk if the point of
  the run is degradation.
- Hold b constant for the whole loiter.
- Residual may trend. That trend is the Stage 8 input.
- Raising b at hour four to zero the gap deletes the fuse.

Rapid throttle
- Change only the throttle / MAP / RPM schedule in w.
- Hold climate b of that field. Hold theta healthy.
- Expected: short EGT and L_k spike on the fast path, then clear.
- No extra b that adds tens of degrees to EGT whenever throttle
  moves. That hides a dead hole.

Combinations
- Hot-high = high w + hot w, still healthy theta.
- Endurance in heat = long tape + hot w; add theta walk only if the
  story is a dying engine in that climate.
- Add w tapes. Do not add two independently fitted b vectors unless
  the combo was itself a fitted profile.

### 4.3 How b is estimated

On known-good hours tagged with profile p:

    b(p) = mean( x_s - F(w, theta approximately healthy) )

Store as a table keyed by profile, or later a small regression on
normalised region features. Not decided.

Normalisers for pressure, OAT, altitude either:
- rewrite the corresponding component of w before F, or
- emit part of b.

Pick one primary path before implementation so the desert is not
counted twice.

Parameters with no physical scale remain scalar offsets.

### 4.4 RUL coupling

Stage 8 consumes only slow indices: thermal residual, oil residual,
later theta-hat.

Trend: linear first; if a compatibility check fails, piecewise or
quadratic, matching the GPA-style flowchart the team already saw.

Limit: OEM temperature, oil-pressure floor, or thermal-map fail.

Output: low / mid / high remaining time with a band.

No RUL from LAND NOW, from a slam, or from unknown.

### 4.5 Simulation harness versus known-good

X-Plane 11 and a modded IAI Heron exist as a harness. Label those
runs SIM. Do not mix SIM into the known-good set used to fit b or R.

A public OEM-limits toolkit is not a flight corpus. The flights
are not in the public clone. Do not treat that repo as a flight corpus.

### 4.6 Rejected for this task

Baking climate into theta_healthy.
Growing b during endurance.
A slam-specific EGT bias.
Using mission simulation as a substitute for Layer 0 redlines.

---

## 5. Task 3 — Architecture and federated mode

### 5.1 Placement

Part 9 of the parent document: the same eleven stages on three
computers.

    UAV edge
        Stages 1-10 live
        radio carries P0 and P1 only
    GCS / ground node
        Stage 11 replay
        IM
        disk queue
        last signed pack
        fibre carries P0-P4 after landing
    Hub
        Stage 0 retune
        HQ IM
        pack signing

### 5.2 Domain rules

Edge runs: ingest, mean-value F, Layer 0, grouped Stage 4, fast path,
Stage 9 compact advisory, sign P0/P1.

Edge does not run: IM, crank-angle ODE, h0, hub RPC, pack training.

Node runs: replay / what-if, IM tool-calling, upload queue, pack N
on disk.

Node does not run: the airborne theta-hat loop that the edge already
ran. It may replay a log through F offline.

Hub runs: collation of known-good and maintenance labels, rebuild of
F calibration / b / thresholds / one-class, pack signing, fleet IM.

Hub does not issue LAND NOW.

### 5.3 Priority classes

P0  HI, residual peaks, flags, heartbeats, later labels.
    Immediate on radio and on fibre. Never queued behind raw files.

P1  Short raw snapshot around an alert.
    Next after P0. May pause P2-P4.

P2  Priority channels: CHT, EGT, oil, w.
    Rate-capped.

P3  Remaining raw.
    Staggered slots so many bases do not collide.

P4  Deep archive.
    Night. First class dropped if disk or line is full.

Bulk transfers are chunked so a new P1 can preempt and the same file
can resume.

Every object: shared clock, site id, asset id, schema version.

### 5.4 Cut-link

UAV radio down, GCS up: edge Stages 1-9 including LAND NOW still run.
GCS-hub fibre down: node IM and pack N still run. Queues persist.
Both down: pack on disk. Queues wait. No new pack.

Hub reachability is context for the IM. It is not a precondition for
Layer 0 or for fast-path flags.

### 5.5 Model pack

Signed artefact containing:

- F or a surrogate of F
- Q, R when the UKF is enabled
- residual bands
- CUSUM slack and H
- signature table
- b tables per profile
- Stage 8 weights when enabled
- schema version

Load only before flight.
Dual-thread: the edge flies pack N until pack N+1 is signed offline
and loaded at the next preflight.
The live UKF does not write a new F.

### 5.6 IM contract

Allowed tools:

- theta-hat and health indices (Stages 3, 7)
- r and innovation statistics (Stage 3)
- Stage 4 flags including sensor-versus-engine
- Stage 6 ranked faults
- Stage 8 RUL band and uncertainty
- Stage 9 advisory
- limits, manuals, last maintenance notes stored on that node

If a quantity is not in a tool, the IM reports that it does not have
it. It does not infer CHT from prose.

Site staff talk to the node IM.
Fleet questions go to the hub IM.
Live crew conversation must work with hub unreachable.

### 5.7 Learning modes

Central (default when policy allows raw after landing):

- node ships P0-P4 plus maintenance labels
- hub refits F calibration, b(p), one-class boundary, detector
  thresholds on pooled known-good plus confirmed findings
- hub signs pack N+1

Federated (raw may not leave the site):

- hub sends current pack and an objective
- node computes a local pack delta or gradients on local logs
- hub aggregates (FedAvg-style or equivalent)
- hub signs a global pack

What may federate: b, bands, one-class, thermal-net calibration.
What may not: live UKF state, IM weights mid-sortie, crank-resolved
ODE coefficients as a flight control.

Rare faults still require the Stage 0.3 injection library. Federated
hours will not invent a labelled seized bearing.

### 5.8 Sortie sequence

1. Preflight: node loads pack N and the mission label. Computes or
   looks up b. Edge receives pack N and b.
2. Flight: Layer 0 in parallel with F+b, partitioned heads, fast path.
3. Radio: P0 always. P1 if a head or Layer 0 trips.
4. After landing: tamper-evident log to the node. IM answers from
   tools. Replay is Stage 11, not a second live estimator.
5. If fibre is up: P0, then P1, then P2-P4 per policy. Attach labels
   when maintenance exists.
6. Hub or federated aggregate may emit pack N+1. Edge keeps flying
   pack N until the next signed load.

### 5.9 Rejected for this task

IM as the live health estimator.
Training F during a sortie.
Blocking LAND NOW on the hub.
Treating federated learning as the default when raw after landing is
allowed.

---

## 6. How teammate calculations plug in

Group 1-4 timescale diagram
- Use: partition crank-angle states from mean-value manifolds from
  one-way thermal.
- Do not use: as the onboard scheduler.

ODE 1 (cylinder pressure, Hohenberg, slider-crank volume)
ODE 2 (premix/diffusion burn, ignition delay, gas temperature)
ODE 3 (mass, volume, indicated torque, FMEP, mean-value speed)
- Use: define F after cycle-average.
- Do not use: as the UKF sample period.

Overheating poster (Wiebe cycle, Woschni, lumps, thermal maps)
- Use: thermal head plant; hot-weather and high-alt w tapes.
- Do not use: as the only detector.

misfire.py
- Use: L_k and the idea of a torque hole.
- Do not use: synthetic EGT/vib/CHT residual bus, 1 ms Euler as
  plant truth.

lubrication.py
- Use: viscosity + FMEP map; h0 after landing if load is assumed.
- Do not use: airborne 1 kHz film-thickness loop.

---

## 7. Cross-task coupling

Mission tapes produce residuals that should be near zero on healthy
hardware after b. Those residuals train and validate Task 1 heads.

Task 1 slow indices (thermal, oil) are the only inputs Task 2 may
hand to Stage 8.

Task 3 decides where Task 1 runs (edge), where Task 2 b is selected
(node preflight), and where F and b are retuned (hub or federated
nodes). Task 1 Layer 0 does not depend on Task 3 connectivity.

---

## 8. Open items

Numeric residual bands per channel and per regime.
CUSUM slack and H.
Numerical ||b|| cap per channel.
Canonical list of profile keys.
Storage of b: lookup table versus regression on normalised region
features.
Whether the atmospheric normaliser writes w or writes b.
Per-family versus per-tail b.
One-class model class and training recipe.
Whether Mahalanobis is restored as a Stage 4 score.
Concrete numerical w tapes: altitudes, OAT, durations, slam timings.
Whether coolant temperature is a live channel on the target airframe.
UKF theta formulae (owned by the physics team; not specified here).

---

## 9. Hard do-nots

Do not bake climate into theta_healthy.
Do not grow b during endurance.
Do not put the IM in the live theta or RUL loop.
Do not block LAND NOW on hub reachability.
Do not treat a public OEM-limits toolkit as a flight corpus.
Do not mix SIM logs into known-good for b or R.
Do not ship turbofan survey DNNs as the v1 detector.
Do not treat crank-angle ODEs as the onboard residual rate.
Do not compute h0 in the air as if it were a sensor.
Do not use synthetic residuals from the diagnostic demos.
Do not add Mahalanobis unless explicitly reopened.

---

## 10. File history

This document replaces an earlier pitch-oriented brief.
Pitch language, slide order, judge Q&A, and spoken scripts are out of
scope for the downstream agent.

---

## 11. Interface to Shubham plant (S1-S17) and Tejas diagnostics

Two teammate documents are now in-scope:

- Shubham: Aero Piston Engine Digital Twin Final Framework (MALE UAV).
  Equations S1-S17. Two time scales. Double Wiebe. Woschni. PFI rail.
  Turbo shaft torque. One-way S16 thermal/oil/electrical/vibration.
  S17 sensor lags.
- Tejas: Diagnostic Models Framework.
  Model 1 misfire (Livengood-Wu as combustion-completion surrogate,
  torque, I_R, feature bus, stateflow).
  Model 2 lubrication / knock-LSPI / thermal sensor drift (Walther,
  Sommerfeld h0, I_LW knock, delta_MAP / delta_phi).
  Model 3 air-mass residual, STFT/LTFT, EKF bias isolation, OBD-style
  DTCs.

Our three tasks do not rewrite those files.
They consume their outputs and constrain how those outputs enter
Stages 3-6 of the parent twin.

Naming collision: parent-pipeline "Stage 4" is detectors.
Shubham "S4" is throttle and intake manifold.
Tejas "Stage 4" is speed roughness or EKF depending on model.
In this file, parent stages stay "Stage n". Shubham stays "Sn".
Tejas stays "Model m Stage n".

---

## 12. What F is, in Shubham symbols

Onboard / residual F is the slow (time-domain) handoff of Shubham
section 9, not the crank-angle S10 integrator.

Slow states that may exist inside F:

    omega, omega_tc, p_ic, p_im, p_em, z_wg
    plus S16 one-way nodes: T_head, CHT, EGT, T_oil, V_bus

Algebraic / cycle-average outputs used as the measurement prediction
xhat for the eight:

    RPM           <- S14  60*omega/(2*pi)
    MAP, MAT      <- S4   p_im, T_im
    m_f_ECU       <- S6   FADEC-reported fuel
    T_ind, IMEP   <- S10, S14, S15 cycle averages
    Q_wall,cycle  <- S10
    T_exh         <- S11  then S16 lag -> EGT
    P_oil         <- S16  k_oil*N*g(T_oil) clipped at relief
    accel RMS     <- S16  vibration block, or Tejas I_R as a scalar
    theta_inj, u_k, DeltaP, phi_s1   <- S6 / S8 inputs (monitored injection set)

w that missions are allowed to change maps onto Shubham inputs:

    altitude h              -> S1 p_amb, T_amb
    T_amb override          -> S1 or replace ISA T_amb for hot-weather
    theta_th                -> S4 throttle area
    N or tau_load / K_p     -> S14 / S15
    AFR_target              -> S6
    MAP_ref                 -> S12 wastegate PI
    pump_health             -> S6 real rail (invisible to ECU)

theta candidates mapped onto Shubham parameters when UKF exists:

    cooling                 -> h_ca, h_hc, f_head, or T_wall
    injector / fuel         -> pump_health, C_d, or eta_comb
    friction                -> C_f in FMEP (leave Chen-Flynn form; diesel C_f is known wrong)
    electrical              -> k_alt, R_batt
    volumetric efficiency   -> eta_v (Shubham: known / recomputed; not a free fiction)

Do not put climate into pump_health or h_ca to fake a hot day.
That is a Task 2 owner violation.

Shubham open choices locked for our interface:

- gamma / c_v temperature and composition dependent (user note on
  that file). Residual F must use the same property model the plant
  uses, or r will contain a property mismatch.
- One-cylinder plant for now. Per-cylinder EGT split and per-hole
  misfire wait until N_cyl copies of S10 exist.
- Throttle increase currently raises fuel via S6; turbo independent
  until MAP_ref coupling is turned on. Rapid-throttle tapes should
  drive theta_th and AFR_target first, not omega_tc directly.
- T_wall from heat-to-coolant, not a free constant, if that path is
  implemented. Thermal head then uses S16 nodes rather than a second
  wall temperature.

Wiebe parameters, eta_v, x_res, J_eff, K_p are plant-side fits.
Our b must not be used as a substitute for those fits.

---

## 13. Measurement prediction versus S17

Shubham S17 is the sensor layer:

    tau_s * dy/dt = x - y
    y_meas = y + b_sensor(t) + eps

Do not confuse S17 b_sensor (drift inside a gauge) with our mission
b(profile) (frozen offset on xhat).

Composition of the residual we specified:

    xhat_phys     = F_slow(w, theta)          # S9 handoff + S16
    xhat_sensor   = S17_lag(xhat_phys)        # first-order lags
    xhat_used     = xhat_sensor + b(profile)  # mission bias
    r             = x_s - xhat_used

If S17 already includes a drift state b_sensor, that state is a
fault parameter, not mission b.
Tejas Model 2 Stage 5 delta_MAP, delta_phi and Model 3 EKF b_k are
the same family as S17 b_sensor.

Layer 0 still uses raw x_s versus OEM limits, not xhat.

---

## 14. Task 1 heads bound to Tejas models

### Thermal head

Plant: Shubham S9 Q_wall,cycle -> S16 T_head, CHT, T_oil.
Live: CHT, oil T (and coolant if present).
Method: band + CUSUM on r after mission b.
Tejas Model 1 Overheat rule on CHT_sim / EGT_res is a debounce
wrapper, not a second plant. Prefer our r_heat over forced CHT_sim.

### Burn / fuel head

Plant: Shubham S6 m_f versus m_f_ECU, S8 Q_fuel, S11 T_exh -> S16 EGT.
Live: EGT, FADEC fuel, theta_inj, u_k, DeltaP, spark phi_s1.
Signature stub: hot EGT + odd fuel + quiet heads => injector.
Tejas Model 3 LTFT/STFT/D_MAF and P0171/P0172 are additional
features for this head when a phi or reference-airflow path exists.
This OEM engine has no MAF; Tejas already states m_dot_ref is a virtual
or cell measurement. Do not invent a MAF sensor.

S6 already defines the Layer B fuel-model error:

    r_fuel = m_f - m_f_ECU

That residual is in-family with our r on the fuel channel.
pump_health is a theta-like multiplier the ECU cannot see.

### Mech / fast path

Plant: Shubham S14 mean-value and optional crank-angle tau_i.
Feature: Tejas Model 1 Stage 4 I_R, which is our L_k
(omega_max - omega_min)/omega_avg on a half-revolution window.
Torque scale: use Tejas correction T_i = V_d * IMEP_act / (4*pi*N_cyl)
for four-stroke, consistent with Shubham S14 4*pi.

Misfire flag we specified: high I_R plus EGT hole (or EGT split when
four S10 copies exist).
Tejas Model 1 Stage 5 currently sets EGT_res high on misfire via a
forced bus. That is a demo. Live path must use r_EGT = EGT_meas -
S16_EGT(xhat), not EGT_hi constants.

Tejas Model 1 Stage 2 uses Livengood-Wu as a combustion-completion
surrogate with constant p, T_b. Shubham combustion is double Wiebe
with phasing as an input and no ignition-delay state.
Do not run Tejas I_LW completion and Shubham x_b as two competing
in-cylinder plants.
Allowed use of Tejas I_LW completion: offline injection of m, or a
parallel feature if p and T_b come from S10, not from frozen demo
values.

### Lube head

Plant / feature: Tejas Model 2 Stages 2-3 Walther + Sommerfeld h0,
plus Shubham S16 P_oil and T_oil.
Live airborne: r on oil P and oil T versus S16 map.
h0 and S (Sommerfeld) stay ground-side as in our Task 1.
Tejas Model 2 Stage 6 Full / Mixed / Boundary is a ground label,
not a Layer 0 LAND NOW.

### Knock

Tejas Model 2 Stage 4 I_LW for oil-promoted knock/LSPI, tau reduced
by oil ingress.
Shubham has no knock integral in S8 (Wiebe is prescribed).
Knock is therefore a Tejas feature, gated as Tejas recommends so a
knock EGT spike does not look like Model 1 misfire.
Not a CUSUM input.

### Sensor-versus-engine

Tejas Model 2 Stage 5 thermal drift and Model 3 EKF b_k are the
sensor-isolation path.
Our rule "only one channel moves => sensor" is the coarse v1.
When Model 3 is wired, compare EKF b_k to Model 2 expected
delta_MAP / delta_phi before naming injector.

### Open set

Still the leftover of r after named heads, including after Tejas
flags. Unknown if Tejas stateflow and our heads are all quiet but
r is foreign.

### Isolation priority versus Tejas Model 1 Stage 6

Use Tejas recommended order when both fire:

1. Layer 0 OEM / overheat safety
2. Lube (oil map or Boundary film on ground)
3. Misfire (I_R + EGT residual)
4. Injector (EGT residual without I_R, or S6 r_fuel + Model 3 LTFT)
5. Sensor (EKF / single-channel / Model 2 drift)
6. Unknown

Hold times N1, N2, N3 are Tejas debounce. They are the same role as
our 1.5-3 s fast-path hold-on. Calibrate later. Do not treat them
as physics.

---

## 15. Task 2 missions bound to Shubham inputs

High altitude
- Drive S1 h (ISA) or override p_amb.
- S2-S4 will drop mass flow and change MAP unless S12 MAP_ref and
  wastegate hold boost.
- b may absorb a systematic high-alt CHT/EGT offset after S16.
- Do not lower h_ca to fake altitude.

Hot weather
- Override T_amb (and T_cool / T_in as available) rather than only
  ISA.
- S16 cooling and oil nodes move first.
- Optional ISA/density normaliser on p_amb, T_amb before S1-S5.
- Do not lower pump_health or h_ca.

Endurance
- Long integration of slow states (S13, S14, S16).
- Optional walk of theta-like parameters (pump_health, h_ca, C_f).
- b constant.
- S16 oil and CHT slopes are the Stage 8 index.

Rapid throttle
- Drive S4 theta_th and S6 AFR_target / m_f,des.
- Until turbo is recoupled, do not expect omega_tc to follow.
- Fast path watches S14 omega and Tejas I_R.
- No extra EGT b.

Shubham feedback loops that missions will excite:

    theta_th -> m_thr -> p_im -> m_a -> m_f -> Q_fuel -> p_cyl -> torque
    MAP -> u_k -> rail -> m_f
    T_EVO -> T_exh -> P_T -> omega_tc -> pi_C -> MAP
    pump_health -> real m_f != m_f_ECU

Those loops are why b stays off theta and off w.

---

## 16. Task 3 architecture bound to both docs

Edge executes:
- Shubham slow F plus S16/S17 lags
- our Layer 0
- Tejas I_R and debounce (Model 1 Stages 4 and 6) if compute allows
- not S10 at every crank degree unless the board is proven
- not Model 2 h0
- not Model 3 EKF unless it is cheap; EKF bias isolation is node /
  post-flight by default

Node executes:
- full Shubham two-scale replay including S10
- Tejas Models 1-3 on the log
- IM tools: r, flags, I_R, LTFT/STFT, b_k, h0, S16 states
- pack N

Hub executes:
- refit of Shubham added constants (maps, S16 gains — Shubham notes
  first-draft oil/alternator gains were badly scaled)
- refit of b(profile)
- optional federated deltas of those same artefacts
- not live S10
- not LAND NOW

Pack contents add Shubham-specific items:

- double-Wiebe set (placeholders in Shubham file, not OEM data)
- eta_v handling rule
- Woschni C, C1, C2
- S16 capacitances and conductances once rescaled
- Tejas threshold symbols a1, b1, c1, ... as pack fields, still
  design values

---

## 17. Symbol bridges (do not mix in code)

| Our name | Shubham | Tejas |
| --- | --- | --- |
| r | x_s - xhat_used | not EGT_res forced bus |
| L_k | from S14 omega | Model 1 I_R |
| b(profile) | not S17 b(t) | not EKF b_k |
| theta cooling | S16 h_ca / f_head | — |
| theta fuel | S6 pump_health | Model 3 LTFT is a symptom, not theta |
| FMEP | S15 Chen-Flynn | Model 1 linear c*omega is a demo friction |
| T_wall | S9 const or coolant path | — |
| I_LW knock | not in S8 | Model 2 Stage 4 |
| I_LW completion | not in S8 | Model 1 Stage 2 surrogate only |

c in Tejas Model 1 is friction. c in Model 2 is radial clearance.
Rename in any merged codebase (c_f, c_r).

---

## 18. Uncertainty-first (Shubham section 3)

Shubham Layers B and C: alarm only outside quantified uncertainty
(sensor lag S17, FADEC fuel ±10%, model tolerance).

Our residual test must use that stack:

    trip if |r| larger than (S17 lag envelope + pack R + model band)

CUSUM slack should be at least the Layer B uncertainty on that
channel, or CUSUM will integrate sensor lag after a slam.

FADEC fuel ±10% is a hard prior on the fuel-channel band until
bench data exists.

---

## 19. Conflicts to resolve in implementation, not in argument

1. Shubham: no ignition-delay state; Wiebe phasing is an input.
   Tejas Model 1: I_LW completion with frozen p, T_b.
   Resolution: Wiebe is the plant. I_LW completion is offline or a
   feature from S10 states.

2. Tejas Model 1 feature bus uses forced EGT/Vib/CHT.
   Resolution: replace with r against S16 / S17.

3. FMEP diesel C_f versus Tejas linear c*omega.
   Resolution: airborne friction prediction uses Shubham S15.
   Tejas c*omega may remain inside the misfire demo torque ODE if
   that demo is kept isolated.

4. One-cylinder Shubham plant cannot produce per-pipe EGT split.
   Resolution: misfire isolation that needs a split waits on
   N_cyl copies of S10. Until then I_R plus bulk EGT residual.

5. S16 first-draft gains pinned oil at relief and never regulated
   the alternator.
   Resolution: do not ship those gains in pack N. Thermal and
   electrical heads stay conservative until rescaled.

6. Boost / throttle coupling is still an open Shubham item.
   Resolution: rapid-throttle tapes document whether MAP_ref is
   following or held.

---

## 20. Minimal handshake for a downstream agent

To emit one residual sample:

1. Advance Shubham slow states with current w and theta.
2. Apply S17 lags.
3. Add frozen b(profile).
4. r = x_s - xhat_used.
5. Layer 0 on raw x_s.
6. Thermal CUSUM / band on r of CHT, oil T.
7. Fuel head on r of EGT, m_f_ECU, theta_inj; include S6
   m_f - m_f_ECU if real m_f is simulated.
8. I_R from omega history (Tejas Stage 4).
9. Fast path: I_R and r_EGT with Tejas debounce.
10. Ground-only: Model 2 h0, Model 3 EKF on the log.
11. Isolation table in section 14.
12. P0 carries flags, HI, residual peaks. Raw waits for P1-P4.

That is the interface. If a quantity is not in Shubham S1-S17 or
Tejas Models 1-3 or this file, do not invent it as live x_s.
