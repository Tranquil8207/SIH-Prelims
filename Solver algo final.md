# Aero-Piston Engine Digital Twin --- Equation Dependency Map and Solver Algorithm

## 1. Purpose

This document consolidates the previous two explanations into a single
technical reference for the current aero-piston engine digital-twin
model.

The goal is to make explicit:

1.  Which equation feeds into which subsequent equation.
2.  Which calculations are sequential.
3.  Which equations are coupled and require inner iteration.
4.  How the crank-angle-resolved cylinder model interacts with the
    slower engine/thermal time-domain model.
5.  How the cycle closes through crankshaft speed and thermal feedback.
6.  The complete numbered solver algorithm from Step 0 through the next
    engine cycle.

This is a research/hackathon prototype architecture, **not a certified
airworthiness or flight-critical model**.

------------------------------------------------------------------------

# 2. Current Confirmed Model Architecture

The current architecture is a **two-timescale 0-D thermodynamic model**:

-   **Fast timescale:** crank-angle-resolved cylinder solver.
-   **Slow timescale:** physical-time engine, crankshaft, wall, coolant,
    and oil dynamics.

The current model uses:

-   One cylinder simulated initially; engine totals scale by (N\_{cyl}).
-   Spark-ignition, Port Fuel Injection (PFI).
-   Double Wiebe combustion model.
-   No ignition-delay model; combustion phasing is an input.
-   Woschni heat transfer.
-   Temperature-dependent gas properties.
-   FMEP correlation: \[ FMEP=C+0.005p\_{max}+0.162S_p \]
-   Known MAP, MAT, and exhaust manifold pressure inputs.
-   Crankshaft mean-value dynamics: \[
    J\_{eff}`\frac{d\omega}{dt}`{=tex}=T\_{ind}-T\_{fric}-T\_{load} \]
-   Thermal network for wall, coolant, oil, radiator, oil cooler, and
    ram-air effects.
-   Degradation parameters modifying cooling capacity.

The turbocharger model is intentionally kept for later re-coupling.

------------------------------------------------------------------------

# 3. The Main Concept: This Is Not One Long Equation Chain

The equations are **not** all solved one after another in a single
linear sequence.

There are three nested levels of computation:

``` text
LEVEL 1 — Inner nonlinear iteration
    At one crank angle:
        p ↔ T ↔ Woschni ↔ Qwall ↔ U

LEVEL 2 — Crank-angle marching
    θ = 0° → 720°
    Each converged state becomes the next crank-angle state.

LEVEL 3 — Engine/time-domain marching
    Cycle n → Cycle n+1 → Cycle n+2 → ...
    RPM, wall temperature, coolant temperature, oil temperature,
    and other states are carried forward.
```

The most important coupled loop is:

\[ `\boxed{
p
\rightarrow
h
\rightarrow
Q_{wall}
\rightarrow
U
\rightarrow
T
\rightarrow
p
}`{=tex} \]

The main mechanical feedback loop is:

\[ `\boxed{
p(\theta)
\rightarrow
W_i
\rightarrow
T_{ind}
\rightarrow
\omega
\rightarrow
RPM
\rightarrow
S_p
\rightarrow
Woschni
}`{=tex} \]

The thermal feedback loop is:

\[ `\boxed{
Q_{gas\rightarrow wall}
\rightarrow
T_{wall}
\rightarrow
Q_{wall\rightarrow coolant}
\rightarrow
T_{cool}
\rightarrow
T_{wall}\text{ in the next cycle}
}`{=tex} \]

------------------------------------------------------------------------

# 4. Overall Equation Dependency Map

``` text
                         ENGINE INPUTS
                              |
             +----------------+----------------+
             |                                 |
             v                                 v
        FUEL MODEL                         AIR MODEL
             |                                 |
             v                                 v
       mf per cycle                     trapped charge
             |                                 |
             +---------------+-----------------+
                             |
                             v
                  +----------------------+
                  | CRANK-ANGLE SOLVER   |
                  |      θ = 0 → 720°   |
                  +----------+-----------+
                             |
             +---------------+---------------+
             |               |               |
             v               v               v
           V(θ)           Wiebe          Properties
             |               |               |
             |            dQcomb              |
             |               |               |
             +---------------+---------------+
                             |
                             v
                       FIRST LAW / U
                             ↕
                        T ↔ p ↔ Woschni
                             ↕
                       Qgas → wall
                             |
                             v
                       pressure trace
                           p(θ)
                             |
                +------------+------------+
                |                         |
                v                         v
             ∫ p dV                    pmax
                |                         |
                v                         v
               Wi                       FMEP
                |                         |
                v                         v
              Tind                     Tfric
                |                         |
                +------------+------------+
                             |
                             v
                       CRANKSHAFT
                             |
                             v
                            RPM
                             |
                             +-----------> NEXT CYCLE


       Qgas→wall
            |
            v
        WALL MODEL
            |
            v
         T_wall
            |
            v
     coolant / oil
            |
            v
 radiator / oil cooler / ram air
            |
            v
      Tcool / Toil
            |
            +-------------> NEXT CYCLE'S WALL BOUNDARY
```

