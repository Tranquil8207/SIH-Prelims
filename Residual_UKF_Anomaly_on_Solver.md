# Where the residual, the wear update, and anomaly detection sit on the solver

The solver algorithm produces one engine cycle. It does not compare that cycle with the aircraft. These three blocks consume the cycle outputs. They are not extra plants and they are not inside the crank-angle iteration.

```
solver cycle n
    p(theta), T(theta), Wi, Tind, RPM, Twall, Tcool, Toil
        |
        v
  slow measurement prediction xhat_phys
        |
        v
  sensor lag                         <-- block 1
        |
        v
  + frozen mission offset b(profile) <-- block 1
        |
        v
  xhat_used
        |
        +---- live gauges x_s
        |
        v
  residual r                         <-- block 1
        |
        +------------------+
        |                  |
        v                  v
  unscented wear update    anomaly checks   <-- blocks 2 and 3
  theta_hat = theta_hat^- + K r
        |
        v
  theta carried into cycle n+1 as the wear input of F
```

The solver’s Step 11 degradation multipliers are fault injection into the plant. They are not these checks.

---

## Block 1 — lag, mission offset, residual

Sits after Step 12 of the solver, before any detector and before the wear correction.

The solver’s cycle means are the physical prediction. Map them onto the gauge vector:

| Gauge | Taken from the solver |
| --- | --- |
| Engine speed | Step 9 RPM |
| Cylinder-head / coolant temperature | Step 10 coolant or head node, not peak gas temperature |
| Exhaust-gas temperature | Blowdown from the exhaust-valve-opening state, then a thermocouple lag. Not T_max |
| Oil pressure and oil temperature | Oil map and Step 10 oil node |
| Fuel flow | Step 2 injector flow. Controller-reported flow is the same formula without pump-health |
| Vibration | Not a cycle mean. Half-revolution speed variation needs the crank-angle torque pulse the solver already stores and then discards |
| Bus voltage | Alternator lag, once the gains are rescaled. Not in the current solver |
| Injection timing | Injector duty and spark angle, which are inputs, not outputs |

Then:

```
xhat_phys   = F_slow(w, theta)          # solver cycle means
xhat_sensor = lag(xhat_phys)            # first-order sensor lag
xhat_used   = xhat_sensor + b(profile)  # frozen preflight offset
r           = x_s - xhat_used
```

`b(profile)` is selected on the ground node before takeoff and held until landing. It is added only after the lag. It is not added to MAP, ambient temperature, or wear. Unknown profile means zero. A hot day changes ambient temperature in Step 0. It does not change the cooling multipliers in Step 11.

Pump health in the solver (`D_pump`) is the same hidden multiplier as `theta_pump`. One symbol should be used in both files.

---

## Block 2 — unscented wear update

Sits on the residual, once per slow step, not inside the crank-angle iteration.

Airborne wear is three terms, matching the solver’s fault inputs:

- cooling multiplier, the single airborne stand-in for Step 11 `D_rad`, `D_oil`, `D_flow`, `D_air`
- pump health, Step 7.1 `D_pump`
- friction offset on the Chen–Flynn torque

The random-walk prediction is `theta_hat^-`. Seven sigma points are evaluated in the slow plant, lagged, and shifted by the same `b(profile)`. The predicted measurement is their weighted mean. The innovation is `r`. The correction is:

```
theta_hat = theta_hat^- + K r
```

`K` is the unscented gain. The updated wear is an input to cycle n+1. The filter does not rewrite Wiebe parameters, Woschni coefficients, or geometry. The misfire check does not wait for this update.

Process noise is not enlarged to hide a missing mission offset. Measurement noise is not the variance of head temperature across mixed missions.

This block is optional for a first build. The residual and the checks below still run if wear is held at the healthy value.

---

## Block 3 — anomaly detection

Sits on `r` and on the raw gauges. It does not feed the crank-angle loop.

| Check | Input | Does not use |
| --- | --- | --- |
| OEM envelope | raw oil pressure and temperature, exhaust temperature, boost, time at takeoff speed | solver, offset, filter |
| Thermal | residual of head or coolant temperature after the offset | peak gas temperature |
| Oil | residual of oil pressure and temperature against the oil map | bearing film thickness, which stays on the ground |
| Fuel | real fuel flow minus controller-reported flow, and the exhaust residual | a mass-air-flow sensor |
| Misfire | half-revolution roughness plus an exhaust-temperature hole in the residual | a forced high-exhaust flag; the wear update |
| Sensor | one channel moves, channels that share its physics do not | the mission offset |
| Unknown | no named check tripped, residual still foreign | a component name |

OEM breach is land-now. Thermal and oil residuals each have their own cumulative sum, with slack at least as large as the sensor-lag and fuel-tolerance uncertainty. Rapid-throttle samples are not fed into those sums. Precedence if several fire: OEM, lubrication, misfire, injector, sensor, unknown.

Remaining life, when used, trends only the slow thermal residual, the slow oil residual, or later the wear estimate. It does not trend a throttle transient or an unknown flag.

---

## What stays in the solver

Steps 0 through 13 are unchanged. Block 1 reads Step 12. Block 2 writes wear for Step 0 of the next cycle. Block 3 only reads. Degradation in Step 11 remains the way a sick cooling system is simulated, not the way it is detected.
