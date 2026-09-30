# System architecture

One description of the piston-engine digital twin drawn on the three figures:

- [Physics model](src/app/visuals/physics/page.tsx) at `/visuals/physics`
- [Systems architecture](src/app/visuals/architecture/page.tsx) at `/visuals/architecture`
- [Fleet deployment](src/app/visuals/deployment/page.tsx) at `/visuals/deployment`

The engine is a turbocharged, four-stroke, port-fuel-injected spark-ignition piston engine on a MALE UAV. The twin ingests the engine bus, predicts what the gauges should read, and compares that prediction with the live engine. Wear is estimated between samples. Fault checks run on the residual and on the raw gauges. Between flights the hub signs the next model. The aircraft loads that model only at a later preflight.

This file describes that chain. It does not integrate the plant, step the filter, or fly a mission. Quantities that have not been calibrated stay symbols.

The working notes listed at the end are the source. Where they disagree, this file follows the form used on the figures. The parent pipeline in `Original doc.md` is used only to join those notes.

## How the three figures join

The physics figure builds the plant and ends at the predicted measurement. The architecture figure starts at that prediction, compares it with the live engine, and ends at the model loaded on the next preflight. The fleet figure is the same chain placed on computers: many aircraft, one ground node per site, one hub.

```
flight phase, w, theta
        |
        v
   plant F  -->  sensor lag  -->  + mission offset b  -->  predicted measurement
                                                                  |
live gauges -----------------------------------------------------+
                                                                  |
                                                                  v
                                                    residual r, UKF, anomaly checks
                                                                  |
                                                                  v
                                              advisory on the aircraft
                                              replay and explanation on the node
                                              next signed model on the hub
                                                                  |
                                                                  v
                                              load at the next preflight
```

A cut link does not stop the computer below it. Land-now is decided on the aircraft from the raw gauges. The hub does not issue it.

## Pipeline

The parent pipeline is eleven stages. They are not a second model. They name where each calculation sits.

| Stage | What it is | Where it runs |
| --- | --- | --- |
| 0 | Build and later retune the plant, the offset table, the bands, and the signature table | Hub, between flights |
| 1 | Ingest the live channels and the operating condition | Aircraft |
| 2 | Wear random walk, when the filter is enabled | Aircraft |
| 3 | Predicted measurement and residual | Aircraft; crank-angle replay on the node |
| 4 | Anomaly checks, including the fast roughness path | Aircraft for the fast checks; richer checks on the node |
| 5 | Health indices | Aircraft, from the wear estimate |
| 6 | Isolation | Stub rules on the aircraft; fuller table on the node |
| 7 | Publish wear and health indices | Aircraft, then the status report |
| 8 | Remaining useful life | Slow residuals only; weights retuned at the hub |
| 9 | Compact advisory | Aircraft |
| 10 | Downlink | Status report for the whole sortie; alert snapshot on a trip |
| 11 | Replay and the ground language model | Ground node |

The engineering model is stages 0–10 as the signed artefact the computers execute. The interface model is the ground language model. It answers only by calling tools. It does not update wear or remaining life, and it does not issue land-now or a new model.

## Symbols

| Symbol | Meaning |
| --- | --- |
| `w` | Operating condition. Measured or commanded. The flight phase is a time schedule of `w`. |
| `theta` | Wear. Hidden from the controller. |
| `F(w, theta)` | The plant. On the aircraft this is the cycle-average reduction. |
| `b(profile)` | Mission offset. Frozen from preflight until landing. Added only to the lagged prediction. |
| `x_s`, `z` | Live measurement. |
| `r` | Residual. Live measurement minus the prediction that detection uses. |
| `phi`, `omega`, `N` | Crank angle from top dead centre, crank speed in rad/s, engine speed in rpm. `omega = 2 pi N / 60`. |
| `N_cyl` | Four cylinders on the engine. The present plant integrates one cylinder. |

Do not mix these with nearby symbols that look alike:

| This document | Not the same as |
| --- | --- |
| Mission offset `b(profile)` | Sensor bias inside a gauge, and the ground bias estimated for one drifting channel |
| Roughness `L_k` | A forced exhaust-temperature flag |
| Wear `theta` | Injector duty, rail command, or a hot-day ambient temperature |
| Woschni gas speed `w` | The operating-condition vector, which is also written `w` |

## Figure 01 — Physics model

Operating condition and wear enter on the left. The predicted measurement leaves on the right. Three feedback paths run under the diagram: turbo shaft power returns to the compressor, engine speed returns to the kinematics, and the previous exhaust temperature returns to the next cycle's trapped charge.