------------------------------------------------------------------------

# 5. Step 0 --- Load Current State and Inputs

At the beginning of cycle (n), load the current engine operating point.

## 5.1 Known operating inputs

  --------------------------------------------------------------------------------
  Variable                  Meaning           Status             Used by
  ------------------------- ----------------- ------------------ -----------------
  \(N\)                     Engine speed /    Known/current      piston speed,
                            RPM               state              cycle duration

  (p\_{MAP})                Intake manifold   Known input        trapped charge,
                            absolute pressure                    injector pressure
                                                                 difference

  (T\_{MAT})                Intake manifold   Known input        trapped charge
                            temperature                          

  (p\_{exh})                Exhaust manifold  Known input        later
                            pressure                             pumping/exhaust
                                                                 model

  (`\eta`{=tex}\_v)         Volumetric        Known/recomputed   trapped mass
                            efficiency                           

  (x\_{res})                Residual gas      Known input        trapped mixture
                            fraction                             

  (u_k)                     Normalised rail   Known input        rail pressure
                            command                              

  (`\theta`{=tex}\_{inj})   Injector duty,    Known input        fuel mass
                            0--1                                 

  (T\_{amb})                Ambient           Known input        thermal system
                            temperature                          

  (v\_{ram})                Ram-air velocity  Known input        cooling system
  --------------------------------------------------------------------------------

## 5.2 States carried from the previous cycle

Typical states are:

\[
N_n,`\quad `{=tex}T\_{wall,n},`\quad `{=tex}T\_{cool,n},`\quad `{=tex}T\_{oil,n}
\]

Additional states can be added later.

------------------------------------------------------------------------

# 6. Step 1 --- Calculate Crank Geometry

For the current crank angle:

\[ `\theta=0`{=tex}`\rightarrow720`{=tex}\^`\circ`{=tex} \]

calculate piston position and cylinder volume:

\[ V=V(`\theta`{=tex}) \]

and:

\[ `\frac{dV}{d\theta}`{=tex} \]

The crank angular speed is:

\[ `\omega`{=tex}=`\frac{2\pi N}{60}`{=tex} \]

where:

-   \(N\) = RPM
-   (`\omega`{=tex}) = rad/s

Mean piston speed:

\[ S_p=`\frac{2LN}{60}`{=tex} \]

where:

-   \(L\) = stroke in m
-   (S_p) = mean piston speed in m/s

Dependency:

``` text
RPM
 ↓
ω
 ↓
piston kinematics
 ↓
V(θ), dV/dθ, Sp
```

The geometry is a direct calculation and is not part of the nonlinear
thermodynamic iteration.

------------------------------------------------------------------------

# 7. Step 2 --- Calculate Fuel Mass Per Cycle

The current fuel architecture is PFI.

## 7.1 Rail pressure

\[ P\_{rail}=k\_{rail}u_k \]

where:

-   (P\_{rail}) = fuel rail pressure
-   (k\_{rail}) = rail-pressure gain
-   (u_k) = normalised rail command

A hidden pump-health factor is reserved for real-system fault injection:

\[ P\_{rail,real}=D\_{pump}k\_{rail}u_k \]

where (D\_{pump}) is a fault/degradation parameter. This factor is **not
necessarily used in the nominal model**.

## 7.2 Injector pressure difference

\[ `\Delta `{=tex}P=
`\max`{=tex}(P\_{rail}-P\_{MAP},`\Delta `{=tex}P\_{min}) \]

Important:

-   Both pressures must be absolute or otherwise consistently defined.
-   Do not mix gauge and absolute pressure.

## 7.3 Fuel mass flow

\[ `\dot `{=tex}m_f= C_dA\_{max}`\theta`{=tex}\_{inj}
`\sqrt{2\rho_f\Delta P}`{=tex} \]

where:

-   (C_d) = discharge coefficient
-   (A\_{max}) = maximum injector effective flow area
-   (`\theta`{=tex}\_{inj}) = injector duty, 0--1
-   (`\rho`{=tex}\_f) = fuel density
-   (`\Delta `{=tex}P) = injector pressure differential

## 7.4 Fuel mass per four-stroke cycle

For RPM (N):

\[ `\boxed{
m_{f,cycle}
=
\dot m_f\frac{120}{N}
}`{=tex} \]

This relationship is important because at fixed injector duty:

\[ N`\uparrow`{=tex} `\Rightarrow`{=tex} t\_{cycle}`\downarrow`{=tex}
`\Rightarrow`{=tex} m\_{f,cycle}`\downarrow`{=tex} \]

The dependency chain is:

``` text
u_k + MAP + injector duty
            ↓
        P_rail
            ↓
           ΔP
            ↓
          ṁ_f
            ↓
      mf per cycle
```

------------------------------------------------------------------------

# 8. Step 3 --- Calculate Trapped Air, Residual Gas, and Mixture Mass

The fresh charge is obtained from MAP, MAT, displacement, and volumetric
efficiency.

A simplified starting relation is:

