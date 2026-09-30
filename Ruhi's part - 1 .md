# ENGINE COOLING DEGRADATION MODEL

**Flow:** inputs → degradation mechanisms → modified cooling capacity → thermal response → outputs

---

## 1. INPUTS & BASELINE OPERATING CONDITIONS (HEALTHY SYSTEM)

### INPUTS

- Engine geometry (bore, stroke, CR)
- Engine speed, \(N\)
- Manifold pressure, \(p_{in}\)
- Intake temperature, \(T_{in}\)
- Air–fuel ratio, \(\lambda\)
- Ambient temperature, \(T_{amb}\)
- Ram-air velocity, \(v_{ram}\)
- Baseline coolant and oil flow rates
- Baseline radiator and oil cooler \(UA\)

### KEY EQUATIONS / MODELS

- Cylinder volume (slider-crank)

\[
V(\theta)=V_c+\frac{V_d}{2}
\left(
1-\cos\theta+\frac{1}{R}\sin^2\theta
\right)
\]

- Thermodynamic cycle (Wiebe + first law)

- Gas-side heat transfer (Woschni)

\[
\dot Q_w(\theta)=hA_w(T_g-T_w)
\]

### EXPECTED OUTPUTS

- Baseline heat generation

\[
\dot Q_{comb}(\theta)
\]

- Baseline wall heat transfer

\[
\dot Q_{wall}(\theta)
\]

- Total heat to cooling system

\[
Q_{wall,cycle}
\]

- Component heat partition
  - Head
  - Cylinder
  - Piston

### ASSUMPTIONS

- Fixed engine geometry
- Ideal gas behaviour
- Known combustion model parameters
- Closed system for thermodynamic cycle
- Healthy (undamaged) cooling system as reference

---

## 2. COOLING SYSTEM & DEGRADATION MECHANISMS

### COOLING SYSTEM COMPONENTS

- **Radiator**
  - Coolant → air
- **Coolant circuit**
  - Pump, passages
- **Oil cooler**
  - Oil → air
- **Ram-air cooling**
  - Cylinder and head fins

### DEGRADATION MECHANISMS

- Radiator fouling / blockage
  - Dirt, insects, corrosion
- Reduced coolant flow
  - Pump wear, cavitation, leakage
- Oil cooler fouling
  - Contamination, blockage
- Ram-air flow reduction
  - Inlet obstruction, lower airspeed
- Internal scaling / deposits
  - Reduced heat-transfer coefficients
- Coolant/oil mixture
  - Contamination, reduced effective heat capacity

### MATHEMATICAL REPRESENTATION

- **Radiator \(UA\) degradation**

\[
UA_{rad}=(1-D_{rad})\,UA_{rad,0}
\]

- **Oil cooler \(UA\) degradation**

\[
UA_{oil}=(1-D_{oil})\,UA_{oil,0}
\]

- **Coolant flow degradation**

\[
\dot m_c=(1-D_{flow})\,\dot m_{c,0}
\]

- **Ram-air heat-transfer degradation**

\[
h_{air}=(1-D_{air})\,h_{air,0}
\]

- **Internal heat-transfer degradation**

\[
h=(1-D_{HTC})\,h_0
\]

### DEGRADATION PARAMETERS

- \(D_{rad}\): radiator effectiveness loss (0–1)
- \(D_{oil}\): oil cooler effectiveness loss (0–1)
- \(D_{flow}\): coolant flow reduction (0–1)
- \(D_{air}\): ram-air cooling reduction (0–1)
- \(D_{HTC}\): internal heat-transfer loss (0–1)
- Single or combined degradation scenarios

---

## 3. DEGRADED COOLING CAPACITY

### INPUTS

- Heat rejection loads (from Stage 1)
- Component heat flows:
  - \(\dot Q_{head}\) → coolant
  - \(\dot Q_{cylinder}\) → ram-air and/or coolant, depending on the cooling path
  - \(\dot Q_{piston}\) → oil
- Degradation parameters:
  - \(D_{rad}\)
  - \(D_{oil}\)
  - \(D_{flow}\)
  - \(D_{air}\)
  - \(D_{HTC}\)

### KEY EQUATIONS / MODELS

#### 3.1 Wall-to-coolant heat transfer — explicitly included

The heat transferred from the metal wall/component to the coolant is:

\[
\boxed{
\dot Q_{wall\rightarrow coolant}
=
UA_{wall-cool}
\left(T_{wall}-T_{cool}\right)
}
\]

For individual components, this can be written as:

\[
\boxed{
\dot Q_{head\rightarrow coolant}
=
UA_{head-cool}
\left(T_{head}-T_{cool}\right)
}
\]

