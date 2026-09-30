# Aero Piston Engine Digital Twin — Final Framework (MALE UAV)

Complete set of equations, stage by stage, for the confirmed framework: 4-cylinder, 4-stroke, turbocharged, port-fuel-injected SI engine.
Equations only (no code). Each stage is tagged with where it comes from:

- **[paper]** Menacer & Bouchetara (2016), *Thermodynamic Analysis of a Turbocharged Diesel Engine Operating under Steady State Condition*, JAFM 9(2), adapted where noted
- **[user]** equations you specified (double Wiebe, PFI rail model, Woschni)
- **[added]** my additions to close the model (surrogate maps, orifice flows, thermal nodes, etc.), i.e. the parts most in need of fitting to real data

---

## 1. Problem statement

Build a modular Digital Twin of an aero piston engine used on a MALE UAV. It ingests engine sensor data (CAN / FADEC), mirrors the engine with physics models plus AI/ML, and moves from threshold-based, reactive alarms to predictive diagnostics. Benchmark engine: the OEM powerplant.

| Layer | Role |
|---|---|
| A. Digital Twin Core | Virtual engine synced to live data, modular, real-time ingestion |
| B. Health Monitoring | RPM, CHT, EGT, oil P/T, fuel flow, vibration, battery/alternator, injection parameters → validated state and health indices |
| C. Fault Detection and Prediction | Misfire, injector abnormality, cooling degradation, lubrication issues, sensor drift, combustion instability, overheating trends, abnormal vibration |
| D. AI/ML | Anomaly detection, RUL estimation, trend analysis, maintenance recommendations |
| E. Simulation and Replay | Mission replay, high altitude, endurance, hot weather, rapid throttle transitions |
| F. Dashboard | Health status, fault alerts, efficiency trends, maintenance advisory, mission reports |

## 2. Monitored parameters and how they are measured

| Parameter | Sensor / source | Principle |
|---|---|---|
| RPM | Crankshaft position sensor (Hall/VR) | Pulse count off toothed wheel; also the timing reference |
| CHT | Coolant temperature (thermistor/RTD) | Heads are liquid-cooled, barrels air-cooled; the reading lags real head metal temperature |
| EGT | Type K thermocouple, one per cylinder | Thermoelectric voltage; main combustion-health indicator |
| Oil pressure | Piezoresistive transducer | Diaphragm strain → bridge voltage |
| Oil temperature | Thermistor/RTD in oil tank | Resistance vs temperature |
| Fuel flow | Computed by the FADEC, no flow meter | From injector flow model, ±10% stated tolerance |
| Vibration | Add-on accelerometer (piezo/MEMS) | The factory knock sensor is not used for monitoring |
| Bus voltage | ECU voltage sense | Divider → ADC |
| Injection parameters | Derived ECU setpoints | Duty, rail command, pressure differential, spark timing |
| MAP | Piezoresistive silicon diaphragm | Strain-gauge bridge |
| MAT | NTC thermistor | Resistance vs temperature |

Non-FADEC engines (Lycoming/Continental) typically use a turbine flow meter, which is a true measurement; the OEM computed value is a soft sensor.

## 3. Uncertainty-first principle (Layers B and C)

- Layer B's job is to quantify what it does not know: sensor lag, model-based values, tolerance bands.
- Layer C should alarm only on deviations larger than that uncertainty.
- Order of work: per-parameter error table → baseline model → physically justified fault injection → detection method per fault type → RUL last.

---

## 4. Confirmed modelling decisions