The plant has two rates. At crank angle, cylinder pressure is integrated from intake-valve closing to exhaust-valve opening with manifold state and crank speed held frozen. Cycle means of torque, fuel, exhaust temperature, and wall heat are then handed to the slow states: crank speed, turbo shaft speed, plenum and manifold pressures, and the wastegate integrator. Cooling, oil, electrics, vibration, and the sensors are one-way: they are updated after the cycle and do not feed back into the crank-angle step. Combustion is much faster than the air path, so the aircraft predicts with the cycle means. The crank-angle trace is kept for ground replay. A surrogate may imitate the slow plant. It uses the same property model, or the residual will contain a property error.

Gas specific heat varies with temperature. The cylinder statement below is the gamma form of the first law. Gamma is taken from that specific heat, not from one burned-gas constant. The Krieger–Borman polynomials are the reference for the property model. They are not copied into this file. The same property model is used in the plant and in the residual.

### Flight phase

Four schedules drive `w`. They are not four plants. Wear is held at the healthy value unless the schedule is an endurance run whose point is degradation.

| Profile | What changes | What stays put |
| --- | --- | --- |
| High altitude | Pressure altitude, ambient pressure, the boost the turbo can hold, ram air consistent with the airframe | Wear. No altitude-only offset invented on top of the climate offset. |
| Hot weather | Ambient temperature, and intake temperature when it is available | Cooling wear. A hot day is a warmer sink, not a failed radiator. |
| Endurance | A long steady cruise. Wear may walk slowly if the run is about degradation. | The mission offset, for the whole loiter. A rising residual is an input to remaining life. |
| Rapid throttle | Throttle angle and the fuel-rail command | Turbo shaft speed, until boost control is coupled to the throttle. Climate offset of that field. Wear, held healthy. |

Combinations add the operating-condition tapes. Hot-and-high is both tapes and still healthy wear. A combination gets its own offset only when that combination was itself fitted. An unknown profile sets the offset to zero.

### Inputs

```
w     = [h, V, theta_th, N, T_amb, v_ram, u]^T
theta = [theta_cool, theta_pump, theta_fric]^T
```

`h` altitude, `V` airspeed, `theta_th` throttle angle, `N` engine speed, `T_amb` ambient temperature, `v_ram` ram-air speed, `u` normalised rail command. Manifold pressure, when the airframe or the controller provides it, is part of `w` as well. Injector duty is a command in `w`. It is not wear.

The airborne wear vector is three terms:

- `theta_cool` multiplies cooling conductance. The cooling note decomposes damage into five fractions (radiator, oil cooler, coolant flow, ram-air heat transfer, internal coefficient). Those fractions are the detailed network. The filter carries one multiplier until the fractions are separately observable. The multiplier is not per cylinder yet.
- `theta_pump` multiplies real rail pressure. The controller cannot see it, so real fuel flow and reported fuel flow differ.
- `theta_fric` is an offset on friction torque. The Chen–Flynn shape is kept. Its published constants are a diesel approximation and are not a calibration of this engine.

Electrical health is reserved until the oil and alternator gains have been rescaled. Turbo health and acoustic health are not on the airborne vector.

### Intake

Ambient temperature and pressure follow the International Standard Atmosphere below 11 km. A hot-weather tape may override ambient temperature rather than use the standard-day value.

```
T_amb = T_0 - 0.0065 h
p_amb = p_0 (T_amb / T_0)^5.2561
```

The compressor pressure ratio is set by shaft speed and intercooler pressure. Mass flow is read from a head-coefficient map until a manufacturer map is available.

```
T_2 = T_1 [ 1 + (1/eta_C) (pi_C^((kappa-1)/kappa) - 1) ]
```

Charge air is cooled toward the coolant temperature. The exchanger stores no mass. Plenum pressure integrates compressor delivery minus throttle flow.

```
T_ic = T_2 - epsilon_ic (T_2 - T_cool)
```

### Manifold and fuel

Throttle flow is an orifice at the pressure ratio across the blade. Manifold pressure integrates throttle flow minus engine airflow. Throttling is taken as isenthalpic.

```
m_dot_thr = C_d,th A_th(theta_th) p_ic / sqrt(R T_ic) * Psi
```

Fresh air follows speed-density. Trapped mass adds fuel and residual gas. Volumetric efficiency and residual fraction are recalculated inputs, not wear.

```
m_a   = eta_v p_im V_d / (R_a T_im)
m_cyl = (m_a + m_f) / (1 - x_res)
```

The controller sets rail command and injector duty from the demanded air-fuel ratio. Pump health scales real rail pressure only.

```
P_rail = k_rail * theta_pump * u
DeltaP = max(P_rail - p_im, DeltaP_min)
m_dot_f = C_d A_max theta_inj sqrt(2 rho_f DeltaP)
```

`theta_inj` is injector duty from 0 to 1. `u` is the normalised rail command. `k_rail` is rail pressure at `u = 1`. There is no mass-air-flow sensor. Reported fuel flow is the controller's computation, stated to within 10 percent. Engines without this controller typically measure fuel with a turbine meter; that contrast is not a second plant.