\[ m\_{fresh} `\approx`{=tex} `\eta`{=tex}\_v
`\frac{p_{MAP}V_d}{RT_{MAT}}`{=tex} \]

The exact implementation must remain consistent with the chosen
definition of (`\eta`{=tex}\_v).

Residual gas is included using (x\_{res}).

The trapped mixture must consistently include:

\[ m\_{trapped} = m\_{fresh} + m\_{res} + m_f \]

The bookkeeping convention for (x\_{res}) must be fixed so that fuel,
fresh air, and residual gas are not double-counted.

At the end of this step:

\[ `\boxed{
m_{air},\quad
m_{res},\quad
m_f,\quad
m_{trapped}
}`{=tex} \]

are available to the cylinder solver.

------------------------------------------------------------------------

# 9. Step 4 --- Initialize the Cylinder State

The current convention uses IVC at BDC as the reference state.

Define:

\[ p_r=p\_{IVC} \]

\[ T_r=T\_{IVC} \]

\[ V_r=V\_{IVC} \]

These are also used in the Woschni velocity correlation.

The cylinder solver needs initial:

\[ p_0,`\quad `{=tex}T_0,`\quad `{=tex}U_0 \]

At this point, the previous-cycle state and the current operating
conditions provide the starting point.

------------------------------------------------------------------------

# 10. Step 5 --- Enter the Crank-Angle Loop

Now march through:

\[ `\boxed{
\theta=0\rightarrow720^\circ
}`{=tex} \]

For every crank-angle interval:

\[ `\theta`{=tex}*k`\rightarrow`{=tex}`\theta`{=tex}*{k+1} \]

perform Steps 5.1--5.9.

------------------------------------------------------------------------

# 11. Step 5.1 --- Calculate Instantaneous Cylinder Volume

Calculate:

\[ V_k=V(`\theta`{=tex}\_k) \]

and:

\[ V\_{k+1}=V(`\theta`{=tex}\_{k+1}) \]

Then:

\[ `\Delta `{=tex}V=V\_{k+1}-V_k \]

This volume change enters the first law:

\[ dU=dQ-p,dV \]

The volume is determined purely from crank geometry.

------------------------------------------------------------------------

# 12. Step 5.2 --- Calculate Double-Wiebe Combustion

The confirmed combustion model is:

\[ x_b=f_1x\_{b1}+f_2x\_{b2} \]

with:

\[ x\_{bi} = 1- `\exp`{=tex} `\left[
-a_i
\left(
\frac{\phi-\phi_{si}}
{\Delta\phi_i}
\right)^{m_i+1}
\right]`{=tex}\]

where:

-   (x_b) = total burned fraction
-   (f_1,f_2) = weighting factors
-   (`\phi`{=tex}) = crank angle relative to combustion reference
-   (`\phi`{=tex}\_{si}) = start of combustion for Wiebe component (i)
-   (`\Delta`{=tex}`\phi`{=tex}\_i) = duration of component (i)
-   (a_i) = Wiebe efficiency/shape parameter
-   (m_i) = Wiebe shape exponent

The incremental burned fraction is:

\[ dx_b=x\_{b,k+1}-x\_{b,k} \]

Fuel chemical energy:

\[ Q\_{fuel}=m_fLHV \]

and combustion heat release:

\[ `\boxed{
dQ_{comb}=Q_{fuel}dx_b
}`{=tex} \]

Important modelling decision:

> There is currently **no ignition-delay submodel**. Combustion phasing
> is an input/calibration parameter.

The parameter values are therefore **to be fitted**, not treated as
known Rotax internal calibration data.

------------------------------------------------------------------------

# 13. Step 5.3 --- Start the Coupled Thermodynamic Iteration

This is the first major nonlinear loop.

At each crank-angle step, initialize guesses such as:

\[ T\_{k+1}\^{(0)}=T_k \]

\[ p\_{k+1}\^{(0)}=p_k \]

A superscript ((j)) denotes the inner iteration number.

For example:

\[ p\^{(0)} `\rightarrow`{=tex} p\^{(1)} `\rightarrow`{=tex} p\^{(2)}
`\rightarrow`{=tex}`\cdots`{=tex} \]

until convergence.

The reason iteration is required is that heat transfer depends on
pressure and temperature, while pressure and temperature depend on the
heat-transfer result.

------------------------------------------------------------------------

# 14. Step 5.4 --- Calculate Woschni Gas Velocity

The confirmed Woschni formulation is:

\[ `\boxed{
w=
C_1S_p+
C_2
\left(
\frac{V_dT_r}{p_rV_r}
\right)
(p-p_m)
}`{=tex} \]

where:

-   \(w\) = characteristic gas velocity
-   (S_p) = mean piston speed
-   (V_d) = displacement volume
-   (T_r) = reference temperature
-   (p_r) = reference pressure
-   (V_r) = reference volume
-   \(p\) = instantaneous cylinder pressure
-   (p_m) = motored cylinder pressure
-   (C_1=2.28)
-   (C_2=0.00324) during combustion/expansion
-   (C_2=0) during compression

The dependency is:

\[ p\^{(j)} `\rightarrow`{=tex} w\^{(j)} \]

The use of (p_m) must be consistent with the selected motored-pressure
calculation.

------------------------------------------------------------------------

# 15. Step 5.5 --- Calculate Woschni Heat-Transfer Coefficient

The confirmed heat-transfer correlation is:

\[ `\boxed{
h=
CD^{-0.2}p^{0.8}T^{-0.53}w^{0.8}
}`{=tex} \]

where:

-   \(h\) = gas-side heat-transfer coefficient
-   \(C\) = Woschni correlation coefficient, with units dependent on the
    pressure unit convention
-   \(D\) = cylinder bore
-   \(p\) = instantaneous cylinder pressure
-   \(T\) = gas temperature
-   \(w\) = characteristic gas velocity

Important unit note:

The coefficient must match the pressure units used. Do not mix the
published coefficient convention with an inconsistent pressure unit.

Gas-side heat transfer is:

\[ `\dot `{=tex}Q\_{g`\rightarrow `{=tex}w} = hA(T_g-T_w) \]

For a crank-angle step:

\[ dt=`\frac{d\theta}{\omega}`{=tex} \]

therefore:

\[ `\boxed{
dQ_{wall}
=
\dot Q_{g\rightarrow w}
\frac{d\theta}{\omega}
}`{=tex} \]

------------------------------------------------------------------------

# 16. Step 5.6 --- Apply the First Law

The central cylinder equation is:

\[ `\boxed{
dU=
dQ_{comb}
-
dQ_{wall}
-
p\,dV
}`{=tex} \]

Therefore:

\[ U\_{k+1}\^{(j)} = U_k + dQ\_{comb} - dQ\_{wall}\^{(j)} - p\^{(j)}dV
\]

Interpretation:

-   (dQ\_{comb}): chemical energy released into the gas.
-   (dQ\_{wall}): energy transferred from gas to walls.
-   (p,dV): work performed by the gas.

The remaining energy changes the gas internal energy.

------------------------------------------------------------------------

# 17. Step 5.7 --- Update Temperature Using Variable Gas Properties

The current architecture explicitly avoids a constant tuned
(`\gamma`{=tex}).

Instead:

\[ c_v=c_v(T,x_b) \]

and gas properties vary with temperature and composition.

The thermodynamic state should preferably be represented by internal
energy:

\[ U=m,u(T,x_b) \]

Therefore, after calculating (U\_{k+1}), solve:

\[ `\boxed{
U_{k+1}
=
m\,u(T_{k+1},x_b)
}`{=tex} \]

for (T\_{k+1}).

This is more thermodynamically robust than assuming:

\[ U=mc_vT \]

with constant (c_v).

------------------------------------------------------------------------

# 18. Step 5.8 --- Update Pressure

Once (T) is obtained:

\[ `\boxed{
p_{k+1}^{(j)}
=
\frac{mRT_{k+1}^{(j)}}{V_{k+1}}
}`{=tex} \]

where (R) is consistent with the mixture composition.

The dependency is therefore:

``` text
dQcomb
   +
dQwall
   +
p dV
   ↓
dU
   ↓
U
   ↓
T
   ↓
p
```

But because (p) affects Woschni:

``` text
p
 ↓
w
 ↓
h
 ↓
Qwall
 ↓
U
 ↓
T
 ↓
p
```

this must be iterated.

------------------------------------------------------------------------

# 19. Step 5.9 --- Check Thermodynamic Convergence

Use convergence measures such as:

\[ `\epsilon`{=tex}\_T= `\frac{
|T^{(j+1)}-T^{(j)}|
}{
\max(T^{(j)},1)
}`{=tex} \]

and:

\[ `\epsilon`{=tex}\_p= `\frac{
|p^{(j+1)}-p^{(j)}|
}{
\max(p^{(j)},1)
}`{=tex} \]

The iteration is converged when:

\[ `\boxed{
\epsilon_T<\epsilon_{T,tol}
\quad\text{AND}\quad
\epsilon_p<\epsilon_{p,tol}
}`{=tex} \]

If not converged:

``` text
NO
 ↓
Use updated T,p
 ↓
Recalculate Woschni
 ↓
Recalculate Qwall
 ↓
Reapply first law
 ↓
Update T
 ↓
Update p
 ↓
Check convergence again
```

If converged:

``` text
YES
 ↓
Accept T(k+1), p(k+1), U(k+1)
 ↓
Advance to next crank angle
```

------------------------------------------------------------------------

# 20. Step 5.10 --- Move to the Next Crank Angle

After convergence:

\[ (`\theta`{=tex}*k,T_k,p_k,U_k) `\rightarrow`{=tex}
(`\theta`{=tex}*{k+1},T\_{k+1},p\_{k+1},U\_{k+1}) \]

Repeat until:

\[ `\theta=720`{=tex}\^`\circ`{=tex} \]

The cylinder solver then provides:

\[ `\boxed{
p(\theta)
}`{=tex} \]

\[ `\boxed{
T(\theta)
}`{=tex} \]

\[ `\boxed{
x_b(\theta)
}`{=tex} \]