1. **Combustion:** double Wiebe, prescribed function of crank angle (no ignition-delay model; phasing is an input).
2. **Fuel:** PFI rail model: `P_rail = k_rail·u_k`, `ΔP = max(P_rail − P_MAP, ΔP_min)`, `ṁ_f = C_d·A_max·θ_inj·√(2ρ_f·ΔP)`.
3. **Heat transfer:** Woschni with the full `w` (including the combustion term) in place of Hohenberg.
4. **Turbocharger:** shaft torque balance, not a first-order lag.
5. **Interpretations confirmed by you:**
   - `θ_inj` is a 0–1 injector duty command; `ṁ_f` is the time-averaged flow per injector.
   - `u_k` is a normalised 0–1 rail pump/regulator command; `k_rail` is the absolute rail pressure at `u_k = 1`.
   - The ECU sets `u_k` by feed-forward to hold `ΔP ≈ ΔP_target`, then solves `θ_inj` for the fuel it wants. A `pump_health` factor multiplies `k_rail` in the real system only, and the ECU cannot see it.
   - Woschni `C = 130` with p in bar, equal to `3.26` with p in kPa (D in m, T in K, w in m/s, h in W/m²K).
   - Woschni reference state `(T_r, p_r, V_r)` is at IVC, taken at BDC in the simplified model. Motored pressure `p_m` is polytropic.
   - `C1 = 2.28` (no swirl).
   - Double-Wiebe parameters are fitting parameters. Starting guesses: `f1 = 0.35`, `a1 = a2 = 5`, `m1 = 2.0`, `m2 = 1.2`, `φ_s1 = −15°`, `Δφ1 = 30°`, `φ_s2 = −5°`, `Δφ2 = 55°`. They are placeholders, not OEM data.
   - Injection start angle is not modelled (it does not change delivered quantity in a mean-value PFI model). Monitored "injection parameters" are `θ_inj`, `u_k`, `ΔP`, plus spark timing `φ_s1`.
6. **Two-time-scale solution:** crank-angle-resolved cylinder solve, time-domain solve for everything else.

## 5. Nomenclature (main symbols)

| Symbol | Meaning |
|---|---|
| `φ`, `ω`, `N` | crank angle (rad, TDC = 0), crank speed (rad/s), engine speed (rpm), `ω = 2πN/60` |
| `D, S, r, l` | bore, stroke, crank radius `S/2`, rod length |
| `V_d, V_d,tot, V_c` | displacement per cylinder, total displacement, clearance volume |
| `p_amb, T_amb` | ambient pressure, temperature |
| `p_ic, p_im, p_em` | intercooler plenum, intake manifold, exhaust manifold pressure |
| `T_ic, T_im, T_em` | matching temperatures; `MAP = p_im`, `MAT = T_im` |
| `ω_tc`, `J_tc` | turbo shaft speed, inertia |
| `m_a, m_f, m_cyl` | fresh air, fuel, total trapped mass per cycle per cylinder |
| `Q_fuel` | heat available from fuel per cycle per cylinder |
| `κ_a, κ_g, γ` | heat-capacity ratios: intake air, exhaust gas, in-cylinder |
| `N_cyl` | number of cylinders (4) |

---

## 6. Stage-by-stage equations

### S1 — Atmosphere [added, standard ISA]
Input: altitude `h`. Output: `p_amb`, `T_amb`.
```
T_amb = T_0 − 0.0065·h
p_amb = p_0·(T_amb/T_0)^5.2561            (valid below 11 km)
```

### S2 — Compressor (station 1 → 2) [paper structure, surrogate map added]
Inputs: `p_amb`, `T_amb`, states `ω_tc`, `p_ic`. Outputs: `ṁ_C`, `T_2`, `P_C`.
```
p_1 = p_amb,   T_1 = T_amb
π_C = p_2/p_1 = p_ic / ((1 − ξ_ic)·p_amb)              ξ_ic = intercooler pressure-loss fraction
U_c = ω_tc·r_c

Head coefficient:      Ψ_C = c_p,a·T_1·(π_C^((κ_a−1)/κ_a) − 1) / (U_c²/2)
Surrogate map:         Ψ_C = Ψ_0 − b·Φ_C²    →   Φ_C = √((Ψ_0 − Ψ_C)/b)        (ṁ_C = 0 if Ψ_C ≥ Ψ_0, surge clip)
Mass flow:             ṁ_C = Φ_C·ρ_1·π·r_c²·U_c,       ρ_1 = p_1/(R_a·T_1)
Efficiency:            η_C = η_C,max − k_η·(Φ_C − Φ_η)²
Outlet temperature:    T_2 = T_1·[1 + (1/η_C)·(π_C^((κ_a−1)/κ_a) − 1)]
Compressor power:      P_C = ṁ_C·c_p,a·(T_2 − T_1)
```
A manufacturer map replaces the surrogate if available.

