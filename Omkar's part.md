# UAV Piston Engine Health Monitoring Workflow

## Complete Flowchart with Mathematical Model and Data Processing

This document describes the complete workflow represented in the flowchart, from operating-condition inputs through physics-based engine modeling, acoustic modeling, sensor prediction, UKF-based health estimation, and final health/fault outputs.

---

## 1. Operating Conditions

At time step \(k\), the engine model receives the operating-condition vector

\[
w_k =
\begin{bmatrix}
h_k\\
V_k\\
\delta_k\\
N_k\\
u_k
\end{bmatrix}
\]

where:

- \(h_k\): altitude
- \(V_k\): airspeed
- \(\delta_k\): throttle command
- \(N_k\): engine speed in RPM
- \(u_k\): rail/MAP command

These operating conditions drive the subsequent atmosphere, boost, fuel-injection, combustion, thermal, and acoustic calculations.

---

## 2. Atmosphere Model (ISA)

The International Standard Atmosphere model converts altitude into ambient temperature, pressure, and density.

### Ambient temperature

\[
T_{amb}=T_0-Lh_k
\]

### Ambient pressure

\[
p_{amb}
=
p_0
\left(
\frac{T_{amb}}{T_0}
\right)^{\frac{g}{RL}}
\]

### Ambient density

\[
\rho_{amb}
=
\frac{p_{amb}}{RT_{amb}}
\]

The outputs are

\[
T_{amb},\qquad p_{amb},\qquad \rho_{amb}.
\]

---

## 3. Boost / Manifold Pressure Model

The turbocharger health parameter modifies the boost contribution to manifold pressure.

\[
P_{MAP}
=
p_{amb}
+
u_k\theta_{turbo}P_{boost,max}
\]

where:

- \(\theta_{turbo}\): turbo health parameter
- \(u_k\): boost/rail command
- \(P_{boost,max}\): maximum modeled boost contribution

The model therefore represents the qualitative relationship

\[
\theta_{turbo}\downarrow
\quad\Rightarrow\quad
P_{MAP}\downarrow.
\]

The output is

\[
P_{MAP}.
\]

---

## 4. Fuel Injector Model — Compression-Ignition Engine

The injector model calculates fuel flow from rail pressure, manifold pressure, injector effective area, and injector health.

### Rail pressure

\[
P_{rail}=k_{rail}u_k
\]

### Pressure difference

\[
\Delta P
=
\max(P_{rail}-P_{MAP},\Delta P_{min})
\]

### Fuel mass flow

\[
\dot m_f
=
C_dA_{max}\theta_{inj}
\sqrt{2\rho_f\Delta P}
\]

where:

- \(C_d\): discharge coefficient
- \(A_{max}\): maximum injector area
- \(\theta_{inj}\): injector health parameter
- \(\rho_f\): fuel density

For each cylinder,

\[
\dot m_{f,i}=\dot m_f,
\qquad i=1,\ldots,n_{cyl}.
\]

Total fuel flow is

\[
\dot m_{f,total}
=
\sum_{i=1}^{n_{cyl}}\dot m_{f,i}.
\]

---

## 5. Crank-Angle Combustion Model — Double Wiebe

The fuel flow is converted into heat release and cylinder pressure/temperature evolution.

### Double-Wiebe burned-fraction model

\[
x_b(\phi)
=
f_1x_{b1}(\phi)
+
f_2x_{b2}(\phi)
\]

with

\[
x_{b1}
=
1-
\exp
\left[
-a_1
\left(
\frac{\phi-\phi_{s1}}{\Delta\phi_1}
\right)^{m_1+1}
\right]
\]

and

\[
x_{b2}
=
1-
\exp
\left[
-a_2
\left(
\frac{\phi-\phi_{s2}}{\Delta\phi_2}
\right)^{m_2+1}
\right].
\]

The heat-release increment is

\[
dQ(\phi)
=
Q_{fuel}\,dx_b(\phi).
\]

The fuel chemical energy is

\[
Q_{fuel}
=
m_{fuel,cycle}\,LHV.
\]

---