Injection start angle is not a state in the mean-value fuel model. The monitored injection set is duty, rail command, pressure difference, and spark timing.

### Closed cycle

Piston position, volume, area, and mean piston speed are algebraic in crank angle and engine speed.

```
V(phi) = V_c + A_p [ r(1 - cos phi) + l - sqrt(l^2 - r^2 sin^2 phi) ]
```

Burned fraction is the sum of two Wiebe functions of crank angle. Combustion phasing is an input. There is no ignition-delay state in the plant. The two weights sum to one.

```
x_b = f_1 x_b1 + f_2 x_b2
dQ_comb / d phi = Q_fuel * dx_b / d phi
```

Starting guesses, not a calibration: `f_1 = 0.35`, `a_1 = a_2 = 5`, `m_1 = 2.0`, `m_2 = 1.2`, start angles `-15 deg` and `-5 deg`, durations `30 deg` and `55 deg`.

Wall heat uses Woschni. In this relation `w` is gas speed, not the mission vector. The leading coefficient is `C = 3.26` with pressure in kPa (`C = 130` with pressure in bar). `C_1 = 2.28` with no swirl. `C_2 = 0` during compression and `0.00324 m/(s K)` during combustion and expansion. The reference state is intake-valve closing. Motored pressure is polytropic.

```
h = C D^(-0.2) p^(0.8) T^(-0.53) w^(0.8)
w = C_1 S_p + C_2 (V_d T_r / (p_r V_r)) (p - p_m)
Q_dot_ht = A_cyl h (T - T_wall)
```

One cylinder is integrated from intake-valve closing to exhaust-valve opening. Mass is constant on that interval. Outputs are the pressure trace, gross work, peak pressure, and wall heat per cycle.

```
dp/d phi = (1/V) [ (gamma - 1) (dQ_comb/d phi - dQ_ht/d phi) - gamma p dV/d phi ]
T_cyl = p V / (m_cyl R)
```

A Livengood–Wu integral is not a second in-cylinder plant. It may be evaluated offline, or as a feature, from this pressure and temperature. It is not run on frozen demonstration pressures.

### Exhaust and crank

Crank-angle results reduce to cycle means. Those means are what the aircraft predicts with.

Pumping work is the intake-to-exhaust pressure difference times displacement. Exhaust temperature follows a blowdown from the exhaust-valve-opening state.

```
T_exh = T_EVO (p_em / p_EVO)^((gamma-1)/gamma) (1 - epsilon_loss)
```

Turbine power is taken from the exhaust pressure ratio. Wastegate flow is a proportional-integral command on manifold-pressure error. The wastegate opens when manifold pressure exceeds the reference. That reference is not yet driven by the throttle schedule, so a rapid-throttle tape moves the throttle and the fuel command and does not, by itself, move turbo shaft speed.

```
P_T = eta_T m_dot_T c_p,g T_3 [ 1 - (p_4 / p_3)^((kappa_g-1)/kappa_g) ]
```

Turbo shaft speed integrates turbine power minus compressor power. The steady pressure-ratio expression is an initial guess, not the step equation. Shaft power returns to the compressor.

```
J_tc d(omega_tc)/dt = (eta_m P_T - P_C) / omega_tc
```

Cycle-mean indicated torque sums gross work and pumping work. The crank-angle torque sum agrees with this mean over one revolution. The factor is `4 pi` because the engine is a four-stroke.

```
T_ind = N_cyl (W_gross + W_pump) / (4 pi)
```

Friction mean effective pressure keeps the Chen–Flynn form. Propeller torque is quadratic in propeller speed and is referred through the gearbox. Wear enters as an offset on friction torque.

```
FMEP = C_f + 0.005 p_max + 0.162 S_p
tau_prop = K_p omega_p^2
omega_p = omega / i
tau_load = tau_prop / (i eta_gb)
```

The gear ratio in the plant note is `i = 2.54`. Effective inertia includes the propeller referred through that ratio.

```
J_eff d(omega)/dt = T_ind - tau_fric - tau_load
```

Engine speed returns to the kinematics. Real compressor and turbine maps, and a two-state versus four-state turbo model, wait until the throttle and the boost reference are coupled.

### One-way auxiliaries

Cycle wall heat enters a lumped network. The head rejects heat to coolant and then the radiator. The cylinder may reject heat to ram air, coolant, or both. Piston heat enters the oil. A hot day changes the sink temperature. It does not change `theta_cool`.

```
Q_dot = UA (T_1 - T_2)
UA_air = UA_0 + k v_ram^n
```

The two-node cooling statement in the plant note is:

```
C_h dT_head/dt = f_head Q_dot_wall - h_hc (T_head - CHT)
C_c dCHT/dt    = h_hc (T_head - CHT) - h_ca (CHT - T_amb)
```