\[ `\boxed{
Q_{wall}(\theta)
}`{=tex} \]

------------------------------------------------------------------------

# 21. Step 6 --- Calculate Indicated Work

After completing the 720° cycle:

\[ `\boxed{
W_i=\oint p\,dV
}`{=tex} \]

Numerically:

\[ W_i `\approx`{=tex} `\sum`{=tex}\_kp_k`\Delta `{=tex}V_k \]

This gives indicated work per cylinder per four-stroke cycle.

------------------------------------------------------------------------

# 22. Step 7 --- Calculate Friction

First determine:

\[ p\_{max}=`\max[p(\theta)]`{=tex}\]

The confirmed FMEP relation is:

\[ `\boxed{
FMEP=C+0.005p_{max}+0.162S_p
}`{=tex} \]

Then:

\[ W_f=FMEP,V_d \]

and for a four-stroke engine:

\[ `\boxed{
T_{fric}
=
\frac{W_f}{4\pi}
}`{=tex} \]

The dependency is:

``` text
pmax ──┐
       ├──→ FMEP → friction work → friction torque
Sp ────┘
```

Important:

> Friction therefore depends on the cylinder solution through
> (p\_{max}), but is calculated after the pressure trace is available.

------------------------------------------------------------------------

# 23. Step 8 --- Calculate Indicated and Net Torque

For a four-stroke cylinder:

\[ `\boxed{
T_{ind}
=
\frac{W_i}{4\pi}
}`{=tex} \]

A simplified net torque balance is:

\[ `\boxed{
T_{net}
=
T_{ind}
-
T_{fric}
-
T_{load}
}`{=tex} \]

If pumping work is explicitly introduced later, it should be included
consistently.

------------------------------------------------------------------------

# 24. Step 9 --- Update Crankshaft Speed

The confirmed crankshaft equation is:

\[ `\boxed{
J_{eff}\frac{d\omega}{dt}
=
T_{ind}
-
T_{fric}
-
T_{load}
}`{=tex} \]

For a simple numerical time step:

\[ `\omega`{=tex}\_{n+1} = `\omega`{=tex}\_n+ `\frac{
T_{ind}-T_{fric}-T_{load}
}{
J_{eff}
}`{=tex} `\Delta `{=tex}t \]

Then:

\[ `\boxed{
N_{n+1}
=
\frac{60\omega_{n+1}}{2\pi}
}`{=tex} \]

If propeller load is represented by:

\[ T\_{load}=K_p`\omega`{=tex}\^2 \]

then:

\[ `\omega`{=tex} `\rightarrow`{=tex} T\_{load} `\rightarrow`{=tex}
`\text{net torque}`{=tex} `\rightarrow`{=tex} `\omega`{=tex} \]

This creates the outer mechanical feedback.

------------------------------------------------------------------------

# 25. Step 10 --- Update the Thermal System

The cylinder solver has calculated gas-to-wall heat transfer:

\[ Q\_{gas`\rightarrow `{=tex}wall} \]

over the cycle.

Convert it into an average rate:

\[ `\boxed{
\dot Q_{wall}
=
\frac{Q_{wall,cycle}}
{t_{cycle}}
}`{=tex} \]

The wall energy balance can be represented as:

\[ `\boxed{
C_w\frac{dT_w}{dt}
=
\dot Q_{g\rightarrow w}
-
\dot Q_{w\rightarrow cool}
}`{=tex} \]

where:

\[ `\boxed{
\dot Q_{w\rightarrow cool}
=
UA_{wall-cool}(T_w-T_{cool})
}`{=tex} \]

The coolant energy balance is:

\[ `\boxed{
m_c c_p
\frac{dT_{cool}}{dt}
=
\dot Q_{w\rightarrow cool}
-
\dot Q_{rad}
}`{=tex} \]

The oil system is treated similarly.

------------------------------------------------------------------------

# 26. Step 11 --- Apply Cooling Degradation

The current fault/degradation architecture modifies thermal-system
capacity rather than directly modifying combustion.

Examples:

## Radiator degradation

\[ `\boxed{
UA_{rad}
=
(1-D_{rad})UA_{rad,0}
}`{=tex} \]

## Oil cooler degradation

\[ `\boxed{
UA_{oil}
=
(1-D_{oil})UA_{oil,0}
}`{=tex} \]

## Coolant flow degradation

\[ `\boxed{
\dot m_c
=
(1-D_{flow})\dot m_{c,0}
}`{=tex} \]

## Ram-air degradation

A representative model is:

\[ h\_{air} = (1-D\_{air})h\_{air,0} \]

The resulting chain is:

``` text
D_rad / D_oil / D_flow / D_air
              ↓
       cooling capacity
              ↓
       Tcool / Toil / Twall
              ↓
        heat rejection
```

The new thermal states feed the next cylinder cycle.

------------------------------------------------------------------------

# 27. Step 12 --- Calculate Digital-Twin Outputs

At the end of cycle (n), the model can provide:

## Combustion outputs

\[ p\_{max} \]

\[ T\_{max} \]