### S3 — Intercooler and plenum [paper: non-accumulating exchanger; plenum added]
Inputs: `T_2`, `ṁ_C`, `T_cool`, `ṁ_thr`. State: `p_ic`. Output: `T_ic`.
```
T_ic = T_2 − ε_ic·(T_2 − T_cool)
ṁ_ic = ṁ_C                                            (exchanger stores no gas)
dp_ic/dt = (R_a·T_ic/V_ic)·(ṁ_C − ṁ_thr)
```

### S4 — Throttle and intake manifold → MAP, MAT [added; paper: uniform-state manifold, no manifold heat transfer]
Inputs: `p_ic`, `T_ic`, throttle `θ_th`, `N`, `η_v`. State: `p_im`.
```
Orifice function:
  Ψ(Π; κ) = √( (2κ/(κ−1))·(Π^(2/κ) − Π^((κ+1)/κ)) )        for Π ≥ Π_crit = (2/(κ+1))^(κ/(κ−1))
  Ψ(Π; κ) = √κ·(2/(κ+1))^((κ+1)/(2(κ−1)))                  for Π < Π_crit (choked)

Throttle flow:     ṁ_thr = C_d,th·A_th(θ_th)·p_ic/√(R_a·T_ic)·Ψ(Π; κ_a),      Π = p_im/p_ic
                   A_th(θ_th): monotonic map from idle-leak area to full-open area
Manifold:          dp_im/dt = (R_a·T_im/V_im)·(ṁ_thr − ṁ_air)
Engine air flow:   ṁ_air = N_cyl·m_a·N/120                (m_a from S5)
Temperature:       T_im = T_ic                             (throttling is isenthalpic)

MAP = p_im,      MAT = T_im
```

### S5 — Cylinder filling [added; residual-gas and speed-density]
Inputs: `p_im`, `T_im`, `T_exh,prev`, `m_f` (from S6). Outputs: `m_a`, `m_cyl`, IVC reference state.
```
Fresh air per cycle per cylinder:     m_a = η_v·p_im·V_d / (R_a·T_im)
Total trapped charge:                 m_cyl = (m_a + m_f) / (1 − x_res)               (x_res = residual fraction; PFI: fuel is in the charge before IVC)
Mixing estimate (calibration target): T_IVC,mix = (1 − x_res)·T_im + x_res·T_exh,prev
Reference state:                      p_r = p_im,   V_r = V_IVC (= V_BDC),   T_r = p_r·V_r/(m_cyl·R)
```
`η_v` (map or calibration constant) is chosen so `T_r` matches `T_IVC,mix`. `m_cyl` is constant through the closed cycle.

### S6 — PFI fuel chain [user]
Inputs: `m_a`, `N`, `MAP`, `AFR_target`, `pump_health`. Outputs: `θ_inj`, `m_f`, `Q_fuel`.
```
Fuel wanted (per cycle per cyl):   m_f,des = m_a / AFR_target
Injector flow needed:              ṁ_f,req = m_f,des·(N/120)
ECU rail command (feed-forward):   u_k = clip( (P_MAP + ΔP_target)/k_rail , 0, 1 )
ECU-believed rail:                 P_rail,ECU = k_rail·u_k
                                   ΔP_ECU = max(P_rail,ECU − P_MAP, ΔP_min)
Duty command:                      θ_inj = clip( ṁ_f,req / (C_d·A_max·√(2ρ_f·ΔP_ECU)) , 0, 1 )

Real system:
  P_rail = k_rail·pump_health·u_k              (= k_rail·u_k when healthy)
  ΔP     = max(P_rail − P_MAP, ΔP_min)
  ṁ_f    = C_d·A_max·θ_inj·√(2ρ_f·ΔP)          [kg/s per injector]
  m_f    = ṁ_f / (N/120)                        [kg per cycle per cylinder]

ECU-reported flow:  ṁ_f,ECU = C_d·A_max·θ_inj·√(2ρ_f·ΔP_ECU)
Total fuel flow:    ṁ_f,total = N_cyl·ṁ_f          (real),    N_cyl·ṁ_f,ECU  (reported)
```
The difference `ṁ_f − ṁ_f,ECU` is the model-error signal for Layer B.