`CHT` here is the lagged head or coolant reading, not an instantaneous metal temperature. A separate coolant sensor is optional and is not yet a required live channel.

The detailed degradation fractions, each from 0 to 1, scale the healthy conductances:

```
UA_rad = (1 - D_rad) UA_rad,0
UA_oil = (1 - D_oil) UA_oil,0
m_dot_c = (1 - D_flow) m_dot_c,0
h_air = (1 - D_air) h_air,0
h = (1 - D_HTC) h_0
```

Oil temperature integrates friction power and a fraction of wall heat, minus rejection to ambient. Oil pressure is a map of speed and temperature, clipped by the relief valve.

```
C_o dT_oil/dt = P_fric + f_oil Q_dot_wall - h_o (T_oil - T_amb)
P_oil = min( k_oil N g(T_oil), P_relief )
```

Bus voltage lags a speed-dependent alternator target, limited by the regulator and reduced by load current.

```
tau_e dV_bus/dt = min(k_alt N, V_reg) - I_load R_batt - V_bus
```

The first-draft oil and alternator gains pinned oil pressure at the relief valve and never entered regulation. Those numbers are not part of the signed model. Thermal and electrical checks stay conservative until the gains are derived again.

Vibration is one structural resonance forced at the first three firing harmonics. Force amplitude follows the cylinder pressure range. This is the accelerometer channel. Acoustic root-mean-square is a ground virtual sensor and is not an airborne wear term.

```
f_fire = (N/60) (N_cyl / 2)
```

### Measurement

Each channel is a first-order lag of its true value, plus a gauge bias and noise. Cylinder-head, oil, and manifold temperatures use a thermistor. Exhaust temperature uses a thermocouple. The gauge bias is a fault parameter. It is not the mission offset.

```
tau_s dy/dt = x - y
y_meas = y + b_sensor(t) + eps
```

The mission offset is selected on the ground node before takeoff, stored in the signed model, and held until landing. It is added after the lag. A missing label sets it to zero. It is not added to `w` and it is not added to wear. Its magnitude is capped so a large offset cannot hide a failed engine. An order-of-magnitude figure of 10–15 °C on cylinder-head temperature was discussed and is not calibrated.

```
xhat_phys   = F_slow(w, theta)
xhat_sensor = lag(xhat_phys)
xhat_used   = xhat_sensor + b(profile)
```

On known-good hours tagged with profile `p`:

```
b(p) = mean( x_s - F(w, theta approximately healthy) )
```

Until an individual aircraft has its own healthy hours, the table is at family level. Simulator logs are labelled as simulation and are excluded from this fit. The table is the version used now. A regression on normalised region features is a later option. Altitude and ambient temperature are written into `w` before the plant. Residuals may then be binned, thermal residuals by ambient temperature and performance residuals by density altitude. The normaliser writes either `w` or `b`, not both, so a hot day is not counted twice. Which of the two receives it is still open.

The predicted measurement passed to the architecture figure is engine speed, cylinder-head temperature, exhaust-gas temperature, oil pressure, oil temperature, fuel flow, vibration, bus voltage, and injection timing.

### Loops the mission tapes excite

```
throttle -> throttle flow -> manifold pressure -> air mass -> fuel -> heat release -> torque
manifold pressure -> rail command -> rail pressure -> fuel flow
exhaust state -> turbine power -> turbo shaft speed -> compressor -> manifold
pump health -> real fuel flow, which the controller does not report
```

Those loops are why the mission offset stays off both wear and the operating condition.

## Figure 02 — Systems architecture

### Sources and ingest

The predicted measurement is the gauge vector expected on the current mission after lag and the mission offset. The live measurement is the same channels as reported by the engine controller.

Controller-area-network frames are decoded with the interface database, time-stamped, and appended to a hash-chained log. Samples that fail a plausibility check are flagged and kept. Each sample is labelled with the flight phase. The label selects the residual band. Samples inside a rapid-throttle window are excluded from the slow cumulative sums.

### Unscented Kalman filter

Wear is a random walk. Process noise `Q` is the covariance of that walk. It is estimated from repeatability at a fixed operating point, or from sensor data sheets, together with the measurement noise `R`. `R` is not the variance of cylinder-head temperature across mixed missions. `Q` is not enlarged to absorb a missing mission offset. A wrong label is corrected in the profile or in the plant.

```
theta_k = theta_(k-1) + xi_k,    xi_k ~ N(0, Q)
P^- = P + Q
```

The unscented transform places `2n+1` sigma points about the current wear estimate. The airborne state has three wear terms, so seven sigma points.

```
lambda = alpha^2 (n + kappa) - n
chi_0 = theta_hat
chi_i     = theta_hat + [sqrt((n+lambda) P)]_i
chi_(i+n) = theta_hat - [sqrt((n+lambda) P)]_i
```