\[
\boxed{
\dot Q_{cyl\rightarrow coolant}
=
UA_{cyl-cool}
\left(T_{cyl}-T_{cool}\right)
}
\]

where these paths are included only for components that are actually liquid-cooled.

The corresponding wall/component energy balance is:

\[
\boxed{
m_i c_i\frac{dT_i}{dt}
=
\dot Q_{gas\rightarrow i}
-
\dot Q_{i\rightarrow coolant}
-
\dot Q_{i\rightarrow other}
}
\]

This explicitly closes the thermal path:

\[
\boxed{
\text{combustion gas}
\rightarrow
\text{metal wall}
\rightarrow
\text{coolant}
\rightarrow
\text{radiator}
\rightarrow
\text{ambient}
}
\]

A wall-to-coolant convection model can alternatively be written as:

\[
\dot Q_{wall\rightarrow coolant}
=
h_{cool}A_{cool}
\left(T_{wall}-T_{cool}\right)
\]

with:

\[
UA_{wall-cool}=h_{cool}A_{cool}
\]

If \(D_{HTC}\) is being used specifically to represent degradation of the wall-to-coolant heat-transfer coefficient, then:

\[
h_{cool}=(1-D_{HTC})h_{cool,0}
\]

and therefore, for fixed wetted area:

\[
\boxed{
UA_{wall-cool}
=
(1-D_{HTC})UA_{wall-cool,0}
}
\]

The coolant-side heat-transfer coefficient \(h_{cool}\) should ideally be obtained from an appropriate coolant-flow correlation or experimental data; it should not automatically be assumed equal to the gas-side Woschni coefficient.

#### 3.2 Coolant-side heat rejection

\[
\dot Q_{cool\rightarrow rad}
=
UA_{rad}
\left(T_{cool}-T_{amb}\right)
\]

#### 3.3 Coolant energy balance

For a lumped, well-mixed coolant volume:

\[
\boxed{
m_{cool}c_{p,cool}\frac{dT_{cool}}{dt}
=
\sum \dot Q_{wall\rightarrow coolant}
-
\dot Q_{cool\rightarrow rad}
+
\dot Q_{other\rightarrow coolant}
}
\]

If coolant inlet/outlet flow is explicitly modelled, an enthalpy-flow term should also be included:

\[
m_{cool}c_{p,cool}\frac{dT_{cool}}{dt}
=
\sum\dot Q_{wall\rightarrow coolant}
+
\dot m_c c_{p,cool}(T_{in}-T_{out})
-
\dot Q_{cool\rightarrow rad}
\]

The exact form depends on whether the model treats the coolant as a closed lump or as a circulating control volume.

#### 3.4 Oil-side heat rejection

\[
\dot Q_{oil}
=
UA_{oil}
\left(T_{oil}-T_{amb}\right)
\]

#### 3.5 Convective heat rejection to ram air

\[
\dot Q_{air}
=
h_{air}A_{cyl}
\left(T_{cyl}-T_{ram}\right)
\]

#### 3.6 Flow-dependent coolant heat removal

\[
\dot Q_{flow}
=
\dot m_c c_p
\left(T_{out}-T_{in}\right)
\]

### EXPECTED OUTPUTS

- Degraded \(UA\) values
  - \(UA_{rad}\)
  - \(UA_{oil}\)
  - \(UA_{cyl-air}\)
  - \(UA_{wall-cool}\), where applicable
- Degraded coolant and oil flow rates
  - \(\dot m_c\)
  - \(\dot m_o\)
- Component heat rejection capacities
  - \(\dot Q_{cool}\)
  - \(\dot Q_{oil}\)
  - \(\dot Q_{air}\)
  - \(\dot Q_{wall\rightarrow coolant}\)
- Effective cooling capacity of each subsystem

### ASSUMPTIONS

- Linear degradation model (first-order)
- Degradation affects only cooling-side parameters
- Heat generation (combustion) unchanged
- Degradation uniform over operating range (or specified variation with RPM/load)

---

## 4. THERMAL NETWORK SOLUTION (TIME DOMAIN)

### INPUTS

- Wall heat per cycle (from Stage 1 / gas-side heat-transfer model)
- Degraded cooling parameters (from Stage 3)
- Engine speed, \(N\)
- Ambient and ram-air conditions
  - \(T_{amb}\)
  - \(v_{ram}\)
- Simulation time and time step

### KEY EQUATIONS / MODELS

- **Thermal network energy balance**

\[
\boxed{
m_i c_i\frac{dT_i}{dt}
=
\sum \dot Q_{in}
-
\sum \dot Q_{out}
}
\]

- **Heat transfer between nodes**

\[
\boxed{
\dot Q=UA(T_1-T_2)
}
\]