Oxygen-limited heat available:
```
m_f,burn = min(m_f, m_a/AFR_st)
m_f,exc  = m_f − m_f,burn
Q_fuel   = m_f,burn·Q_LHV·η_comb − m_f,exc·h_fg          (floored at 0)
```

### S7 — Kinematics [paper Eq. 1 and 14, exact slider-crank]
Inputs: `φ`, `N`. Outputs: geometry terms.
```
x(φ)      = r·(1 − cosφ) + l − √(l² − r²·sin²φ)                  piston travel from TDC
V(φ)      = V_c + A_p·x(φ),        A_p = πD²/4,     V_c = V_d/(CR − 1)
dV/dφ     = A_p·r·sinφ·[1 + (r·cosφ)/√(l² − r²·sin²φ)]
A_cyl(φ)  = 2·A_p + π·D·x(φ)                                     head + piston crown + exposed liner
S_p       = 2·S·N/60                                              mean piston speed
ẍ         = r·ω²·(cosφ + (r/l)·cos2φ)                            piston acceleration (constant ω)
```

### S8 — Double Wiebe heat release [user]
Inputs: `φ`, `Q_fuel`. Outputs: `x_b`, `dQ_comb/dφ`.
```
For i = 1, 2:
  x_bi(φ) = 1 − exp[ −a_i·((φ − φ_si)/Δφ_i)^(m_i+1) ]       for φ_si ≤ φ ≤ φ_si + Δφ_i
  x_bi = 0 before φ_si;   x_bi = 1 − exp(−a_i) after φ_si + Δφ_i

x_b(φ) = f_1·x_b1(φ) + f_2·x_b2(φ),           f_1 + f_2 = 1

dx_bi/dφ = (a_i·(m_i+1)/Δφ_i)·τ_i^(m_i)·exp(−a_i·τ_i^(m_i+1)),      τ_i = (φ − φ_si)/Δφ_i
dx_b/dφ  = f_1·dx_b1/dφ + f_2·dx_b2/dφ

dQ_comb/dφ = Q_fuel·dx_b/dφ                    Q̇_comb = ω·dQ_comb/dφ
```
`x_b` is an algebraic function of `φ`, not a state.

### S9 — Woschni heat transfer [user]
Inputs: `p`, `T`, `V`, `φ`, `N`. Outputs: `h`, `dQ_ht/dφ`.
```
h = C·D^−0.2·p^0.8·T^−0.53·w^0.8                   (C = 3.26 with p in kPa)

w = C_1·S_p + C_2·(V_d·T_r/(p_r·V_r))·(p − p_m)

C_1 = 2.28
C_2 = 0                       during compression (before first heat release)
C_2 = 0.00324  m/(s·K)        during combustion and expansion

Motored pressure:    p_m = p_r·(V_r/V)^n_m
Wall heat rate:      Q̇_ht = A_cyl(φ)·h·(T − T_wall)          (T_wall constant, as in the paper)
Per crank angle:     dQ_ht/dφ = Q̇_ht/ω
```
Unit check: `V_d·T_r/(p_r·V_r)` is K per unit pressure, so the second term of `w` is m/s. Keep `w` positive late in expansion, where `p − p_m` can turn slightly negative.

### S10 — Cylinder first law, IVC → EVO [paper Eq. 27 with valve and fuel-flow terms zero]
Inputs: `dQ_comb/dφ`, `dQ_ht/dφ`, `dV/dφ`. State: `p_cyl`.
```
dp/dφ = (1/V)·[ (γ − 1)·(dQ_comb/dφ − dQ_ht/dφ) − γ·p·dV/dφ ]
T_cyl = p·V / (m_cyl·R)                                        (paper Eq. 26)
```
Integrated from IVC (`φ = −π`, `p = p_r`) through compression (`dQ_comb = 0`, `C_2 = 0`), combustion and expansion to EVO. Mass is constant: `dm_cyl/dt = 0` (paper Eq. 23 with no flow across the valves).

Cycle results:
```
W_gross      = ∮ p·dV                              IVC → EVO
IMEP_gross   = W_gross / V_d
p_max        = max(p_cyl),        p_EVO, T_EVO = state at EVO
Q_wall,cycle = ∫ dQ_ht/dφ dφ
```