Each sigma point is evaluated in the slow plant, lagged, and shifted by the same frozen mission offset. The predicted measurement is the weighted mean. The crank-angle plant is not the filter's sample period.

```
z_i = lag(F(w, chi_i)) + b(profile)
z_hat = sum_i W_i^(m) z_i
```

The innovation is the residual used for detection. It is not a subtract across individual sigma points.

```
r = z - z_hat
P_zz = R + sum_i W_i^(c) (z_i - z_hat)(z_i - z_hat)^T
P_theta,z = sum_i W_i^(c) (chi_i - theta_hat)(z_i - z_hat)^T
K = P_theta,z P_zz^(-1)
theta_hat = theta_hat^- + K r
P = P^- - K P_zz K^T
```

The updated wear is the plant input at the next step. The filter does not write a new plant. The misfire check does not wait for this update.

A health index may be formed from each wear term for display. The lowest index is that display. It is not the isolator.

### Anomaly checks

Checks alarm only outside quantified uncertainty: sensor lag, the stated fuel-flow tolerance, and the model band. A cumulative-sum slack is at least the uncertainty on that channel, or the sum will integrate sensor lag after a throttle transient.

**OEM envelope.** Oil pressure, oil temperature, exhaust-gas temperature, boost, and time at takeoff speed are compared with the OEM limits on the raw measurement. A breach is land-now. The plant, the mission offset, the filter, and the hub are not consulted. Hub reachability is not required.

**Thermal residual.** Cylinder-head temperature, and coolant temperature if that sensor exists, are compared with the cooling network after the mission offset. A cumulative sum trips on a persistent residual and leaks toward zero when the residual re-enters the healthy band. It is not a lifetime integral. Rapid-throttle samples are not fed into it.

```
S(t) = max(0, S(t-1) + r_group(t) - slack)
trip if S(t) > H
```

Slack and `H` are unset. Thermal and oil do not share one accumulator.

**Oil residual.** Oil pressure and temperature are compared with the oil map at the current speed and temperature. The oil cumulative sum is separate from the thermal sum. Bearing-film thickness is ground-only. It needs a bearing load that is not a live gauge.

```
log10(log10(nu_pure + c_o)) = A_w - B_w log10(T_abs)
nu = max(nu_min, nu_pure (1 - k_f f))
S_film = (r_j / c)^2 * mu N_s / P_b
h_0 = c (1 - epsilon)
```

Film regime (full, mixed, boundary) is a ground label. It is not land-now.

**Fuel and exhaust.** Real fuel flow is compared with the flow reported by the controller. Exhaust-gas temperature is compared with the lagged prediction. A hot exhaust residual without roughness is the injector signature. Controller fuel trims are extra features for this check when a mixture path exists. They are not a mass-air-flow sensor.

```
r_fuel = m_dot_f - m_dot_f,ECU
```

The fuel-channel band respects the stated 10 percent tolerance until bench data exists.

**Misfire.** Roughness is evaluated over about half a revolution, which is one firing interval of this four-cylinder four-stroke. It is computed at firing rate and is not averaged over minutes. The call requires high roughness together with an exhaust-temperature hole from the residual, not from a forced high-exhaust flag. A hold of about 1.5–3 s is debounce, not physics. The check does not wait for the wear estimate or for a radio acknowledgement.

```
L_k = (omega_max - omega_min) / omega_avg
```

Whether a skipped burn in this plant actually opens that exhaust-temperature hole is a verification still to be run. Per-pipe exhaust split waits until each cylinder has its own pressure integration.

**Knock.** Oil entering the cylinder shortens ignition delay. The ground check is a Livengood–Wu integral over the combustion window, with delay reduced by the oil-ingress rate. It trips when the integral reaches one. It is gated so a knock-driven exhaust spike is not called a misfire. It is not a cumulative-sum input, and it is not part of the airborne plant.

**Sensor.** One channel moves while channels that share its physics stay consistent. A separate cumulative sum watches that single-channel drift. It is not the thermal or oil sum. After isolation, the model value may replace the failed channel. The substituted value is not used to update wear on that same channel. A ground bias filter may isolate the gauge bias; that bias is the sensor fault, not the mission offset. The coarse airborne rule remains "only one channel moved."

**Unknown.** No named check has tripped, and the residual is still inconsistent with the healthy plant. The sample is kept and is not assigned to a component. The first version is this bin. A later one-class model, trained only on known-good residuals after the mission offset, can name the same situation by a high reconstruction error. Regime-conditional thresholds and conformal bounds belong to that later model. A Mahalanobis score on the innovation covariance was discussed and is not part of the first version.

### Decision

When more than one check trips, precedence is:

1. OEM limit, which is land-now
2. Lubrication
3. Misfire, from roughness plus an exhaust-temperature hole
4. Injector, from a hot exhaust residual or a fuel residual without roughness
5. Sensor
6. Unknown