\[ CA\_{50} \]

\[ Q\_{comb} \]

## Performance outputs

\[ W_i \]

\[ T\_{ind} \]

\[ T\_{fric} \]

\[ T\_{net} \]

## Thermal outputs

\[ T\_{wall} \]

\[ T\_{cool} \]

\[ T\_{oil} \]

## Mechanical outputs

\[ RPM \]

\[ `\omega`{=tex} \]

These outputs can become the physics baseline for anomaly detection and
later physics-informed ML.

------------------------------------------------------------------------

# 28. Step 13 --- Advance to the Next Cycle

Carry forward:

\[ N\_{n+1} \]

\[ T\_{wall,n+1} \]

\[ T\_{cool,n+1} \]

\[ T\_{oil,n+1} \]

and any future degradation/thermal/mechanical states.

Then:

\[ `\boxed{
n\rightarrow n+1
}`{=tex} \]

and return to Step 0.

------------------------------------------------------------------------

# 29. Complete Solver Pseudocode

``` text
INITIALIZE:

    Engine geometry
    Fuel properties
    Gas-property model
    Woschni constants
    Thermal-network parameters
    J_eff
    K_p
    Initial RPM
    Initial wall temperature
    Initial coolant temperature
    Initial oil temperature

FOR each engine cycle / time step n:

    STEP 0:
        Read current operating inputs:
            RPM
            MAP
            MAT
            exhaust pressure
            ηv
            residual fraction
            injector duty
            rail command
            ambient conditions
            ram-air velocity

    STEP 1:
        Calculate:
            ω
            piston kinematics
            V(θ)
            dV/dθ
            Sp

    STEP 2:
        Calculate:
            P_rail
            ΔP
            fuel mass flow
            fuel mass per cycle

    STEP 3:
        Calculate:
            fresh-air mass
            residual mass
            fuel mass
            total trapped mass

    STEP 4:
        Initialize cylinder:
            p_IVC
            T_IVC
            U_IVC

    STEP 5:
        FOR θ = 0 → 720°:

            STEP 5.1:
                Calculate V_k
                Calculate V_k+1
                Calculate ΔV

            STEP 5.2:
                Calculate double-Wiebe xb
                Calculate dxb
                Calculate dQ_comb

            STEP 5.3:
                Initialize:
                    T_guess
                    p_guess

                REPEAT:

            STEP 5.4:
                    Calculate Woschni velocity:
                        w(p,T)

            STEP 5.5:
                    Calculate:
                        h
                        Qgas→wall

            STEP 5.6:
                    Apply first law:
                        dU =
                            dQcomb
                            − dQwall
                            − p dV

                    Update U

            STEP 5.7:
                    Solve:
                        U → T

            STEP 5.8:
                    Calculate:
                        T,V → p

            STEP 5.9:
                    Check:
                        T convergence
                        p convergence

                    IF not converged:
                        repeat 5.4–5.9

                UNTIL converged

                Store:
                    p(θ)
                    T(θ)
                    xb(θ)
                    Qwall(θ)

        END crank-angle loop

    STEP 6:
        Calculate:
            Wi = ∮ p dV

    STEP 7:
        Calculate:
            pmax
            FMEP
            Tfric

    STEP 8:
        Calculate:
            Tind
            Tnet

    STEP 9:
        Calculate:
            Tload

        Update:
            ω
            RPM

    STEP 10:
        Calculate:
            total wall heat
            average wall heat rate

        Update:
            Twall
            Tcool
            Toil

    STEP 11:
        Apply:
            D_rad
            D_oil
            D_flow
            D_air
            other degradation states

    STEP 12:
        Calculate:
            performance outputs
            thermal outputs
            combustion outputs
            health indicators

    STEP 13:
        Carry states forward:
            RPM
            Twall
            Tcool
            Toil
            degradation states

        Advance:
            cycle n → cycle n+1

END
```

------------------------------------------------------------------------

# 30. What Is Actually Solved Simultaneously?

It is important not to describe the entire model as one simultaneous
equation system.

## 30.1 Sequential/direct calculations

These can be evaluated directly:

\[ u_k `\rightarrow`{=tex} P\_{rail} `\rightarrow`{=tex}
`\Delta `{=tex}P `\rightarrow`{=tex} `\dot `{=tex}m_f \]

and:

\[ `\theta`{=tex} `\rightarrow`{=tex} V(`\theta`{=tex}) \]

and:

\[ x_b(`\theta`{=tex}) `\rightarrow`{=tex} dQ\_{comb} \]

These are not nonlinear coupled solves.

------------------------------------------------------------------------

## 30.2 Coupled equations at each crank angle

These belong to the same inner iteration:

\[ `\boxed{
U
\leftrightarrow
T
\leftrightarrow
p
\leftrightarrow
h
\leftrightarrow
Q_{wall}
}`{=tex} \]

because:

\[ p,T `\rightarrow`{=tex} h `\rightarrow`{=tex} Q\_{wall}
`\rightarrow`{=tex} U `\rightarrow`{=tex} T,p \]

This is the main nonlinear iteration.

------------------------------------------------------------------------

