# ENGINE OVERHEATING MODEL

**Flow:** inputs → equations/models → outputs

---

## 1. INPUTS & OPERATING CONDITIONS

### INPUTS

- Engine geometry (bore, stroke, CR)
- Engine speed, \(N\)
- Manifold pressure, \(p_{in}\)
- Intake temperature, \(T_{in}\)
- Air–fuel ratio, \(\lambda\)
- Ambient temperature, \(T_{amb}\)
- Ram-air velocity, \(v_{ram}\)

### KEY EQUATIONS / MODELS

- Cylinder volume (slider-crank)

\[
V(\theta)=V_c+\frac{V_d}{2}\left(1-\cos\theta+\frac{1}{R}\sin^2\theta\right)
\]

### EXPECTED OUTPUTS

- Geometric parameters (\(V_d,V_c,A_p,\ldots\))
- Operating condition variables (\(N,p_{in},T_{in},\lambda,v_{ram}\))
- Inputs for thermodynamic and thermal models

### ASSUMPTIONS

- Fixed engine geometry
- Ideal gas behaviour
- Constant ambient conditions (or specified profiles)
- Known valve timing (IVC)

---

## 2. STAGE 1: THERMODYNAMIC CYCLE (IDEAL CYCLE)

### INPUTS

- Crank angle
- Compression ratio, \(CR\)
- Initial pressure, \(p_0\)
- Initial temperature, \(T_0\)
- Air–fuel ratio, \(\lambda\)
- Wiebe parameters \((a,m,\Delta\theta)\)

### KEY EQUATIONS / MODELS

- Wiebe heat release

\[
x_b(\theta)=1-\exp\left[-az^{m+1}\right]
\]

- First law (closed system)

\[
\frac{dP}{d\theta}
=
\frac{\gamma-1}{V}
\left(
\frac{dQ_{comb}}{d\theta}
-
P\frac{dV}{d\theta}
\right)
\]

- Ideal gas relation

\[
P=\frac{mRT}{V}
\]

### EXPECTED OUTPUTS

- In-cylinder pressure, \(P(\theta)\)
- In-cylinder temperature, \(T(\theta)\)
- Heat-release rate, \(\dot Q_{comb}(\theta)\)
- Full cycle \(P-T\) history

### ASSUMPTIONS

- Closed system (IVC to end of modelled cycle)
- Ideal gas with variable \(\gamma\)
- No heat transfer (adiabatic)
- Wiebe combustion model
- Fixed composition (air + fuel)

---

## 3. STAGE 2: GAS-SIDE HEAT TRANSFER (WOSCHNI + FIRST LAW)

### INPUTS

- \(P(\theta),T(\theta)\) from Stage 1
- Gas properties \((R,\gamma)\)
- Woschni constants \((C_1,C_2)\)
- Wall temperature (initial)
- Engine speed, \(N\)

### KEY EQUATIONS / MODELS

- Woschni heat transfer coefficient

\[
h=C_hD^{-0.2}p^{0.8}T^{-0.53}w^{0.8}
\]

where \(C_h\) is the heat-transfer correlation prefactor.

- **Woschni characteristic gas velocity**

\[
\boxed{
w(\theta)
=
C_1S_p
+
C_2
\frac{V_dT_r}{p_rV_r}
\left[p(\theta)-p_{mot}(\theta)\right]
}
\]

- Mean piston speed

\[
\boxed{
S_p=\frac{2SN}{60}
}
\]

where \(S\) is stroke and \(N\) is engine speed in rpm.

- Reference-state quantities

\[
T_r=T(\theta_r),\qquad
p_r=p(\theta_r),\qquad
V_r=V(\theta_r)
\]

where the reference crank angle \(\theta_r\) is selected according to the Woschni implementation being used; commonly the intake-valve-closing state is used.

- \(p_{mot}(\theta)\) is the **motored-cylinder pressure**, i.e. the pressure that would occur at the same crank angle without combustion. It is required to determine the pressure-rise term caused by combustion:

\[
\Delta p_{comb}(\theta)
=
p(\theta)-p_{mot}(\theta)
\]

- Therefore, the characteristic velocity contains two physical contributions:

\[
\boxed{
w=
\underbrace{C_1S_p}_{\text{piston-motion contribution}}
+
\underbrace{
C_2\frac{V_dT_r}{p_rV_r}
(p-p_{mot})
}_{\text{combustion-induced gas-motion contribution}}
}
\]

- Heat transfer rate

\[
\dot Q_w(\theta)=hA_w(T-T_w)
\]

- Coupled solution (iterate)

Update \(P(\theta),T(\theta)\) with heat loss.

### EXPECTED OUTPUTS

- Converged \(P(\theta),T(\theta)\)
- Characteristic gas velocity, \(w(\theta)\)
- Woschni heat-transfer coefficient, \(h(\theta)\)
- Wall heat transfer rate, \(\dot Q_w(\theta)\)
- Total wall heat per cycle, \(Q_{wall,cycle}\)

### ASSUMPTIONS

- Woschni correlation
- Uniform wall temperature (initial)
- Iterative coupling with first law
- Closed cylinder domain
- Motored pressure \(p_{mot}(\theta)\) is available from a separate motored-cycle calculation or an appropriate thermodynamic approximation

> **Implementation note:** In the standard Woschni formulation, the constants \(C_1\) and \(C_2\) belong to the characteristic-velocity equation for \(w\). They should not be confused with the numerical prefactor used in the heat-transfer-coefficient correlation. The exact coefficient form and units must be kept consistent with the chosen Woschni variant.

---

## 4. STAGE 3: ENGINE THERMAL NETWORK (TIME DOMAIN)

### INPUTS

- Wall heat per cycle, \(Q_{wall,cycle}\) (from Stage 2)
- Engine speed, \(N\)
- Ram-air velocity, \(v_{ram}\)
- Ambient temperature, \(T_{amb}\)
- Simulation time and time step

### KEY EQUATIONS / MODELS

- Energy balance (each node)

\[
m_i c_i\frac{dT_i}{dt}
=
\sum \dot Q_{in}
-
\sum \dot Q_{out}
\]

- Heat transfer

\[
\dot Q=UA(T_1-T_2)
\]

- Ram-air dependent cylinder cooling

\[
UA_{cyl-air}=UA_0+k\,v_{ram}^{n}
\]

### EXPECTED OUTPUTS

- Component temperatures (\(T_h,T_{cyl},T_p,T_{cool},T_{oil}\))
- Heat flows between components
- Energy balance / convergence (optional)

### ASSUMPTIONS

- Lumped capacitance model
- Fixed UA values (from data)
- Coolant and oil as well-mixed lumps
- Ambient temperature constant (or specified profile)
- 1D heat flow paths

---

## 5. STAGE 4: OVERHEATING ANALYSIS & OPERATING MAPS

### INPUTS

- Component temperatures (from Stage 3)
- Manufacturer temperature limits (coolant, oil, head, etc.)
- Operating condition range (RPM, load, \(v_{ram}\), etc.)

### KEY EQUATIONS / MODELS

- Thermal margin

\[
M_i=T_{limit,i}-T_i
\]

- Overheating criterion

\[
T_i>T_{limit,i}\Rightarrow \text{Overheat (fail)}
\]

- Sensitivity / maps

Component temperatures vs operating conditions

### EXPECTED OUTPUTS

- Pass/fail for each component
- Thermal margins
- Operating maps (e.g., \(T\) vs RPM/load/ram-air)
- Critical operating conditions

### ASSUMPTIONS

- Manufacturer temperature limits
- Steady ambient conditions (or specified profiles)
- No detailed structural model
- Thermal limits define overheating risk