Flags clear when the driving signal recovers. Land-now clears only by a crew decision. Debounce counters are the same role as the fast-path hold. Their step counts are design values.

Remaining useful life uses only the slow thermal residual, the slow oil residual, and, later, the wear estimate. The projection is toward an OEM temperature limit or the oil-pressure floor. The trend is linear first. If that fit fails a compatibility check, a piecewise or quadratic trend is used. The published result is a low, mid, or high band. Land-now, a throttle transient, and an unknown flag are not inputs.

### Where it runs, and what returns

On the aircraft: ingest, the cycle-average prediction, the OEM-limit check, the roughness check, and the compact advisory. Land-now and the misfire check remain available if the radio is lost. The model loaded before flight is not rewritten in flight.

On the ground station: the log is replayed through the crank-angle plant and through the lubrication, knock, and sensor-drift checks. The language model may answer only by calling tools bound to that node's logs, signed model, and aircraft: wear and health indices, residuals, flags, ranked faults, the remaining-life band, the advisory, limits, and the maintenance notes stored on that node. If a quantity is not in a tool, the model says it does not have it. It does not estimate temperatures, wear, or remaining life from prose, and it does not update them.

On the hub: healthy hours refit the mission offset. Confirmed faults are written to the signature table. The next model is signed here. The hub does not issue land-now. Simulator logs are excluded from the healthy set.

The next signed model carries the mission-offset table, residual bands, cooling and oil calibration, and the threshold symbols. The plant structure is unchanged. It receives the revised offset, bands, and calibration at the next preflight. Live wear from the current sortie is not written back during flight.

The signature table is the cause-and-symptom chart. It is filled by one-fault injections: a skipped burn, a pump-health drop, a cooling-multiplier drop, a friction offset, and a single-channel bias, drift, stuck reading, or scale error. It is empty until those injections are run. Synthetic residual buses from the diagnostic demonstrations are not used.

## Figure 03 — Fleet deployment

One hub. Many ground nodes, one per site. Many aircraft on a node. The aircraft flies the model it took off with. The node explains the sortie. The hub signs the next model between flights.

### Preflight

The operator or a scheduler selects the mission key: high altitude, hot weather, endurance, rapid throttle, a combination, or unknown. The key is stored with the sortie.

The node looks up `b(profile)` in the signed model it already holds. Unknown sets the offset to zero. The value is frozen for the sortie, including a long endurance leg. The node does not push a replacement offset during the flight, even if the hub link is up.

The node sends the current signed model, the mission key, and the offset. The aircraft refuses to arm if the model is unsigned or the format does not match. The model is not replaced after arming.

### Aircraft

The live channels and the operating-condition vector are read from the engine bus. Each sample carries the shared clock, the site identity, and the aircraft identity. The channel list is engine speed, cylinder-head temperature, exhaust-gas temperature, oil pressure, oil temperature, fuel flow, vibration, bus voltage, and injection timing. A spoken count of eight folds the two oil channels together.

```
r = x_s - (F(w, theta) + b(profile))
```

with the lag inside `F`'s measurement path as written in the physics section. The cycle-average plant is the one in the signed model loaded before flight. Crank-angle integration is not the airborne rate. No language model is carried on the aircraft.

The OEM envelope uses the raw measurement. A breach is land-now, whether or not the hub can be reached. The fast path runs roughness, the exhaust residual, and the hold timer at firing rate. The advisory is produced by those checks. A language model cannot issue the advisory, land-now, or a replacement model.

### Aircraft radio

Two messages leave the aircraft.

The status report carries health indices, residual peaks, detector flags, and a heartbeat, with the aircraft identity and the mission key. It is sent at a low rate for the whole sortie. Recorded time series are not on this radio.

The alert snapshot is a short raw window around a trip: the live channels, the operating condition, and timestamps. It is emitted when a detection head or the OEM limit trips.

If that aircraft's radio is lost, it continues with the model it took off with and with the OEM-limit check. Other aircraft on the same node keep reporting. An aircraft never addresses the hub, or another node's language model, directly.

### Ground node

After landing, the tamper-evident log is copied to the node. The node does not invent samples the aircraft did not record.

The log is replayed through the two-rate plant, including the crank-angle cylinder step, and through the lubrication, knock, and sensor-drift models. Replay does not replace the wear estimate computed in flight.

The node language model answers maintainers at that site through the tools above.

The upload queue keeps the status report ahead of recorded data. An alert snapshot may pause a bulk upload. The queue is retained if the hub link is down, and the node keeps the model it already holds.

### Link to the hub

