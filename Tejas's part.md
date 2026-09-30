# Aero Piston Engine Digital Twin: Diagnostic Models Framework

Integrated, stage-by-stage diagnostic framework for misfire detection, lubrication health, knock/LSPI evaluation, and sensor drift analysis of a 4-cylinder, 4-stroke, turbocharged, port-fuel-injected SI aero engine.

**Document conventions**

- Every model follows the same flow: *Inputs → Equations / Models → Expected Outputs → Assumptions*.
- All numeric thresholds (`a₁`, `b₁`, `c₁`, `d₁`, `N₁`, …) are **design/calibration values**, not physical constants. They must be tuned against engine test data.
- SI units are used unless stated otherwise. Time step is $\Delta t$; discrete index is $k$.
- Symbols are unique within each model (see the [Symbol Table](#symbol-table)). In particular, **journal radius** ($r_j$) and **oil ingress rate** ($\dot{m}_{oil}$) are now separate symbols, because both were previously written as $r$.

---

## Architecture Overview

| Model | Purpose | Primary outputs |
|---|---|---|
| **1. Misfire** | Detect misfire from combustion completion, crank-speed roughness, and exhaust/vibration features | Overheat, Lubrication, Misfire, Injector, Sensor-drift flags |
| **2. Lubrication, Knock & Sensor Drift** | Bearing film health, oil-promoted knock/LSPI, thermally induced sensor drift | Lubrication status, Knock/LSPI status, sensor and φ-induced fault flags |
| **3. Sensor Drift (fuel/air)** | Physical air-mass estimate, adaptive trims, EKF bias isolation | LTFT/STFT, $D_{MAF}$, bias $b_k$, DTCs P0171/P0172/P0101 |

**Cross-model coupling (recommended)**

- Model 2 Stage 5 outputs ($\delta_{MAP}$, $\delta_\phi$) feed Model 3 as *expected* sensor bias; Model 3's EKF bias $b_k$ should be compared against them to confirm the thermal-drift hypothesis.
- Model 3 fuel-trim faults (P0171/P0172) and Model 2 "φ-induced fault" both explain rich/lean-driven misfire; Model 1's misfire flag should be cross-checked against them before declaring an injector fault.
- Model 2's knock EGT spike ($\Delta T_k$) is a possible false trigger for Model 1's EGT-based misfire rule. Knock status should gate it.

---

## Model 1: Misfire Diagnostic Model

*Flow: Inputs → Equations / Models → Expected Outputs → Diagnostic Logic*

### Stage 1: Inputs & Operating Conditions

- **Inputs:** In-cylinder pressure ($p$), burned-gas temperature ($T_b$), equivalence ratio ($\phi$), exhaust gas temperature ($T_{exh}$), engine constants ($V_d$, $N_{cyl}$, $\text{IMEP}_{nom}$), spark events.
- **Key Equations / Models:**
  - Discrete time stepping:
    $$t_{k+1} = t_k + \Delta t$$
  - Spark event every $N_{spk}$ time steps (for a 4-cylinder 4-stroke: one firing every 180° crank, so $N_{spk} = \frac{60}{2N\,\Delta t}$ at engine speed $N$ in RPM).
- **Expected Outputs:** Operating state at each time step, spark trigger, initial crank speed ($\omega_0$).
- **Assumptions:**
  - $p$, $T_b$, $\phi$ are constant over a combustion window.
  - $T_b$ is the burned-gas temperature.
  - Fixed time step $\Delta t$.
  - Lumped rotating inertia $J$.
  - Because $p$ and $T_b$ are constant, $\tau$ is constant and $m$ would never change on its own. **Misfire must be injected** (e.g., step change in $T_b$, $p$, or $A$) to exercise the detector.

### Stage 2: Combustion Completion (Livengood-Wu Integral)

- **Inputs:** $p$, $T_b$, spark event, delay constants ($A$, $n$, $E_a/R$).
- **Key Equations / Models:**
  - Arrhenius-type ignition delay:
    $$\tau = A \cdot p^{-n} \cdot \exp\left(\frac{E_a}{R \cdot T_b}\right)$$
  - Livengood-Wu integral (reset to zero at each spark event):
    $$I_{LW,k+1} = I_{LW,k} + \frac{\Delta t}{\tau}$$
  - Misfire evaluation at the **end of the combustion window** $t_{end}$ (not at every step, otherwise every cycle would read as a misfire immediately after spark reset):
    $$m = \begin{cases} 1 & I_{LW}(t_{end}) < 1 \\ 0 & \text{otherwise} \end{cases}$$
- **Expected Outputs:** Ignition delay ($\tau$), Livengood-Wu integral ($I_{LW}$), misfire trigger ($m$).
- **Assumptions:**
  - The Livengood-Wu integral is normally an *auto-ignition* (knock) predictor. Here it is used as a **surrogate for combustion completion**; $I_{LW} \ge 1$ means "combustion finished within the window".
  - Constants are tuned so combustion ends a few ms after spark.
  - $\phi$ is not used directly in this simplified delay.
  - Units: $p$ in Pa (or bar, consistently with $A$), $T_b$ in K, $E_a/R$ in K.

### Stage 3: Torque & Crank-Speed Dynamics

- **Inputs:** Misfire trigger ($m$), $\text{IMEP}_{nom}$, $V_d$, $N_{cyl}$, load torque ($T_{load}$), rotating inertia ($J$).
- **Key Equations / Models:**
  - Actual IMEP of the firing cylinder:
    $$\text{IMEP}_{act} = (1 - m) \cdot \text{IMEP}_{nom}$$
  - Indicated torque contribution of one cylinder event (four-stroke, $V_d$ = total displacement):
    $$T_i = \frac{V_d \cdot \text{IMEP}_{act}}{4\pi \cdot N_{cyl}}$$
    *(Correction: the original used $2\pi N_{cyl}$. For a four-stroke the cycle spans two revolutions, so the factor is $4\pi$. Use $2\pi$ only for a two-stroke.)*
  - Crank speed dynamics:
    $$J \frac{d\omega}{dt} = T_i - T_{load} - c\,\omega, \qquad \dot{\theta} = \omega$$
- **Expected Outputs:** Crank speed ($\omega(t)$), crank angle ($\theta(t)$), engine speed ($\text{RPM} = 60\,\omega / 2\pi$).
- **Assumptions:**
  - Misfire gives zero indicated torque for that cylinder only.
  - Friction is linear in $\omega$ (coefficient $c$).
  - One lumped torque value per step (an averaged model). For higher fidelity, apply a crank-angle-resolved torque pulse per firing.
  - Constant load torque.
  - For steady state without misfire, $T_i$ (summed over the cylinders firing per revolution) should balance $T_{load} + c\omega$. Check this when tuning.

### Stage 4: Speed Roughness Index

- **Inputs:** Speed history ($\omega(t)$), crank angle ($\theta$).
- **Key Equations / Models:**
  - Evaluation window closes every half revolution (one firing interval of a 4-cylinder 4-stroke):
    $$\text{If } \theta \ge \pi \;\Rightarrow\; \text{evaluate, then } \theta \leftarrow \theta - \pi$$
  - Mean speed in window:
    $$\omega_{avg} = \frac{\omega_{max} + \omega_{min}}{2}$$
  - Roughness index:
    $$I_R = \frac{\omega_{max} - \omega_{min}}{\omega_{avg}}$$
  - Reset $\omega_{max}$, $\omega_{min}$ after each evaluation.
- **Expected Outputs:** Roughness index ($I_R$), $\omega_{max}$, $\omega_{min}$ over the window.
- **Assumptions:**
  - Half-revolution evaluation window.
  - $I_R$ is used by the Stage 6 misfire rule (confirming that a misfire is mechanically real) and is also logged for trending.
  - Using max/min midpoint as the mean is a cheap approximation of the true window average.

### Stage 5: Feature Bus (Diagnostic Signals)

- **Inputs:** Misfire trigger ($m$), crank speed ($\omega$), roughness ($I_R$), forced signals ($\text{CHT}_{sim}$, $\text{Vib}_{sim}$, $V_{bus}$).
- **Key Equations / Models:**
  - Exhaust temperature feature (misfire produces unburned charge that afterburns in the exhaust, raising EGT):
    $$\text{EGT}_{res} = \begin{cases} \text{EGT}^{hi} & m = 1 \\ \text{EGT}_{nom} & m = 0 \end{cases}$$
    *(Correction: the original wrote $\text{EGT}_{nom}^{0}$ for $m=1$, which is ambiguous, and Stage 6 requires $\text{EGT}_{res}$ to go **high** on misfire. The high-level symbol is now explicit.)*
  - Vibration level:
    $$\text{Vib}_{res} = \begin{cases} \text{Vib}^{hi} & m = 1 \\ \text{Vib}^{lo} & m = 0 \end{cases}$$
  - Engine speed:
    $$\text{RPM} = \frac{60\,\omega}{2\pi}$$
- **Expected Outputs:** Feature bus $[\text{EGT}_{res},\ \text{CHT}_{sim},\ \text{Vib}_{res},\ V_{bus},\ I_R,\ \text{RPM}]$.
- **Assumptions:**
  - Features are derived from physical state, not raw sensors.
  - $\text{CHT}_{sim}$ and $V_{bus}$ are held constant (forced signals).
  - Step change in vibration/EGT on misfire. Real signals show lag; a first-order filter with time constant $\tau_f$ can be added if needed.
  - Name note: "res" suggests residual. If a true residual is intended, use $\text{EGT}_{meas} - \text{EGT}_{nom}$.

### Stage 6: Stateflow Diagnostics & Fault Logic

- **Inputs:** Feature-bus signals, hold-time limits ($N_1, N_2, N_3$), threshold values.
- **Key Equations / Models:**
  - Debounce counter:
    $$c_i = \begin{cases} c_{i-1} + 1 & \text{condition true} \\ 0 & \text{otherwise} \end{cases}$$
  - A fault sets when $c_i \ge N_x$ and clears when the signal has recovered (optionally with hysteresis).

| Fault | Condition | Hold |
|---|---|---|
| **Overheat** | $\text{CHT}_{sim} > a_1$ **or** $\text{EGT}_{res} > a_2$ | $N_1$ steps |
| **Lubrication** | $\text{Vib}_{res} > b_1$ **or** ($\text{Overheat}$ **and** $\text{Vib}_{res} < b_2$) | $N_3$ steps |
| **Misfire** | $\text{EGT}_{res} > c_1$ **and** $I_R > c_2$ | $N_2$ steps |
| **Injector abnormality** | $\text{EGT}_{res} > c_1$ held $N_2$ steps **but** $I_R \le c_2$ (thermal signature without a mechanical one) | $N_2$ steps |
| **Sensor drift** | $\text{EGT}_{res}$ high **and** $\text{CHT}_{sim}$ low **and** $\text{Vib}_{res}$ low | $N_2$ steps |

- **Priority (recommended, to remove overlap between rows):**
  1. Overheat (safety-critical).
  2. Lubrication.
  3. Misfire.
  4. Injector abnormality.
  5. Sensor drift (only if none of the above are active, since it is the "signals disagree" case).
- **Expected Outputs:** Overheat flag, Lubrication flag, Misfire flag, Injector abnormality flag, Sensor drift flag.
- **Assumptions:**
  - Thresholds are design values.
  - Four state machines run every step, in parallel.
  - The Lubrication rule's operator precedence was ambiguous in the original. The parenthesised form above is the assumed intent; **confirm with the design owner**.
  - $N_3$ was declared but unused originally; it is assigned to the Lubrication rule here.
  - Injector abnormality and Sensor drift both fire on "high EGT, low roughness/vibration". Distinguish them by adding CHT or $\phi$ information (e.g., Model 3's fuel-trim state).

---

## Model 2: Lubrication, Knock & Sensor Drift Model

*Flow: Inputs → Equations / Models → Expected Outputs → Assumptions*

### Stage 1: Inputs & Operating Conditions

- **Inputs:** Oil sump temperature ($T_{oil}$), engine speed ($N$, RPM), journal bearing load ($W$), fuel dilution in oil ($f$), oil ingress rate ($\dot{m}_{oil}$), nominal exhaust gas temperature ($\text{EGT}$).
- **Key Equations / Models:**
  - Shaft speed (rev/s):
    $$N_s = \frac{N}{60}$$
  - Projected bearing area and bearing pressure, with journal radius $r_j$ and bearing length $L_b$:
    $$A_p = 2\,r_j\,L_b, \qquad P_b = \frac{W}{A_p}$$
- **Expected Outputs:** Shaft speed ($N_s$), bearing pressure ($P_b$), operating variables ($T_{oil}$, $f$, $\dot{m}_{oil}$, $\text{EGT}$) passed to later stages.
- **Assumptions:**
  - Fixed bearing geometry ($r_j$, $L_b$, $c$).
  - Constant oil density ($\rho_o$).
  - Steady journal load.
  - Single uniform sump temperature (bearing film temperature is typically higher than sump temperature; consider a $\Delta T_{film}$ offset).

### Stage 2: Oil Viscosity (Walther Equation + Fuel Dilution)

- **Inputs:** $T_{oil}$ converted to absolute temperature $T_{abs}$, fuel dilution ($f$), Walther constants ($A_w$, $B_w$, $c_o$), oil density ($\rho_o$).
- **Key Equations / Models:**
  - Walther (ASTM D341) equation, $\nu$ in cSt, $T_{abs}$ in K (constants must match the temperature scale used):
    $$\log_{10}\!\big(\log_{10}(\nu_{pure} + c_o)\big) = A_w - B_w \cdot \log_{10} T_{abs}$$
    with $c_o \approx 0.7$ for $\nu > 2$ cSt.
  - Fuel dilution correction (linear approximation):
    $$\nu = \max\!\big(\nu_{min},\ \nu_{pure}\,(1 - k_f\,f)\big)$$
  - Kinematic to dynamic viscosity ($\rho_o$ in kg/m³, $\nu$ in cSt, $\mu$ in Pa·s):
    $$\mu = \rho_o \cdot \nu \cdot 10^{-6}$$
- **Expected Outputs:** Pure-oil viscosity ($\nu_{pure}$), diluted viscosity ($\nu$), dynamic viscosity ($\mu$).
- **Assumptions:**
  - Walther line is valid over the operating temperature range.
  - Viscosity loss is linear in $f$ with factor $k_f$. Real blending is closer to logarithmic, so an optional refinement is $\ln\nu = (1-f)\ln\nu_{pure} + f\ln\nu_{fuel}$.
  - Lower bound $\nu_{min}$ for hot/diluted oil (applied explicitly above).
  - Constant density (in reality $\rho_o$ falls with temperature and fuel dilution).

### Stage 3: Hydrodynamic Film (Sommerfeld Number)

- **Inputs:** $\mu$ from Stage 2, shaft speed ($N_s$), bearing pressure ($P_b$), journal radius ($r_j$), radial clearance ($c$).
- **Key Equations / Models:**
  - Sommerfeld number (dimensionless, $N_s$ in rev/s):
    $$S = \left(\frac{r_j}{c}\right)^{2} \frac{\mu\,N_s}{P_b}$$
  - Eccentricity ratio (empirical fit):
    $$\epsilon = \text{clip}\!\big(1 - k_s\sqrt{S},\ 0,\ \epsilon_{max}\big)$$
  - Minimum film thickness:
    $$h_0 = c\,(1 - \epsilon)$$
- **Expected Outputs:** Sommerfeld number ($S$), eccentricity ratio ($\epsilon$), minimum film thickness ($h_0$).
- **Assumptions:**
  - Empirical $\epsilon(S)$, not a full Reynolds solution. For better fidelity, replace with Raimondi-Boyd lookup tables for the actual $L/D$ ratio.
  - Steady-state operation.
  - No shaft misalignment.
  - Boundary contact is assumed if $S < S_{min}$.
  - $\epsilon_{max}$ caps film loss so that $h_0$ never falls below a physical floor.

### Stage 4: Knock / LSPI (Livengood-Wu Integral)

- **Inputs:** Engine speed ($N$), oil ingress rate ($\dot{m}_{oil}$), nominal ignition delay ($\tau_0$), crank window ($\theta_w$).
- **Key Equations / Models:**
  - Combustion interval:
    $$\Delta t = \frac{60}{N}\cdot\frac{\theta_w}{360^\circ}$$
  - Oil-promoted ignition delay (clamped to stay positive):
    $$\tau = \max\!\big(\tau_{min},\ \tau_0\,(1 - k_r\,\dot{m}_{oil})\big)$$
  - Livengood-Wu integral:
    $$I_{LW} = \int_0^{\Delta t}\frac{dt}{\tau} \approx \frac{\Delta t}{\tau}$$
- **Expected Outputs:** Ignition delay ($\tau$), Livengood-Wu integral ($I_{LW}$), Knock / LSPI trigger when $I_{LW} \ge 1$.
- **Assumptions:**
  - Oil droplets act as auto-ignition promoters.
  - $\tau_0$ is constant (no $T$, $p$ dependence in this simplified stage; the Arrhenius form from Model 1 Stage 2 is the natural upgrade).
  - Fixed crank window $\theta_w$; $\tau$ is constant over the window.
  - Because $\Delta t \propto 1/N$, $I_{LW}$ rises as speed falls. This matches the observed tendency of LSPI to occur at **low speed, high load**.
  - Conventional knock (end-gas auto-ignition after spark) and LSPI (pre-ignition before spark) are different events. This stage does not separate them; add a timing flag relative to spark if the distinction matters.

### Stage 5: Sensor Drift Evaluation

- **Inputs:** $T_{oil}$, $\dot{m}_{oil}$, $I_{LW}$ from Stage 4, nominal $\text{EGT}$, drift thresholds ($T_{map,off}$, $T_{\phi,off}$, $T_{EGT,t}$).
  *(The original also listed $h_0$, which is not used in this stage. It has been removed.)*
- **Key Equations / Models:**
  - MAP sensor thermal drift:
    $$\delta_{MAP} = k_{map}\cdot\max\!\big(0,\ T_{oil} - T_{map,off}\big)$$
  - Equivalence-ratio ($\phi$) sensor drift, with an oil-ingress term:
    $$\delta_\phi = k_{\phi 0} + k_{\phi T}\cdot\max\!\big(0,\ T_{oil} - T_{\phi,off}\big) + k_{\phi m}\,\dot{m}_{oil}$$
    *(The original used unnamed constants $k_7$, $k_8$, $T_3$ and the prose said oil ingress adds drift, but the equation had no oil term. The explicit $k_{\phi m}\dot{m}_{oil}$ term closes that gap. Delete it if the omission was intentional.)*
  - Knock thermal spike and EGT drift:
    $$\text{EGT}_{act} = \text{EGT} + \Delta T_k\cdot\mathbb{1}(I_{LW} \ge 1)$$
    $$\Delta_{EGT} = k_e\cdot\max\!\big(0,\ \text{EGT}_{act} - T_{EGT,t}\big)$$
  - Effective error (**proposed definition**, since the original listed the output without a formula):
    $$\text{error}_{eff} = \sqrt{\left(\frac{\delta_{MAP}}{P_{MAP,nom}}\right)^2 + \left(\frac{\delta_\phi}{\phi_{nom}}\right)^2 + \left(\frac{\Delta_{EGT}}{\text{EGT}_{nom}}\right)^2}$$
- **Expected Outputs:** MAP drift ($\delta_{MAP}$), equivalence-ratio drift ($\delta_\phi$), effective error ($\text{error}_{eff}$), EGT drift ($\Delta_{EGT}$).
- **Assumptions:**
  - Linear drift above threshold.
  - Oil ingress adds $\phi$-sensor drift.
  - Knock adds a fixed temperature spike.
  - Drift affects sensor **readings**, not physical state.

### Stage 6: Health Diagnostics & Failure Modes

- **Inputs:** $h_0$ and $S$ (lubrication), $I_{LW}$ (knock), $\delta_{MAP}$ and $\delta_\phi$ (sensors), oil ingress rate ($\dot{m}_{oil}$).
- **Key Equations / Models (evaluate in this order):**

| Check | Rule | Result |
|---|---|---|
| Lubrication | $h_0 < h_0^{min}$ **or** $S < S_{min}$ | **Boundary** |
| | else $h_0 < h_0^{mid}$ | **Mixed** |
| | else | **Full film** |
| Knock / LSPI | $I_{LW} \ge 1$ | **KNOCK** (else normal) |
| Sensor fault | $\delta_{MAP} \ge d_1$ **or** $\delta_\phi \ge d_2$ | Sensor drift flag |
| φ-induced misfire risk | $\delta_\phi \ge d_3$ **or** $\dot{m}_{oil} \ge \dot{m}_{max}$ | Misfire / plug-fouling flag |

- **Expected Outputs:** Lubrication status (Full film / Mixed / Boundary), Knock / LSPI status, sensor drift fault flag, φ-induced fault flag.
- **Assumptions:**
  - Threshold-based classification with design values. Consider debounce and hysteresis (as in Model 1 Stage 6) to avoid chattering near boundaries.
  - Sensor drift leads to an equivalence-ratio ($\phi$) error.
  - Oil ingress leads to plug fouling / misfire.
  - Notation fix: the original mixed $\Delta_{MAP}$ and $\delta_{MAP}$. Only $\delta_{MAP}$ is used now.
  - Suggested ordering: $d_2 < d_3$ so a sensor warning precedes a misfire-risk alarm.

---

## Model 3: SI Engine Sensor Drift Diagnostic Model

*Flow: Sensor inputs → Physical estimation → Adaptive trimming → EKF isolation → Feature extraction → Stateflow logic*

### Stage 1: Sensor Inputs

- **Inputs:** Manifold pressure ($P_{MAP}$), equivalence ratio ($\phi$), engine speed ($N$), spark events.
- **Key Equations / Models:**
  - Discrete time model:
    $$t_k = t_0 + k\,\Delta t \qquad (k = 0, 1, 2, \dots)$$
- **Expected Outputs:** Raw sensor telemetry, time-aligned signals, engine speed ($N$).
- **Theory / Notes:** These sensors measure the current operating state. Signals are sampled at a fixed rate to estimate load, fuel demand, and combustion conditions. Apply anti-alias filtering and plausibility (range/rate) checks before use.

### Stage 2: Physical Model & Air Mass Calculation

- **Inputs:** Manifold pressure ($P_{MAP}$), engine speed ($N$), air temperature ($T_{AT}$), displacement ($V_d$), gas constant ($R$).
- **Key Equations / Models:**
  - Volumetric efficiency: $\eta_v(N, P_{MAP}, T_{AT})$, a calibrated map.
  - Speed-density model (four-stroke, one intake event per cylinder per two revolutions):
    $$\dot{m}_{model} = \frac{\eta_v\, P_{MAP}\, V_d\, N}{2\,R\,T_{AT}} \qquad (N \text{ in rev/s})$$
    If $N$ is in RPM, replace $N$ with $N/60$ (equivalently, the denominator becomes $120\,R\,T_{AT}$). The original formula did not state the unit; without conversion the result is off by a factor of 60.
  - Air-mass residual (**defined explicitly**):
    $$r_m = \dot{m}_{ref} - \dot{m}_{model}$$
    where $\dot{m}_{ref}$ is the measured or reference airflow.
- **Expected Outputs:** Theoretical air mass ($\dot{m}_{model}$), air-mass residual ($r_m$).
- **Theory / Notes:** The speed-density model converts pressure, temperature, speed, and displacement into a mass-flow estimate. This OEM engine is MAP-based and has no MAF sensor, so "MAF" in Stages 3-6 denotes a **reference airflow** (virtual sensor or test-cell measurement). State this explicitly when implementing.

### Stage 3: Closed-Loop Trimming & Residual Generation

- **Inputs:** Air-mass residual ($r_m$), mixture error ($e_{\phi,k} = \phi_{target} - \phi_{meas}$; positive means leaner than target, so STFT adds fuel), current STFT / LTFT.
- **Key Equations / Models:**
  - Trimming control (PI on mixture error):
    $$\text{STFT}_k = K_p\,e_{\phi,k} + K_i \sum_{j \le k} e_{\phi,j}\,\Delta t$$
    $$\text{LTFT}_k = \text{clip}\!\big(\text{LTFT}_{k-1} + \alpha\,\text{STFT}_k,\ -L_{max},\ +L_{max}\big)$$
    The clip (typically about ±25%) and an anti-windup limit on the integrator were missing in the original. Adapt LTFT only in steady, closed-loop conditions.
  - Filtered, normalised drift residual (exponential moving average):
    $$D_{MAF,k} = (1 - \beta)\,D_{MAF,k-1} + \beta\,\frac{|r_m|}{\dot{m}_{model}}, \qquad 0 < \beta < 1$$
    The normalisation makes the residual dimensionless so it can be compared with the "15%" threshold in Stage 6.
- **Expected Outputs:** STFT (short-term trim), LTFT (long-term trim / baseline shift), filtered residual ($D_{MAF}$).
- **Theory / Notes:** STFT corrects short-term mixture errors. LTFT stores long-term baseline drift. The residual is filtered to highlight real sensor drift over noise.

### Stage 4: EKF Drift Isolation

- **Inputs:** Previous state ($x_{k-1}$), control input ($u_{k-1}$, e.g., throttle/accelerator), sensor reading ($z_k$).
- **Key Equations / Models:**
  - State vector (with $p$ = manifold pressure, $\nu$ = pressure rate, $b$ = sensor bias; the original did not define $\nu$, so this interpretation is assumed):
    $$x_k = [\,p_k,\ \nu_k,\ b_k\,]^T$$
  - Process and measurement models (bias as a random walk):
    $$x_k = f(x_{k-1}, u_{k-1}) + w_k, \quad w_k \sim \mathcal{N}(0, Q); \qquad z_k = h(x_k) + v_k = p_k + b_k + v_k, \quad v_k \sim \mathcal{N}(0, R_m)$$
  - Prediction (**corrected**; $Q$ enters the covariance, not the state):
    $$\hat{x}_k^- = f(x_{k-1}, u_{k-1}), \qquad P_k^- = F_k P_{k-1} F_k^T + Q$$
  - Update:
    $$K_k = P_k^- H_k^T\big(H_k P_k^- H_k^T + R_m\big)^{-1}$$
    $$\hat{x}_k = \hat{x}_k^- + K_k\big(z_k - h(\hat{x}_k^-)\big)$$
    $$P_k = (I - K_k H_k)\,P_k^-$$
    The bias estimate $b_k$ is the third component of $\hat{x}_k$, which reproduces the original form $b_k = b_{k-1} + K_k^{(b)}(z_k - h(\hat{x}_k^-))$.
- **Expected Outputs:** Isolated sensor bias ($b_k$), state covariance ($P_k$).
- **Theory / Notes:** The EKF separates the true physical signal from sensor bias and noise. Observability of $b$ requires an independent reference (e.g., the speed-density model in Stage 2); otherwise bias and pressure are indistinguishable.

### Stage 5: Feature Bus / Diagnostic Signals

- **Inputs:** LTFT, STFT, $D_{MAF}$, $b_k$.
- **Key Equations / Models:**
  - Feature vector:
    $$\mathcal{F}_{bus} = [\,\text{LTFT},\ \text{STFT},\ D_{MAF},\ b_k\,]$$
    (STFT is added because it is an input to this stage but was omitted from the original vector.)
  - Debounce counters $F_{LTFT}$, $F_{MAF}$, $F_{bias}$ follow the same rule as Model 1, Stage 6.
- **Expected Outputs:** Feature bus ($\mathcal{F}_{bus}$), fault counters ($F_{LTFT}$, $F_{MAF}$, $F_{bias}$).
- **Theory / Notes:** Compact diagnostic features are passed to fault logic. Counters prevent false triggers.

### Stage 6: Stateflow Diagnostics & Fault Logic

- **Inputs:** Feature bus signals, DTC status (P0171, P0172, P0101), clear limits.
- **Fault Rules:**

| # | Condition | Duration | DTC |
|---|---|---|---|
| 1 | $\text{LTFT} > +20\%$ | $> 5$ s | **P0171**, system too lean |
| 2 | $\text{LTFT} < -20\%$ | $> 5$ s | **P0172**, system too rich |
| 3 | $D_{MAF} > 15\%$ | $> 5$ s | **P0101**, air-flow sensor range/performance |
| 4 (optional) | $\lvert b_k \rvert > b_{lim}$ | $> 5$ s | Sensor bias fault (EKF-based confirmation) |

- **Clear limits (proposed, since "clear limits" was undefined):** clear a DTC when its feature stays inside a hysteresis band for a recovery time, for example $\lvert\text{LTFT}\rvert < 15\%$ or $D_{MAF} < 10\%$ for $> 10$ s. Use different set and clear values to avoid chattering.
- **Expected Outputs:** Fault flags / DTCs, diagnostic reset flag.
- **Theory / Notes:**
  - Compares features with design thresholds and time logic to set or clear diagnostic trouble codes.
  - The ±20%, 15%, and 5 s values are illustrative, OBD-style numbers. Actual calibrations are engine-specific.
  - Rule 4 lets the EKF distinguish a genuine sensor bias (bias explains the residual) from a true mixture fault (bias near zero, LTFT large).

---

## Symbol Table

| Symbol | Meaning | Model |
|---|---|---|
| $p$, $T_b$, $\phi$ | In-cylinder pressure, burned-gas temperature, equivalence ratio ($\phi$ = actual fuel-air / stoichiometric fuel-air; $\phi<1$ lean, $\phi>1$ rich) | 1 |
| $\tau$, $I_{LW}$ | Ignition delay, Livengood-Wu integral | 1, 2 |
| $m$ | Misfire indicator (1 = misfire) | 1 |
| $J$, $c$, $\omega$, $\theta$ | Rotating inertia, friction coefficient, crank speed, crank angle | 1 |
| $I_R$ | Speed roughness index | 1 |
| $r_j$, $L_b$, $c$ | Journal radius, bearing length, radial clearance | 2 |
| $\dot{m}_{oil}$ | Oil ingress rate (was $r$) | 2 |
| $S$, $\epsilon$, $h_0$ | Sommerfeld number, eccentricity ratio, minimum film thickness | 2 |
| $\delta_{MAP}$, $\delta_\phi$, $\Delta_{EGT}$ | Sensor drift terms | 2 |
| $e_\phi$ | Mixture error, $\phi_{target} - \phi_{meas}$ | 3 |
| $\dot{m}_{model}$, $r_m$, $D_{MAF}$ | Modelled air mass, residual, filtered residual | 3 |
| STFT, LTFT | Short-/long-term fuel trim | 3 |
| $b_k$, $P_k$, $Q$, $R_m$ | EKF bias, covariance, process noise, measurement noise | 3 |

*Note: $c$ is used for friction in Model 1 and for radial clearance in Model 2. They never appear in the same equation but should be renamed (e.g., $c_f$ and $c_r$) if the models are merged into one code base.*

---

## Summary of Refinements

**Corrections (technical errors fixed)**

1. Model 1, Stage 3: torque factor changed from $2\pi N_{cyl}$ to $4\pi N_{cyl}$ (four-stroke).
2. Model 1, Stage 2: misfire evaluated at end of window, not every step.
3. Model 1, Stage 5: misfire EGT level made explicit and consistent with the Stage 6 rule (EGT rises on misfire).
4. Model 2, Stage 1: symbol clash between journal radius and oil-ingress rate resolved.
5. Model 3, Stage 2: speed-density equation unit made explicit (rev/s vs RPM).
6. Model 3, Stage 4: EKF prediction corrected; $Q$ belongs in the covariance propagation, not added to the state.

**Clarifications and gaps closed**

7. Model 1, Stage 4/6: the "$I_R$ not used downstream" statement contradicted the misfire rule and was fixed. Fault priority order added. Unused $N_3$ assigned.
8. Model 2, Stage 4: positivity clamp on $\tau$; note on LSPI's low-speed tendency and knock versus LSPI distinction.
9. Model 2, Stage 5: unnamed constants renamed, oil term added to $\delta_\phi$, $\text{error}_{eff}$ defined, unused input removed.
10. Model 3: residual, mixture error $e_{\phi,k}$ (in terms of $\phi$), and clear limits defined. LTFT clipping and anti-windup added. Reference-airflow ("MAF") assumption stated for a MAP-based engine. STFT added to the feature bus. Optional EKF-bias fault rule added.

**Items to confirm with the design owner**

- Intended precedence in the Model 1 Lubrication rule.
- Whether the oil term in $\delta_\phi$ was deliberately omitted.
- Proposed $\text{error}_{eff}$ definition and all threshold values.
- Interpretation of $\nu_k$ in the EKF state vector.