- **Wall-to-coolant node connection**

\[
\boxed{
\dot Q_{wall\rightarrow coolant}
=
UA_{wall-cool}
(T_{wall}-T_{cool})
}
\]

- **Degraded UA and flow values from Stage 3**

- **Ram-air dependent cylinder cooling**

\[
UA_{cyl-air}
=
UA_0(1-D_{air})
\]

### EXPECTED OUTPUTS

- Time evolution of temperatures:
  - \(T_{head}(t)\)
  - \(T_{cyl}(t)\)
  - \(T_{piston}(t)\)
  - \(T_{cool}(t)\)
  - \(T_{oil}(t)\)
- Heat flows between components
- Energy balance / convergence
- Steady-state and transient temperatures under degraded cooling

### ASSUMPTIONS

- Lumped capacitance model
- Fixed thermal masses and conductances except degraded cooling parameters
- Coolant and oil are well-mixed lumps
- Ambient temperature constant (or specified profile)
- 1D heat-flow paths

---

## 5. COOLING DEGRADATION ANALYSIS & THERMAL MARGINS

### INPUTS

- Component temperatures (from Stage 4)
- Temperature limits:
  - \(T_{head,lim}\)
  - \(T_{cyl,lim}\)
  - \(T_{cool,lim}\)
  - \(T_{oil,lim}\)
- Operating condition range:
  - RPM
  - load
  - \(v_{ram}\)
  - \(T_{amb}\)
- Degradation parameter range (0–1)

### KEY EQUATIONS / MODELS

- **Thermal margin**

\[
M_i=T_{limit,i}-T_i
\]

- **Critical degradation level**

\[
D_{crit}: \quad T_i>T_{limit,i}
\]

- **Sensitivity analysis**

\[
\frac{dT_i}{dD}
\]

- Component temperature vs degradation maps
  - Single degradation mechanisms
  - Combined degradation mechanisms

### EXPECTED OUTPUTS

- Component temperatures vs degradation level
  - e.g. \(T_{cool}\) vs \(D_{rad}\)
- Thermal margins vs degradation
- Pass/fail for each component
- Critical degradation level for each component
- Operating envelopes
  - e.g. \(D_{rad}\) vs RPM/load

### ASSUMPTIONS

- Manufacturer temperature limits
- No detailed structural model
- Steady or quasi-steady analysis
  - transient optional
- Degradation mechanisms independent (or specified interaction)

---

## THERMAL PATH SUMMARY

The complete thermal model should contain the following paths:

### Gas to metal

\[
\boxed{
\text{Gas}
\rightarrow
\text{Head / Cylinder wall / Piston}
}
\]

### Metal to coolant

\[
\boxed{
\text{Head / liquid-cooled cylinder wall}
\rightarrow
\text{Coolant}
}
\]

\[
\dot Q_{wall\rightarrow coolant}
=
UA_{wall-cool}(T_{wall}-T_{cool})
\]

### Piston to oil

\[
\boxed{
\text{Piston}
\rightarrow
\text{Oil}
\rightarrow
\text{Oil cooler}
\rightarrow
\text{Ambient}
}
\]

### Air-cooled component

\[
\boxed{
\text{Cylinder / head}
\rightarrow
\text{Ram air}
\rightarrow
\text{Ambient}
}
\]

### Liquid cooling path

\[
\boxed{
\text{Wall}
\rightarrow
\text{Coolant}
\rightarrow
\text{Radiator}
\rightarrow
\text{Ambient}
}
\]

---

## MODEL CONSISTENCY CHECK

The added wall-to-coolant path is physically required if the model predicts coolant temperature from wall heat transfer. A gas-side wall heat-transfer equation alone gives heat entering the metal; it does not by itself provide the coolant heat-rejection rate.

The complete chain is therefore:

\[
\boxed{
\text{Gas}
\xrightarrow{\;h_gA_g\;}
\text{Wall}
\xrightarrow{\;UA_{wall-cool}\;}
\text{Coolant}
\xrightarrow{\;UA_{rad}\;}
\text{Ambient}
}
\]

For the piston/oil branch:

\[
\boxed{
\text{Gas}
\rightarrow
\text{Piston}
\xrightarrow{\;UA_{p-oil}\;}
\text{Oil}
\xrightarrow{\;UA_{oil}\;}
\text{Ambient}
}
\]

For an air-cooled branch:

\[
\boxed{
\text{Gas}
\rightarrow
\text{Cylinder/head}
\xrightarrow{\;UA_{air}\;}
\text{Ram air}
\rightarrow
\text{Ambient}
}
\]

This makes the thermal network energetically connected from the combustion chamber to the final heat sink.