The default, when policy allows recorded data to leave the site after landing, is a central uplink. Order is the status report with maintenance labels, then alert snapshots, then the priority channels (cylinder-head temperature, exhaust-gas temperature, oil, and the operating condition), then the remaining channels, then the night archive. Priority-channel rate is capped. Remaining channels use staggered slots so neighbouring sites do not upload together. The night archive is first to be dropped if the disk or the line is full. Bulk files are sent in chunks. A new alert can interrupt a chunk, and that file resumes afterwards. Every object carries the site, the aircraft, the model version, the mission, the time, and the kind of message. An object missing any of those cannot be combined with the others.

The federated path is the exception, used only when recorded data must stay on the node. The node sends a model update computed on local logs, and the status report if policy allows. Bulk time series stay on the node. One training objective is chosen per round: residual reconstruction, an offset fit, the open-set model, or the thermal calibration. The hub treats the update as untrusted. Live filter state, language-model weights, and crank-resolved coefficients are not aggregated. Rare labelled faults still come from the injection library. A node is not assumed to have seen a seized bearing. Differential privacy on the update was named and not designed.

If the fibre is lost, the node keeps the model it already holds, its language model, and the queue. Aircraft on that node are unchanged. Other nodes that still reach the hub continue. No revised model arrives for this site until the link returns.

### Hub and the next preflight

Status reports, allowed recordings, and maintenance labels are aligned on the identifiers above.

Known-good hours and confirmed findings refit the offset table, residual bands, cumulative-sum slack, the open-set model, and thermal calibration after the gains are rescaled. Simulator logs are excluded.

The fleet language model answers a fleet officer from aggregated status reports and labels. It is not a substitute for the site model when that site's fibre is down, and it cannot issue a new model or land-now.

The hub signs the next model, with a record of what changed. The same structure is used on the aircraft, the node, and the hub. It is not written into an aircraft that is already airborne.

What may move between successive signed models:

- the offset table
- residual bands and cumulative-sum slack
- the open-set model
- rescaled thermal and electrical calibration
- detector thresholds

What does not move without a laboratory review:

- the crank-angle structure
- the Woschni form
- the fuel-rail structure
- the OEM limits

Nodes receive the signed model. Each aircraft keeps the model it took off with until a later preflight loads the new one. An offset received during the sortie is not applied. If the hub itself is dark, every node remains an island on the model it already holds, and land-now still belongs to the aircraft.

### Cut links

| What fails | Aircraft | Node | Hub | Neighbours |
| --- | --- | --- | --- | --- |
| One aircraft radio | That aircraft keeps its model and the OEM-limit check | Unaffected | Unaffected | Other aircraft on the node still report |
| Every radio on a node | Each aircraft continues alone | Language model sees a stale live report; replay still uses the last logs | That node's live reports stop | Other nodes unaffected |
| Fibre to the hub | Unchanged | Keeps its model, its language model, and the queue | Other nodes still connected | No new model for this site |
| Hub dark | Unchanged | Every node is an island | — | Each node keeps the model it already holds |
| Hub dark and one radio down | That aircraft still applies the OEM limits | — | — | Safety does not depend on the nesting |

### One sortie

1. The node holds the current signed model. The mission key is set. The offset is looked up. Unknown means zero.
2. The aircraft receives the model, the key, and the offset, and refuses to arm on a bad signature or a bad format.
3. In flight the OEM limits run beside the prediction, the anomaly checks, and the fast path.
4. The status report is sent throughout. An alert snapshot is sent if a check or an OEM limit trips.
5. After landing the tamper-evident log is copied to the node. The language model answers from tools. Replay is not a second live estimator.
6. If the fibre is up, the queue drains in the order above, with maintenance labels attached when they exist. If the site is in the federated exception, the queue carries the model update instead of the recordings.
7. The hub may later sign a new model. This aircraft keeps the model it took off with until a future preflight.

## What the signed model contains

One signed artefact, same schema on the aircraft, the node, and the hub.

- schema version, and a changelog with the signature
- the slow plant, or a surrogate of it, and the property-model flag for temperature-dependent specific heat
- filter covariances `Q` and `R` when the filter is enabled
- residual bands per channel and per regime
- cumulative-sum slack and trip level
- the signature table
- the mission-offset table
- remaining-life weights when that stage is enabled
- detector thresholds, still uncalibrated until data exist
- plant constants that calibration is allowed to move: cooling and electrical gains once rescaled, the Wiebe set once fitted, and the volumetric-efficiency rule

The OEM limit numbers are legal limits. They are not learned. The double-Wiebe numbers in the plant note are placeholders and are not shipped as a calibration. The first-draft oil and alternator gains are not shipped.

## Closed choices

These are settled for the figures. They are recorded so a later reading of one note does not reopen them.