## 30.3 Cycle-level calculations

After 720°:

\[ p(`\theta`{=tex}) `\rightarrow`{=tex} W_i `\rightarrow`{=tex}
T\_{ind} \]

and:

\[ p\_{max},S_p `\rightarrow`{=tex} FMEP `\rightarrow`{=tex} T\_{fric}
\]

These occur after the crank-angle cylinder solution.

------------------------------------------------------------------------

## 30.4 Time-domain equations

Then:

\[ T\_{ind},T\_{fric},T\_{load} `\rightarrow`{=tex} `\omega`{=tex}(t) \]

and:

\[ Q\_{wall} `\rightarrow`{=tex} T_w,T\_{cool},T\_{oil} \]

These are slower time-domain integrations.

------------------------------------------------------------------------

# 31. The Three Nested Loops

## Loop 1 --- Inner nonlinear iteration

At one crank angle:

\[ `\boxed{
p
\rightarrow
w
\rightarrow
h
\rightarrow
Q_{wall}
\rightarrow
U
\rightarrow
T
\rightarrow
p
}`{=tex} \]

This loop is repeated until convergence.

------------------------------------------------------------------------

## Loop 2 --- Crank-angle marching

\[ `\boxed{
0^\circ
\rightarrow
1^\circ
\rightarrow
2^\circ
\rightarrow
\cdots
\rightarrow
720^\circ
}`{=tex} \]

Each converged state is passed to the next crank-angle step.

------------------------------------------------------------------------

## Loop 3 --- Engine/time-domain marching

\[ `\boxed{
Cycle_n
\rightarrow
Cycle_{n+1}
\rightarrow
Cycle_{n+2}
\rightarrow
\cdots
}`{=tex} \]

The slow states are carried between cycles.

------------------------------------------------------------------------

# 32. Complete Feedback Structure

The most important mechanical feedback loop is:

``` text
                 +--------------------------+
                 |                          |
                 v                          |
               RPM                        RPM
                 |                          ^
                 v                          |
             piston speed                   |
                 |                          |
                 v                          |
              Woschni                      |
                 |                          |
                 v                          |
          heat transfer                     |
                 |                          |
                 v                          |
        cylinder pressure                   |
                 |                          |
                 v                          |
        indicated work                      |
                 |                          |
                 v                          |
        indicated torque                    |
                 |                          |
                 v                          |
          crankshaft dynamics --------------+
```

The thermal feedback loop is:

``` text
Qgas→wall
    |
    v
Twall
    |
    v
Qwall→coolant
    |
    v
Tcool / Toil
    |
    v
cooling capacity
    |
    v
Twall in next cycle
```

The inner thermodynamic loop is:

``` text
       p
       |
       v
   Woschni
       |
       v
      h
       |
       v
    Qwall
       |
       v
      U
       |
       v
      T
       |
       +-----------> p
```

------------------------------------------------------------------------

# 33. Why Internal Energy Should Be the Preferred State Variable

There is one important implementation decision to lock down before
coding.

Because the model uses temperature-dependent gas properties, it is
preferable to integrate internal energy rather than directly integrate
temperature.

Use:

\[ `\boxed{
U_{k+1}
=
U_k+dQ_{comb}-dQ_{wall}-p\,dV
}`{=tex} \]

Then perform a property inversion:

\[ `\boxed{
U_{k+1}
\rightarrow
T_{k+1}
}`{=tex} \]

Then:

\[ `\boxed{
T_{k+1},V_{k+1}
\rightarrow
p_{k+1}
}`{=tex} \]

This avoids relying on:

\[ U=mc_vT \]

with a constant (c_v), which would contradict the confirmed
temperature-dependent gas-property model.

------------------------------------------------------------------------

# 34. Known vs Fitted vs Assumed

The model should distinguish these categories.

## Published / known from literature or manufacturer

Use only values that are genuinely documented.

Examples:

-   Engine displacement if the selected engine has a published
    specification.
-   Rated power if published.
-   Rated RPM if published.
-   Published geometry if available.
-   Published operating limits where applicable.

## Literature-typical

Examples:

-   Correlation forms.
-   Typical heat-transfer coefficients.
-   Typical combustion-model parameter ranges.
-   Typical thermal properties.

These should not be presented as Rotax-specific calibration unless
documented.

## Assumed

Examples:

-   Unpublished internal ECU calibration.
-   Injector effective area if not measured.
-   Wiebe parameters before fitting.
-   Wall thermal capacitance if estimated.
-   Cooling-system UA if not measured.
-   Initial residual fraction if not sensor-derived.

## Fitted

The following should generally be treated as calibration parameters:

-   Double-Wiebe parameters.
-   Combustion phasing.
-   Effective injector parameters if necessary.
-   Thermal-network parameters.
-   Some friction constants if the exact source/model requires fitting.

A tuned match to published engine power is **calibration**, not
independent validation.

------------------------------------------------------------------------

# 35. Sanity Checks Required at Each Major Level

## Cylinder-level checks

Check:

-   Units of pressure.
-   Units of energy.
-   Mass conservation.
-   Reasonable compression pressure.
-   Reasonable peak pressure.
-   Reasonable peak temperature.
-   Positive trapped mass.
-   Positive absolute pressure.
-   No negative or nonphysical volume.

## Energy balance

Over one cycle:

\[ Q\_{fuel} `\approx`{=tex} W\_{gas} + Q\_{wall} + `\Delta `{=tex}U \]

For a periodic steady-state cycle:

\[ `\Delta `{=tex}U\_{cycle}`\approx0`{=tex} \]

so approximately:

\[ `\boxed{
Q_{fuel}
\approx
W_{cycle}
+
Q_{wall}
}`{=tex} \]

subject to the exact treatment of exhaust/blowdown and losses.

## Engine-level checks

Check:

-   RPM does not run away.
-   Idle behaviour is physically bounded.
-   Torque balance is sensible.
-   Propeller load increases appropriately with speed.

## Thermal checks

Check:

-   Coolant temperature rises under increased load.
-   Cooling degradation causes higher wall/coolant temperature.
-   Increased ram air improves cooling.
-   Reduced coolant flow worsens cooling.
-   Thermal response is slower than crank-angle pressure response.

------------------------------------------------------------------------

# 36. Important Existing Modelling Lessons

The following mistakes should not be repeated:

1.  **Constant gamma**
    -   A constant (`\gamma`{=tex}) can overestimate peak temperature.
    -   Gas properties should vary with temperature and composition.
2.  **Oxygen limitation**
    -   Excess fuel does not create unlimited additional heat.
    -   Combustion energy must be physically bounded by available
        oxygen/fuel chemistry.
3.  **Exhaust blowdown**
    -   EGT probe temperature should not simply be equated with
        in-cylinder peak combustion temperature.
    -   Expansion/blowdown must occur before exhaust-probe temperature
        is predicted.
4.  **Gauge vs absolute pressure**
    -   MAP and rail pressure must use consistent pressure definitions.
    -   Do not subtract gauge pressure from absolute pressure.
5.  **Woschni coefficient**
    -   Use the correct correlation coefficient for the pressure-unit
        convention.
    -   Do not compensate for an incorrect coefficient by artificially
        changing area.
6.  **Turbo pressure ratio**
    -   When the turbo model is later re-coupled, the bracket in the
        relevant turbine/compressor relation must use the correct
        pressure ratio direction.
    -   The wastegate-controller error is: \[ e\_{WG}=MAP-MAP\_{ref} \]
7.  **Throttle/idle**
    -   Without a restriction or governor, the engine can run away in
        RPM.
    -   Idle behaviour must be explicitly checked.
8.  **Fuel per cycle**
    -   At fixed fuel flow/duty: \[
        m\_{fuel,cycle}`\propto`{=tex}`\frac{1}{N}`{=tex} \]
9.  **Trapped mass**
    -   Fuel and residual gas must be included consistently in the
        trapped mixture.

------------------------------------------------------------------------

# 37. Recommended Final Mental Model

The entire current digital twin can be reduced to this:

``` text
                         INPUTS
                           |
             +-------------+-------------+
             |                           |
             v                           v
        FUEL/AIR MODEL             ENGINE STATES
             |                           |
             +-------------+-------------+
                           |
                           v
                    CYLINDER MODEL
                           |
             +-------------+-------------+
             |             |             |
             v             v             v
           V(θ)         Wiebe       gas properties
             |             |             |
             +-------------+-------------+
                           |
                           v
                     FIRST LAW
                           ↕
                      T ↔ p ↔ h
                           ↕
                       WOSCHNI
                           ↕
                        Qwall
                           |
                           v
                      p(θ), T(θ)
                           |
                    +------+------+
                    |             |
                    v             v
                 ∫p dV         pmax
                    |             |
                    v             v
                  Tind          FMEP
                    |             |
                    +------+------+
                           |
                           v
                    CRANKSHAFT
                           |
                           v
                          RPM
                           |
                           +-----------> next cycle

                    Qwall
                      |
                      v
                 THERMAL MODEL
                      |
               +------+------+
               |             |
               v             v
            Tcool          Toil
               |
               v
           radiator/cooler
               |
               +--------------> next cycle
```

The core philosophy is therefore:

\[ `\boxed{
\text{Inputs}
\rightarrow
\text{fuel/air}
\rightarrow
\text{combustion}
\rightarrow
\text{thermodynamics}
\leftrightarrow
\text{heat transfer}
\rightarrow
\text{pressure}
\rightarrow
\text{torque}
\rightarrow
\text{RPM}
}`{=tex} \]

while in parallel:

\[ `\boxed{
\text{gas-wall heat}
\rightarrow
\text{wall}
\rightarrow
\text{coolant/oil}
\rightarrow
\text{cooling system}
\rightarrow
\text{next-cycle thermal boundary}
}`{=tex} \]

This is the current thin vertical slice. Turbocharger recoupling,
detailed exhaust flow, sensor dynamics, ECU-specific calibration, and
ML-based residual/fault prediction should be added only after this
physics baseline is stable and independently validated.