### Engine geometry

Displacement volume is

\[
V_d
=
\frac{\pi}{4}B^2S
\]

and clearance volume is

\[
V_c
=
\frac{V_d}{CR-1}.
\]

The cylinder volume is obtained from slider-crank geometry:

\[
V(\phi)
=
V_c+
\frac{\pi B^2}{4}x(\phi).
\]

The piston position is determined from crank angle and connecting-rod geometry.

---

### Thermodynamic integration

The cylinder temperature and pressure are obtained from the first law and ideal-gas relation.

\[
mc_vdT=dQ-PdV
\]

and

\[
P=\frac{mRT}{V}.
\]

The combustion model produces:

- cylinder pressure \(P_i(\phi)\)
- cylinder temperature \(T_i(\phi)\)
- peak cylinder pressure \(P_{peak,i}\)
- peak cylinder temperature \(T_{peak,i}\)
- total combustion heat \(Q_{total,i}\)

The pressure fluctuation used by the acoustic model is

\[
p'_i(\phi)
=
P_i(\phi)-\overline{P_i}.
\]

---

## 6. Thermal Models — CHT and EGT

### Cylinder-head temperature

The air-side heat-transfer coefficient is modeled as

\[
h_{air}
=
h_0
\left(
\frac{V_{air}}{V_{ref}}
\right)^{0.6}.
\]

Cylinder-head temperature is

\[
T_{CHT,i}
=
T_{amb}
+
\frac{Q_{comb,i}}
{h_{air}A_{fin}\theta_{cool,i}}.
\]

Here \(\theta_{cool,i}\) represents the cooling-health parameter for cylinder \(i\).

### Exhaust-gas temperature

The EGT model uses the combustion energy and exhaust mass flow:

\[
T_{EGT,i}
=
T_{amb}
+
k_{EGT}
\frac{Q_{comb,i}}
{\dot m_{air}c_p}.
\]

The outputs are

\[
T_{CHT,1},\ldots,T_{CHT,n_{cyl}}
\]

and

\[
T_{EGT,1},\ldots,T_{EGT,n_{cyl}}.
\]

---

## 7. Acoustic Engine Model

The acoustic model uses cylinder-pressure fluctuations as the source excitation.

### Step 1 — Pressure fluctuation

\[
p'_i(\phi)
=
P_i(\phi)-\overline{P_i}.
\]

### Step 2 — Firing frequency

For a four-stroke engine,

\[
f_{fire}
=
\frac{n_{cyl}N}{120}.
\]

The harmonic frequencies are

\[
f_h=hf_{fire},
\qquad h=1,2,\ldots,H.
\]

### Step 3 — FFT

The pressure fluctuation is transformed into the frequency domain:

\[
A_h
=
\left|
FFT\{p'(t)\}
\right|_{f=f_h}.
\]

### Step 4 — Acoustic resonance

The second-order resonance magnitude is

\[
|H(f)|
=
\frac{1}
{\sqrt{
(1-r^2)^2+(2\zeta r)^2
}}
\]

where

\[
r=\frac{f}{f_{res}}
\]

and

\[
\zeta
=
\zeta_{healthy}\theta_{acoustic}.
\]

Thus the acoustic-health parameter directly modifies the damping.

### Step 5 — Acoustic RMS

The harmonic contributions are combined as

\[
p_{acoustic,rms}
=
G_{acoustic}
\sqrt{
\frac{1}{2}
\sum_{h=1}^{H}
(A_h|H_h|)^2
}.
\]

The acoustic RMS pressure becomes an additional sensor quantity.

---

## 8. Predicted Sensor Vector

All physics-model outputs are combined into the predicted sensor vector

\[
\hat z_k
=
F(w_k,\theta_k).
\]

A representative structure is

\[
\hat z_k=
\begin{bmatrix}
N_k\\
P_{MAP}\\
\dot m_{f,total}\\
T_{CHT,1}\\
\vdots\\
T_{CHT,n_{cyl}}\\
T_{EGT,1}\\
\vdots\\
T_{EGT,n_{cyl}}\\
p_{acoustic,rms}
\end{bmatrix}.
\]

The measurement model is

\[
z_k
=
\hat z_k+v_k
\]

with

\[
v_k\sim\mathcal N(0,R).
\]

Therefore, the measured sensor vector is the predicted vector plus sensor noise.

---

# 9. Unscented Kalman Filter (UKF)

The UKF estimates the engine health parameters from the sensor measurements.

The health-state vector is

\[
\theta=
\begin{bmatrix}
\theta_{inj}\\
\theta_{turbo}\\
\theta_{cool,1}\\
\vdots\\
\theta_{cool,n_{cyl}}\\
\theta_{acoustic}
\end{bmatrix}.
\]

For the four-cylinder compression-ignition configuration this contains:

\[
\theta=
[
\theta_{inj},
\theta_{turbo},
\theta_{cool,1},
\theta_{cool,2},
\theta_{cool,3},
\theta_{cool,4},
\theta_{acoustic}
]^T.
\]

---

## 9.1 State model

The health parameters are modeled as a random walk:

\[
\theta_k
=
\theta_{k-1}+\xi_k
\]

where

\[
\xi_k\sim\mathcal N(0,Q).
\]

The covariance prediction is therefore

\[
P_k^- = P_{k-1}+Q.
\]

---

## 9.2 Sigma-point generation

For an \(n\)-dimensional health state,

\[
\lambda=\alpha^2(n+\kappa)-n.
\]

The sigma points are

\[
\chi_0=\hat\theta
\]

and

\[
\chi_i
=
\hat\theta+
\left[
\sqrt{(n+\lambda)P}
\right]_i,
\]

\[
\chi_{i+n}
=
\hat\theta-
\left[
\sqrt{(n+\lambda)P}
\right]_i.
\]

Thus there are

\[
2n+1
\]

sigma points.

---

## 9.3 Measurement prediction for every sigma point

Each sigma point is passed through the complete nonlinear engine model:

\[
z_i
=
F(w_k,\chi_i).
\]

The predicted measurement mean is

\[
\hat z_k
=
\sum_{i=0}^{2n}
W_i^{(m)}z_i.
\]

This is the key connection between the physics model and the UKF.

---

## 9.4 Measurement covariance

The predicted measurement covariance is

\[
P_{zz}
=
R+
\sum_{i=0}^{2n}
W_i^{(c)}
(z_i-\hat z_k)
(z_i-\hat z_k)^T.
\]

The matrix \(R\) represents sensor uncertainty.

---

## 9.5 State-measurement cross covariance

The cross covariance is

\[
P_{\theta z}
=
\sum_{i=0}^{2n}
W_i^{(c)}
(\chi_i-\hat\theta)
(z_i-\hat z_k)^T.
\]

This quantity captures how changes in each health parameter affect the predicted sensor measurements.

---

## 9.6 Kalman gain

The Kalman gain is

\[
K
=
P_{\theta z}P_{zz}^{-1}.
\]

---

## 9.7 Innovation

The difference between the actual measurement and predicted measurement is

\[
r_k
=
z_k-\hat z_k.
\]

This is the innovation or measurement residual.

---

## 9.8 Health-state update

The health estimate is corrected using

\[
\hat\theta_k
=
\hat\theta_k^-
+
K
(z_k-\hat z_k).
\]

The covariance is updated as

\[
P_k
=
P_k^-
-
KP_{zz}K^T.
\]

The updated health vector is then used in the next time step.

---

# 10. Health Index Calculation

Each estimated health parameter is converted into a normalized health index.

\[
HI_i
=
clip
\left(
\frac{
\hat\theta_i-\theta_{fail,i}
}{
\theta_{healthy,i}-\theta_{fail,i}
},
0,1
\right).
\]

The percentage form is

\[
HI_i(\%)
=
100HI_i.
\]

The calculation is applied separately to:

- injector health
- turbo health
- each cooling health parameter
- acoustic health

---

# 11. Overall Engine Health and Fault Localization

The subsystem health indices are combined to obtain the overall engine health.

\[
HI_{overall}
=
\min_i(HI_i).
\]

The subsystem associated with the limiting health index is identified as the limiting subsystem.

The final outputs include:

- health-index time histories
- estimated health parameters
- overall engine health
- fault/subsystem identification

---

# 12. Complete End-to-End Data Flow

The complete forward and estimation loop is:

\[
\boxed{
w_k
\rightarrow
ISA
\rightarrow
P_{MAP}
\rightarrow
\dot m_f
\rightarrow
\text{Double-Wiebe}
\rightarrow
P(\phi),T(\phi)
}
\]

followed by

\[
\boxed{
P(\phi)
\rightarrow
CHT/EGT
\quad\text{and}\quad
P(\phi)-\bar P
\rightarrow
FFT
\rightarrow
\text{Acoustic RMS}
}
\]

then

\[
\boxed{
\text{Engine-model outputs}
\rightarrow
\hat z_k
\rightarrow
z_k
}
\]

and finally

\[
\boxed{
z_k
\rightarrow
UKF
\rightarrow
\hat\theta_k
\rightarrow
HI_k
\rightarrow
\text{Fault localization}
}
\]

The UKF closes the loop by using the estimated health state at the next time step:

\[
\boxed{
\hat\theta_k
\rightarrow
F(w_{k+1},\hat\theta_k)
\rightarrow
\hat z_{k+1}
}
\]

so the complete system repeatedly performs:

\[
\boxed{
\text{Operating conditions}
\rightarrow
\text{Physics model}
\rightarrow
\text{Sensors}
\rightarrow
\text{UKF}
\rightarrow
\text{Health estimate}
\rightarrow
\text{Next time step}
}
\]

---

## 13. Conceptual Architecture

```text
                OPERATING CONDITIONS
                         |
                         v
                 +----------------+
                 |   ISA Model    |
                 +----------------+
                         |
                         v
                 +----------------+
                 | Turbo / MAP    |
                 +----------------+
                         |
                         v
                 +----------------+
                 | Fuel Injector  |
                 +----------------+
                         |
                         v
                 +----------------------+
                 | Double-Wiebe +       |
                 | Crank-Angle Model    |
                 +----------------------+
                    /             \
                   /               \
                  v                 v
          +---------------+   +----------------+
          | CHT / EGT     |   | Acoustic Model |
          +---------------+   +----------------+
                  \                 /
                   \               /
                    v             v
                 +-------------------+
                 | Predicted Sensors |
                 +-------------------+
                         |
                    + Noise
                         |
                         v
                 +-------------------+
                 | Measured Sensors  |
                 +-------------------+
                         |
                         v
                 +-------------------+
                 |       UKF         |
                 | Sigma Points      |
                 | Prediction        |
                 | Measurement       |
                 | Update            |
                 +-------------------+
                         |
                         v
                 +-------------------+
                 | Health Parameters |
                 +-------------------+
                         |
                         v
                 +-------------------+
                 | Health Indices    |
                 +-------------------+
                         |
                         v
                 +-------------------+
                 | Fault Localization|
                 +-------------------+
                         |
                         +------------------+
                                            |
                                            v
                                  NEXT TIME STEP
```

---

## 14. Central Mathematical Relationship

The overall digital-twin relationship can be summarized as

\[
\boxed{
\hat z_k=F(w_k,\theta_k)
}
\]

where:

- \(w_k\) contains the operating conditions.
- \(\theta_k\) contains the unknown engine-health parameters.
- \(F(\cdot)\) contains the atmosphere, turbo, injector, combustion, thermal, and acoustic physics.
- \(\hat z_k\) contains the predicted sensor measurements.

The real sensors provide

\[
\boxed{
z_k=F(w_k,\theta_k)+v_k
}
\]

and the UKF solves the inverse estimation problem

\[
\boxed{
z_k
\quad\Longrightarrow\quad
\hat\theta_k.
}
\]

The estimated health state is then transformed into health indices:

\[
\boxed{
\hat\theta_k
\quad\Longrightarrow\quad
HI_k
\quad\Longrightarrow\quad
\text{health/fault information}.
}
\]