### S11 — Gas exchange and exhaust temperature [added]
Inputs: `p_im`, `p_em`, `p_EVO`, `T_EVO`. Outputs: `W_pump`, `T_exh`.
```
Pumping work per cycle per cylinder:    W_pump = (p_im − p_em)·V_d              (negative when p_em > p_im)
Blowdown expansion to manifold:         T_exh = T_EVO·(p_em/p_EVO)^((γ−1)/γ)·(1 − ε_loss)         (p_em < p_EVO)
Exhaust manifold gas temperature:       T_em = T_3 = T_exh
```

### S12 — Exhaust manifold, turbine and wastegate [paper: turbine outlet at ambient; flow functions added]
Inputs: `ṁ_air`, `ṁ_f,total`, `T_3`, `ω_tc`, `u_wg`. State: `p_em`. Outputs: `ṁ_T`, `P_T`, `T_4`.
```
Exhaust mass flow:     ṁ_exh = N_cyl·(m_a + m_f)·N/120
Manifold:              dp_em/dt = (R_g·T_em/V_em)·(ṁ_exh − ṁ_T − ṁ_wg)
Turbine flow:          ṁ_T  = A_T,eff·p_3/√(R_g·T_3)·Ψ(p_4/p_3; κ_g),           p_3 = p_em,  p_4 = p_amb
Wastegate flow:        ṁ_wg = C_d,wg·A_wg,max·u_wg·p_3/√(R_g·T_3)·Ψ(p_4/p_3; κ_g)

Blade speed ratio:     BSR = U_T / √( 2·c_p,g·T_3·[1 − (p_4/p_3)^((κ_g−1)/κ_g)] ),        U_T = ω_tc·r_T
Turbine efficiency:    η_T = η_T,max·[1 − k_T·(BSR/BSR_opt − 1)²]
Turbine power:         P_T = η_T·ṁ_T·c_p,g·T_3·[1 − (p_4/p_3)^((κ_g−1)/κ_g)]
Turbine outlet temp:   T_4 = T_3·[1 − η_T·(1 − (p_4/p_3)^((κ_g−1)/κ_g))]

Boost control (PI):    e = MAP − MAP_ref
                       u_wg = clip( K_P·e + K_I·∫e dt , 0, 1 )                   (wastegate opens when MAP exceeds the reference)
```
The controller sign is `MAP − MAP_ref`; my earlier notes wrote it the other way round, which would close the wastegate on overboost.

### S13 — Turbo shaft torque balance [paper Eq. 28 made dynamic]
State: `ω_tc`.
```
J_tc·dω_tc/dt = (η_m·P_T − P_C) / ω_tc          (η_m lumps bearing friction; keep ω_tc above a small minimum)
```
Steady state (`dω_tc/dt = 0`) gives `η_m·P_T = P_C`, which yields the closed form (station 3 = turbine inlet, 4 = turbine outlet):
```
π_C = { 1 + (ṁ_T/ṁ_C)·(T_3/T_1)·η_C·η_T·η_m·(c_p,g/c_p,a)·[1 − (p_4/p_3)^((κ_g−1)/κ_g)] }^(κ_a/(κ_a−1))
```
This is a consistency check and an initial guess for `ω_tc`, not a per-step calculation. The bracket uses `p_4/p_3` (not `p_3/p_4`), otherwise it is negative.

### S14 — Torque and crankshaft [paper: uniform crank speed and Eqs. 29–31; equation of motion added]
Inputs: `p_cyl(φ)`, `W_pump`, friction, load. State: `ω`.

Crank-angle form (cylinder `i`, phase offset `δ_i` from the firing order):
```
Gas force:             F_gas = (p_cyl − p_cc)·A_p
Cylinder torque:       τ_i(φ) = (p_i − p_cc)·dV_i/dφ − m_rec·ẍ_i·dx_i/dφ
Equation of motion:    J_eff·ω·dω/dφ = Σ_i τ_i(φ − δ_i) + τ_pump − τ_fric − τ_load
Pumping torque:        τ_pump = N_cyl·W_pump/(4π)
```
Mean-value form:
```
T_ind = N_cyl·(W_gross + W_pump)/(4π)
J_eff·dω/dt = T_ind − τ_fric − τ_load
RPM = 60·ω/(2π)
```
The two forms agree over one cycle: `ΔKE = W_gas − W_fric − W_load`.