- The airborne plant is the slow, cycle-average handoff plus the one-way thermal, oil, electrical, and vibration blocks, plus sensor lag. Crank-angle integration is ground replay.
- Combustion is double Wiebe with Woschni wall heat. A single-Wiebe adiabatic worksheet is not the plant. Temperature-dependent specific heat is the property model.
- One cylinder is integrated. Per-cylinder exhaust split waits on one pressure integration per cylinder.
- Throttle and rail command are operating inputs. They do not yet drive turbo shaft speed.
- Airborne wear is the cooling multiplier, pump health, and the friction offset. Injector duty stays in the operating condition. Turbo health, acoustic health, and five separate cooling fractions are not separate airborne states.
- The mission offset is a frozen preflight table. Climate is written into the operating condition. The offset is not grown during endurance, and a rapid throttle does not get its own exhaust-temperature offset.
- Land-now is an OEM-limit breach on the raw gauges only.
- The fast misfire call is roughness plus an exhaust residual. It does not use a forced exhaust flag, and it does not wait for the filter.
- Isolation follows the order in the decision section. The lowest health index is a display.
- Two cumulative sums cover the slow thermal residual and the slow oil residual. A further sum covers single-channel sensor drift. They are not one shared accumulator, and the roughness check is not a cumulative sum.
- Remaining life uses the slow thermal residual, the slow oil residual, and later the wear estimate.
- The language model stays on the ground, calls tools only, and cannot issue land-now or a new model. None is carried on the aircraft.
- The model is loaded at preflight. It is not swapped in flight. The live filter does not write a new plant.
- Central upload of recordings after landing is the default. A federated update is the exception when recordings must stay on the node.
- Simulator hours do not enter the healthy set used to fit the offset or the measurement noise.
- Bearing-film thickness and the knock integral run on the ground. The sensor-bias filter is a node check unless a later decision moves it.

## Open items

Numbers and storage choices. None of them change the shape of the three figures.

Plant fits still open: the double-Wiebe set, volumetric efficiency, residual-gas fraction, effective inertia, propeller coefficient, thermal masses and conductances, rescaled oil and alternator gains, and the OEM numeric limits. The Krieger–Borman expression for specific heat is the reference and is not yet written out. Real compressor and turbine maps, and a two-state versus four-state turbo, wait on boost coupling. On a rapid-throttle tape it is still open whether the boost reference is held or follows.

Detection numbers still open: residual bands per channel and regime, cumulative-sum slack and trip level, the numerical cap on the mission offset, and the detector thresholds. Whether the plant produces an exhaust-temperature hole when a burn is skipped has not been checked. The signature table is empty. It is open whether coolant temperature is a live channel, and whether the ground sensor-bias filter ever moves onto the aircraft. A few diagnostic definitions remain unsettled inside the lubrication note: the exact lubrication-rule parentheses, whether oil ingress belongs in the mixture-drift term, the definition of the effective mixture error, and the meaning of one bias symbol in that filter.

Fleet numbers still open: radio budgets for the status report and the alert snapshot, how updates from a hot-and-high site and a sea-level site are merged, the file format of the signed model, federated averaging weights and whether the client is a node or an aircraft, and a privacy budget if one is required. The atmospheric normaliser must be assigned either to the operating condition or to the mission offset before implementation.

## Sources

| File | What it contributes |
| --- | --- |
| `Shubham's part.md` | Plant stages from atmosphere through the sensors, double Wiebe, Woschni, the fuel rail, turbo shaft balance, and the two time scales. |
| `Ruhi's part - 1 .md` | Cooling degradation fractions and the degraded thermal network. |
| `Ruhi's part - 2.md` | Healthy overheating path. The adiabatic single-Wiebe pass in that note is a worksheet. The plant of record remains the double-Wiebe model. |
| `Omkar's part.md` | Filter structure: random-walk wear, sigma points, innovation, gain. The health vector flown here is the three-term vector above, not the longer vector in that note. Acoustic root-mean-square stays a ground virtual sensor. |
| `Tejas's part.md` | Roughness, the ground lubrication and knock checks, and sensor-drift isolation. Forced residual buses in that note are demonstrations and are not the live path. |
| `Anish's part.md` | Residual definition, mission offset, check placement, remaining life, and which computer may do what. |
| `Fleet_Architecture_Agent_Brief.md` | Topology, radios, the two learning modes, and behaviour when a link is cut. |
| `Original doc.md` | Stage numbering, the sensor-drift cumulative sum, and the join between the notes. Team notes win where they already decide the point. |

## Names used only in the working notes

The figures and this file use the descriptions in the middle column. The right-hand column is what the working notes call the same thing.

| In this file | In the working notes |
| --- | --- |
| Signed model loaded before flight | Pack N |
| Next signed model, loaded at a later preflight | Pack N+1 |
| Status report | P0 |
| Alert snapshot | P1 |
| Priority channels after landing | P2 |
| Remaining channels | P3 |
| Night archive | P4 |
| OEM-limit check on the raw gauges | Layer 0 |