### S15 — Friction, load, performance metrics [paper Eqs. 29–31; propeller and gearbox added]
```
FMEP   = C_f + 0.005·p_max + 0.162·S_p                (bar; paper's Chen–Flynn form, C_f = 0.130 bar is a diesel value)
τ_fric = FMEP·V_d,tot/(4π)
P_fric = τ_fric·ω

Propeller through gearbox:    ω_p = ω/i,    τ_prop = K_p·ω_p²,     τ_load = τ_prop/(i·η_gb)        (i = 2.54)
Effective inertia:            J_eff = J_crank + J_prop/i²

IMEP_net = IMEP_gross + W_pump·N_cyl/V_d,tot           (i.e. (W_gross + W_pump)/V_d per cylinder)
BMEP     = IMEP_net − FMEP
Brake power:        b_power = BMEP·V_d,tot·N/120
Brake torque:       τ_brake = b_power/ω
Effective eff.:     η_eff = b_power/(ṁ_f,total·Q_LHV)
```

### S16 — Thermal, oil, electrical and vibration blocks [added, one-way]
Inputs: `Q_wall,cycle`, `N`, `T_exh`, `T_amb`.
```
Wall heat power (all cylinders):     Q̇_wall = N_cyl·Q_wall,cycle·N/120

Cooling (two lumped nodes):
  C_h·dT_head/dt = f_head·Q̇_wall − h_hc·(T_head − CHT)
  C_c·dCHT/dt    = h_hc·(T_head − CHT) − h_ca·(CHT − T_amb)

EGT (manifold transport + thermocouple lag):
  τ_egt·dEGT/dt = T_exh − EGT

Oil:
  C_o·dT_oil/dt = P_fric + f_oil·Q̇_wall − h_o·(T_oil − T_amb)
  P_oil = min( k_oil·N·g(T_oil), P_relief ),      g(T_oil) = 1 + c_g·exp(−(T_oil − T_ref)/ΔT_g)

Electrical:
  V_target = min(k_alt·N, V_reg) − I_load·R_batt
  τ_e·dV_bus/dt = V_target − V_bus

Vibration (single-resonance forced response, harmonics k = 1..3):
  f_fire = (N/60)·(N_cyl/2)
  ω_k = 2π·k·f_fire
  F_0 = k_v·(p_max − p_min)
  accel(t) = Σ_k [ (F_0/k)·ω_k² / √((ω_n² − ω_k²)² + (2ζ·ω_n·ω_k)²) ]·sin(ω_k·t − ψ_k)
```
`f_head`, `f_oil`, capacitances, conductances, `k_oil`, `k_alt` are estimates to be fitted. The gains used in the first draft of this model were found to be badly scaled (oil pressure pinned at the relief limit, alternator never regulating), so they must be re-derived rather than reused.

### S17 — Measurement layer (what the sensors report) [added]
```
Sensor lag:                   τ_s·dy/dt = x − y
Reported value:               y_meas = y + b(t) + ε              (b: drift/bias, ε: noise)
NTC thermistor (CHT, oil, MAT): R(T) = R_0·exp[ B·(1/T − 1/T_0) ],      V_out = V_ref·R/(R + R_ref)
Type K thermocouple (EGT):    E = S_K·(T_hot − T_ref),          S_K ≈ 41 µV/K
Piezoresistive (MAP, oil P):  V_out = S_p·p·V_exc
Crank sensor (RPM):           f_pulse = Z·N/60                  (Z = number of teeth)
FADEC fuel flow:              ṁ_f,ECU (S6) with ±10% stated tolerance
```

---

## 7. Feedback loops

```
ω → S_p → h (Woschni)                        ω → dφ→dt conversion in every rate
N → m_a (via ṁ_air) → m_f,des → θ_inj → m_f → Q_fuel → p_cyl(φ) → torque → ω
MAP, MAT → m_a, m_cyl → combustion → T_ind
p_im → u_k → P_rail → ΔP → m_f                (rail follows boost)
T_EVO, p_EVO → T_exh → T_3 → P_T → ω_tc → π_C → p_ic → MAP, MAT
p_em → W_pump (torque) and T_exh (blowdown)
MAP error → PI → u_wg → ṁ_wg → p_em → P_T
T_exh → T_exh,prev → T_IVC → next cycle's charge
pump_health → P_rail → ΔP → m_f               (invisible to the ECU, so ṁ_f ≠ ṁ_f,ECU)
```

## 8. Equations solved simultaneously

**Coupled ODE states**

| Group | State | Equation |
|---|---|---|
| Cylinder | `p_cyl` (one per cylinder if separated) | S10 |
| Crankshaft | `θ`, `ω` | `dθ/dt = ω`, S14 |
| Air path | `ω_tc`, `p_ic`, `p_im`, `p_em` | S13, S3, S4, S12 |
| Boost control | `z_wg = ∫e dt` (PI integrator) | S12 |

That is 8 coupled states for one cylinder model (11 with four separate cylinders). The Watson-model states (`m_fb`, ignition delay, β, φ dynamics) are gone, and `m_cyl` is constant.

**Algebraic relations evaluated with them**
```
S1 atmosphere;  S2 Ψ_C, Φ_C, ṁ_C, η_C, T_2, P_C;  S4 orifice flows;
S5 m_a, m_cyl, reference state;  S6 u_k, ΔP, θ_inj, m_f, Q_fuel;
S7 V, dV/dφ, A_cyl, S_p;  S8 x_b, dx_b/dφ, dQ_comb/dφ;
S9 p_m, w, h, dQ_ht/dφ;  T_cyl from the gas law;
S11 W_pump, T_exh;  S12 ṁ_T, ṁ_wg, BSR, η_T, P_T, T_4;  S15 friction and load torques
```

**One-way (solved afterwards):** S16 (cooling, EGT, oil, bus voltage, vibration) and S17 (sensor models).

**No algebraic loop:** every algebraic quantity is computed from states and inputs only (the fuel chain uses `p_im, T_im, N, pump_health`; Woschni uses `p, T, V, φ`).

## 9. Solution strategy (two time scales)

1. **Fast (crank angle):** integrate S10 from IVC to EVO at frozen `ω` and frozen manifold states.
2. **Handoff:** cycle averages (`T_ind`, `m_f`, `T_exh`, `Q_wall,cycle`, `ṁ_air`, `p_max`) go to the slow solve.
3. **Slow (time):** advance `ω`, `ω_tc`, `p_ic`, `p_im`, `p_em`, `z_wg` with a stiff integrator (the manifold volumes make the system stiff).
4. **One-way blocks:** update S16 and S17, then feed the new manifold states and `T_exh` into the next cycle.

Validity: combustion (~2 ms at 5500 rpm) is much faster than the rotational and air-path dynamics (~100–500 ms).
A monolithic run (all states together over many cycles) is the option for validation and the only route to torque ripple and ω dips.

## 10. Open items

1. **Turbo choices still pending:** throttle location and MAP definition (this file puts the throttle after the intercooler, MAP after the throttle), real compressor/turbine maps vs surrogates, the boost reference schedule `MAP_ref`, 4-state vs 2-state model.
2. **Cylinders:** identical, or four separate (needed for per-cylinder fault injection in Layer C).
3. **Gas properties in the cylinder:** constant effective `γ` (tuned for burned gas) vs temperature- and composition-dependent `c_v`. A single burned-gas `γ` is a poor fit for compression, so a `γ` that varies with `x_b` is worth considering.
4. **Parameters to fit or derive:** double-Wiebe set, `η_v`, `x_res`, turbo map constants, thermal capacitances and conductances, oil and alternator gains, `K_p`, `J_eff`, `T_wall`.
5. **Friction:** the FMEP constants are diesel values from the paper and are only an approximation for this engine.
6. **Uncited items:** the Watson correlation and the Krieger–Borman polynomials in the paper are no longer used; if you later want temperature-dependent `c_v`, the Krieger–Borman route in the paper is the reference.

 "for open choices, yes gamma should be changing, so pls do that, friction leave it as it is, use temperature dependent cv, for this model assume only 1 cylinder for now, and when i increase throttle only fuel injector should increse i think let it be independent of turbo for now, find douuble wiebe set, n v is a known value and is recalculated every time ig, x res is sensor dependent will be known to the model, T wall can we found by heat transfer equation to the coolant, J eff will be known as well, K_p and other values will be known as well"