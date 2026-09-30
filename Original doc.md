  
**UAV Piston-Engine Digital Twin**

**Full Pipeline Explanation**

*A physics \+ machine learning approach to prognostics and health management*

This document explains, stage by stage, how a hybrid digital twin pipeline works: from raw engine sensor data, through a calibrated physics model and an Unscented Kalman Filter, to fault detection, fault isolation, remaining-useful-life prediction, and a maintenance advisory — with all key terms defined in plain language.

**How to read this document**

*Sections marked "core method" (Stage 0, Stage 3, Stage 4\) draw on the hybrid physics \+ deep learning framework of Arias Chao et al. (2022). Sections marked "proposed design" are original additions built to satisfy the fault-isolation and UAV-deployment requirements, and should be validated in simulation before being trusted operationally. Part 9 is a proposed design addition: it places the same pipeline across the UAV, the ground node, and a central hub, and adds a ground interface model that talks to people without changing the twin core.*

# **Part 1 — Glossary: Every Term in Plain Language**

Before walking through the pipeline, here is every technical term used later, explained simply. Refer back to this section whenever a word is unfamiliar.

## **General digital twin terms**

**Digital twin —** a live software copy of a physical machine. It is kept in sync with the real machine using sensor data, and it can also simulate situations the real machine hasn't been in yet.

**Telemetry —** data sent automatically from a remote machine (here, the UAV's engine) to a ground station, usually over a radio link.

**Prognostics —** predicting how a machine will behave in the future, especially predicting when it will fail.

**Diagnostics —** figuring out what is wrong right now, as opposed to prognostics, which asks what will go wrong later.

**RUL (Remaining Useful Life) —** an estimate of how much longer a component or engine can keep working before it fails or needs maintenance, usually stated in flight hours or cycles.

**Health index (HI) —** a single number, usually between 0 and 1 (or 0% and 100%), that summarizes how healthy a subsystem is. 1 means fully healthy, 0 means at the failure limit.

**Edge vs ground —** "edge" means the computer physically on board the UAV, with limited processing power. "Ground" means the Ground Control Station (GCS) at the operating base, which can run heavier calculations. This document now also uses a third location, the hub, defined below.

**Ground node / GCS rack —** the computer at the operating base. It stores the flight log, can replay the twin, and is where people talk to the interface model.

**Hub —** a central computer that collects summaries — and, after landing, selected raw logs — from many ground nodes, retunes the Stage 0 artefacts on that wider dataset, and ships an approved model pack back. It is not required for a live safety decision on one UAV.

**Interface model (IM) —** a language model that sits on the ground node (and a copy at the hub for headquarters questions). It does not estimate health parameters or remaining useful life. It only reads pipeline outputs and writes them in plain language for a human.

**Engineering model (EM) —** in this document, the engineering model is the pipeline itself: the physics model, the UKF, the detectors, fault isolation, health indices, prognostics, and the advisory. It is not a separate off-the-shelf chat model.

**Model pack —** one versioned bundle of everything Stage 0 produces — the physics model or its surrogate, the UKF settings Q and R, the prognostics network, the anomaly model, the signature table, and the alarm thresholds — loaded onto the UAV before flight.

**Known-good —** a flight, bench run, or operating stretch labelled as healthy by a person. Residual-based alerts and the anomaly model are not trusted until enough known-good time exists for that engine family.

## **Signals and data terms**

**Sensor / channel —** a single measured value over time, such as cylinder head temperature or RPM. "Channel" just means "one sensor's data stream."

**CAN bus / SocketCAN —** CAN (Controller Area Network) is a standard way that vehicle and aircraft electronics send short messages to each other over a shared wire. SocketCAN is the Linux software layer used to read and write those messages on a computer.

**DBC file —** a lookup table that tells you how to translate a raw CAN message (a string of bytes) into named, scaled engineering values, such as "bytes 3-4 \= RPM, divide by 4."

**Sampling rate —** how many times per second a signal is measured, given in Hz (hertz \= times per second). 1 Hz means once per second.

**Noise —** small random errors in a measurement that don't reflect the true value — for example, a temperature sensor reading 84.9°C, 85.2°C, and 84.7°C in three seconds when the true temperature is a steady 85°C.

**Residual —** the difference between what a sensor actually reads and what a model predicted it should read. A large residual means the model and reality disagree.

**Bias, drift, stuck, scale faults —** four common ways a sensor can go wrong: bias means it's off by a constant amount; drift means the error grows slowly over time; stuck means it stops updating and repeats the same value; scale means its reading is multiplied by the wrong factor.

## **Physics-model terms**

**Physics-based model / mean-value model —** a set of equations, built from engineering knowledge (thermodynamics, fluid flow), that predicts how the engine should behave. "Mean-value" means it models the average behavior over an engine cycle rather than tracking every piston stroke in detail — much faster to compute than a full crank-angle model.

**Operating conditions (w) —** the external, commanded conditions the engine is currently working under — altitude, ambient temperature, throttle position, commanded RPM. These are not signs of engine health; they are the "weather and driving style" the engine is dealing with.

**Health parameters (θ, "theta") —** hidden numbers inside the physics model that represent the condition of specific components, such as how efficiently the injector still delivers fuel, or how well the cooling system still removes heat. Healthy \= value near 1 (or near a reference value); degraded \= value moves away from it.

**Virtual sensor —** a quantity the physics model can calculate but that no physical sensor measures directly, such as instantaneous torque or air-fuel ratio.

**Calibration —** the process of adjusting a model's hidden parameters (θ) so that the model's predictions match real sensor readings as closely as possible.

**State-space model —** a mathematical way of describing a system using (a) a "state" that changes over time and (b) "measurements" that give partial, noisy information about that state. Here, the state is θ, and the measurements are the sensor readings.

## **Filtering and estimation terms**

**Kalman filter —** an algorithm that estimates a hidden, changing quantity from a stream of noisy measurements, by continually alternating between predicting the next value and correcting that prediction against new data.

**UKF (Unscented Kalman Filter) —** a version of the Kalman filter built for cases where the relationship between the hidden state and the measurements is nonlinear (not a straight line). Explained in full in Part 3\.

**Random walk —** a way of modeling a quantity that changes by a small, unpredictable amount at each step, with no built-in direction. Used here to model how θ evolves, because there's no known formula for engine degradation, only the general expectation that it changes gradually.

**Sigma points —** a small, carefully chosen set of sample points used by the UKF to represent a range of possible current states, instead of trying every possible value.

**Kalman gain —** a weighting factor the filter uses to decide how much to trust a new sensor reading versus how much to trust its own prior prediction.

**Innovation —** the gap between what the filter expected to measure and what it actually measured, at one time step. A large, persistent innovation on one channel often points to a sensor problem rather than an engine problem.

**Surrogate model —** a smaller, faster stand-in model (often a small neural network) trained to imitate a slower, more detailed model, used to save computing time.

## **Machine learning terms**

**Neural network —** a machine learning model made of layers of simple computing units ("neurons") that learn to map inputs to outputs from examples, rather than from hand-written rules.

**Training / training data —** the process (and the data) by which a neural network learns, by being shown many example inputs together with the correct output and adjusting itself to reduce its errors.

**Anomaly detection —** finding data points that don't look like "normal" behavior, without necessarily knowing in advance what the specific fault is.

**Autoencoder —** a neural network trained to compress its input and then reconstruct it as closely as possible. Trained only on healthy data, it reconstructs healthy patterns well but reconstructs unfamiliar (faulty) patterns poorly — the reconstruction error becomes the anomaly score.

**SHAP —** a method that explains a machine learning model's individual prediction by showing how much each input feature pushed the prediction up or down, so a human can see "why" the model said what it said.

**Federated learning —** a way of training one shared model across multiple machines (e.g., several UAVs) without any of them sending their raw data to a central server — only model updates are shared, which protects data privacy and saves bandwidth.

**Non-IID data —** a technical caveat for federated learning: it means each UAV's data may follow a different pattern (different missions, climates, engines), which can make combining their model updates less straightforward than textbook federated learning assumes.

## **Combustion and mechanical fault terms**

**Misfire —** a cylinder failing to ignite the fuel-air mixture properly on a given cycle, producing a momentary loss of power and a characteristic hiccup in engine rotation speed.

**Crank-angle / crankshaft —** the crankshaft is the rotating shaft the pistons drive; "crank angle" is the rotational position of that shaft, used as the timeline for combustion events instead of seconds.

**Cycle-to-cycle variation (COV) —** how much a combustion-related quantity (like peak pressure) varies from one engine cycle to the next. Healthy combustion is fairly repeatable; unstable combustion varies a lot cycle to cycle.

**CHT / EGT —** Cylinder Head Temperature and Exhaust Gas Temperature — two of the most important piston-aero-engine health indicators.

## **Security and reliability terms**

**Digital signature —** a cryptographic proof attached to a message that lets the receiver verify who sent it and that it wasn't altered — but does not, by itself, hide the message's content.

**Encryption —** scrambling a message so that only someone with the correct key can read it, protecting its content from eavesdroppers.

**Hash / hash chain —** a hash is a short fixed-length fingerprint of data; changing even one bit of the data changes the fingerprint completely. A hash chain links each record's fingerprint to the previous record's, so tampering with any past record breaks the whole chain and is detectable.

**Conformal prediction —** a statistical technique for turning a raw anomaly score into a threshold with a known, controllable false-alarm rate, without assuming a particular data distribution.

**CUSUM (cumulative sum) —** a simple running-total statistical test that is good at catching a slow, steady drift in a signal that a single-sample threshold would miss.

# **Part 2 — Pipeline at a Glance**

The pipeline has eleven stages, split across four locations: an offline build stage that happens once (before any flight), an onboard/edge stack that runs during flight in real time, a ground-node stack at the GCS that runs after the data lands (and hosts the interface model), and a hub that collates many nodes so Stage 0 can be retuned on real fleet data. The table below is the map; every stage is explained in full afterward. Part 9 explains how those four locations connect, including what happens when a radio or fiber link is cut.

| \# | Stage | Where it runs | One-line purpose |
| :---- | :---- | :---- | :---- |
| 0 | Offline build | Development lab | Build and train everything before any real flight |
| 1 | CAN ingestion | Onboard (edge) | Read raw engine messages off the CAN bus |
| 2 | Clean and tag | Onboard (edge) | Remove bad data, label flight phase and regime |
| 3 | Twin core | Onboard (edge) | Run the physics model \+ UKF to estimate hidden health |
| 4 | Three parallel detectors | Onboard (edge) | Catch fast faults, general anomalies, and sensor faults |
| 5 | Data flow into diagnosis | Onboard (edge) | Route results to the isolation stage |
| 6 | Fault isolation | Onboard (edge) | Decide which specific fault is most likely, and why |
| 7 | Health indices | Onboard (edge) | Turn hidden health parameters into 0–100% scores |
| 8 | Prognostics | Onboard (edge) | Estimate Remaining Useful Life, with uncertainty |
| 9 | Maintenance advisory | Onboard (edge) | Turn all of the above into a plain-language recommendation |
| 10 | Secure downlink | Edge → Ground | Send a compact, signed, encrypted summary to base |
| 11 | Ground control station | Ground | Replay, what-if simulation, dashboard, fleet learning |

*Stages 0, 3 and 4 (offline build, twin core, three parallel detectors) are explained in the greatest depth in Part 4, Part 5 and Part 6, per your request. The remaining stages are covered in Part 7\.*

# **Part 3 — The Core Idea Behind the Whole Pipeline**

Before diving into stages, it helps to understand the single idea that everything else is built around: separate "the flight changed" from "the engine degraded."

A sensor reading like Exhaust Gas Temperature moves for two very different reasons:

1. Because the pilot changed the throttle, the aircraft climbed, or the outside air got colder — none of which mean anything is wrong.

2. Because a real component (an injector, a bearing, a cooling fan) is wearing out or failing.

A system that only watches raw sensor values struggles to tell these apart, especially on a UAV that flies many different missions and altitudes. The fix used in this pipeline is to keep a physics model of a healthy engine running at all times, alongside the real engine. The physics model is told the current operating conditions (throttle, altitude, temperature) and predicts what a healthy engine's sensors should read under those exact conditions. Any gap between the prediction and the real sensor reading is then attributed to something the physics model doesn't already know about — which is exactly the wear and degradation we want to catch.

This is why the pipeline has both a physics model and machine learning: the physics model absorbs everything we understand about how a healthy engine behaves under different conditions, and the machine learning layers pick up patterns in what's left over — the part physics alone can't explain.

# **Part 4 — Stage 0: Offline Build (core method, done once)**

Stage 0 happens entirely before the UAV ever flies with this system active. Nothing here runs in real time. Its job is to build and train every model that the onboard pipeline will later use. Think of it as building and stocking a toolbox — the tools are then carried onboard, but the toolmaking itself happens back in the workshop.

Here is why Stage 0 is unavoidable: a real aero piston engine essentially never gets deliberately run to failure, because that would be dangerous and expensive. So there is very little real "this engine broke, and here's exactly what its sensors looked like right before it did" data to learn from. Stage 0 solves this by building a simulator that can safely generate as many failures as needed, in software.

## **Step 0.1 — Build the physics model of a healthy engine**

This is the mean-value model referred to throughout this document. In simple terms, it is a set of equations that take in the operating conditions and predict what a healthy engine's sensor readings should be. For example, given a certain altitude, ambient temperature, and throttle setting, the model predicts what CHT, EGT, oil pressure, and fuel flow should read if the engine has no faults.

Building it means encoding real engineering relationships: how air density falls with altitude, how fuel-air ratio affects exhaust temperature, how heat is generated and rejected by the cooling system, and so on. It is tuned (fitted) against a healthy engine's datasheet values or bench-test data, so that its predictions line up with a real, healthy engine.

## **Step 0.2 — Choose the health parameters (θ)**

Next, a handful of hidden numbers are added to the model — the health parameters θ introduced in the glossary. Each one is deliberately tied to one physical subsystem, for example:

* Injector flow factor — how efficiently the injector still delivers the commanded amount of fuel

* Volumetric efficiency — how well the engine still fills its cylinders with air

* Cooling effectiveness — how well the cooling system still removes heat

* Friction / lubrication factor — how much extra mechanical friction is present

* Alternator output factor — how well the electrical charging system still performs

Each of these starts at a "perfectly healthy" reference value. As a component wears out, its corresponding θ moves away from that reference. This is the single most important design choice in the whole pipeline: it is what later allows the system to say which subsystem is degrading, rather than only saying that something is degrading.

## **Step 0.3 — Build a fault-injection library**

Since real failure data is scarce, Stage 0 builds a library of code that can artificially insert faults into the simulation, so training data with known faults can be generated in bulk. Three broad categories are injected:

* **Engine faults —** slowly ramp one θ value down over simulated flight hours (gradual wear), or make it step down suddenly (sudden failure).

* **Sensor faults —** apply the four sensor-fault types from the glossary (bias, drift, stuck, scale) to individual simulated sensor channels, completely separately from any engine fault.

* **Misfire events —** simulate a cylinder skipping combustion on certain cycles, to generate training examples for the fast misfire detector.

Critically, faults are injected one at a time and the exact ground truth (which θ was changed, by how much, starting when) is recorded alongside the simulated sensor data. This ground truth is what later stages are trained and checked against.

## **Step 0.4 — Generate a large synthetic dataset**

Using the physics model and the fault-injection library, many simulated missions are run: different routes, altitudes, weather, throttle profiles, and randomly chosen degradation paths and starting health levels. For every simulated second, the operating conditions, the simulated (noisy) sensor readings, the true hidden θ, and the true remaining useful life until failure are all recorded. This becomes the training dataset — playing the same role that the 9 simulated turbofan engines played in the Arias Chao et al. paper, but here generated specifically for a piston aero engine and specifically covering all eight required fault categories, rather than just two.

## **Step 0.5 — Tune the UKF**

Using the simulated data (where the true θ is known), the UKF's own internal settings are adjusted so that its estimated θ̂ tracks the true, simulated θ as closely as possible — closely enough to notice real degradation, but not so twitchy that it reacts to ordinary sensor noise. This tuning process, and the two settings involved (called Q and R), are explained fully in Part 5\.

## **Step 0.6 — Train the prognostics network (G)**

With the physics model and UKF finalized, every simulated data point is run through calibration to get its θ̂, and the resulting enhanced feature set (operating conditions, raw sensors, model-predicted sensors, virtual sensors, and θ̂) is used to train a neural network that predicts Remaining Useful Life — this is Stage 8's core model, trained here in Stage 0 using the recipe from Arias Chao et al., described fully in Part 7\.

## **Step 0.7 — Train the anomaly-detection model**

A separate small model (an autoencoder, defined in the glossary) is trained only on healthy simulated data. Because it only ever saw healthy patterns during training, it will reconstruct healthy data well and unfamiliar (faulty) data poorly, and that reconstruction error becomes the general-purpose anomaly score used in Stage 4\.

## **Step 0.8 — Build the fault-signature table**

Using the fault-injection library, each fault type is simulated on its own, and the resulting pattern — which θ moved, which residuals grew, in which direction — is recorded as that fault's "signature." This becomes a lookup table used later in Stage 6 to match a live pattern of symptoms against a list of known causes.

## **Step 0.9 — Set alarm thresholds**

Using healthy simulated (and if available, real) data, thresholds are chosen for every detector so that false alarms happen at an acceptable, controlled rate. This is a balancing act: thresholds set too tight cause constant false alarms that maintainers learn to ignore; set too loose, they miss real problems.

## **Step 0.10 — Validate against real data**

Finally, wherever real data exists — for example, real general-aviation piston-engine flight and maintenance records, or real bench-test data from the actual engine model being used — the whole Stage 0 output (physics model, UKF tuning, trained networks, thresholds) is checked against it. This step matters because everything up to this point was trained purely on a simulation, and a simulation is never a perfect copy of reality. A good practice is to deliberately make the simulator slightly "wrong" in controlled ways (for example, using an incorrect friction value) and check that the pipeline still behaves sensibly — this tests robustness to the simulator not perfectly matching the real engine. Once several bases are flying the system, the hub described in Part 9 becomes the main source of that real data: known-good flights for calibration, and confirmed maintenance findings for the signature table and thresholds. The fault-injection library in Step 0.3 remains necessary for rare or dangerous faults that will not appear often enough in real logs.

*Everything produced in Stage 0 — the physics model, the tuned UKF settings, the trained neural networks, the signature table, and the thresholds — is then carried onto the aircraft (or a ground copy of it kept at the GCS) and used, unchanged, during real flights in Stages 1 through 11\. Stage 0 itself does not run again until it's time to retrain with new data. Later updates to that bundle are built at the hub and loaded onto the UAV before a flight — never mid-mission. That bundle is called a model pack in Part 9\.*

# **Part 5 — Stage 3: The Twin Core, and How the UKF Works**

The twin core is the heart of the whole pipeline. It is where the live physics model and the live UKF run continuously, side by side with the real engine, turning raw sensor readings into an estimate of hidden engine health.

## **5.1 What the twin core receives and produces**

| Input | What it is |
| :---- | :---- |
| w — operating conditions | Altitude, ambient temperature, commanded throttle, commanded RPM (cleaned and tagged by Stage 2\) |
| xₛ — sensor readings | The real, measured sensor channels (RPM, CHT, EGT, oil pressure/temperature, fuel flow, etc.) |

| Output | What it is |
| :---- | :---- |
| θ̂ — estimated health parameters | The filter's current best guess of each hidden health value, with an uncertainty range |
| x̂ₛ — denoised model sensors | What the calibrated model predicts each real sensor should currently read |
| x̂ᵥ — virtual sensors | Unmeasured quantities the model can compute, such as torque or air-fuel ratio |
| Residuals r \= xₛ − x̂ₛ | The live gap between real sensors and model predictions, channel by channel |
| Innovation statistics | A measure of how "surprised" the filter is by each new measurement |

## **5.2 Why the problem is hard: it's nonlinear**

If the relationship between the hidden health parameters and the sensor readings were a simple straight line, a basic ("linear") Kalman filter would be enough. But an engine is not like that — for example, a small drop in cooling effectiveness might barely change CHT at low power but change it sharply at high power. This kind of "it depends" relationship is called nonlinear, and the physics model F(w, θ) that connects health to sensor readings is nonlinear throughout. This is exactly the situation the UKF is designed for.

## **5.3 The state-space model, explained line by line**

The problem is written as a state-space model, which just means writing down two equations: one for how the hidden thing changes over time, and one for how we observe it.

θ(t) \= θ(t−1) \+ ξ(t),        ξ(t) \~ N(0, Q)

In plain words: "the health parameters right now equal the health parameters a moment ago, plus a small random nudge." This is the random walk described in the glossary. ξ(t) (the Greek letter xi) is that random nudge, drawn from a bell-curve distribution (written N for "Normal distribution") centered on zero with a spread controlled by a number called Q. There is no built-in downward trend in this equation — it does not assume the engine is degrading. The direction of degradation only emerges later, pulled in by the real sensor data.

xₛ(t) \= F(w(t), θ(t)) \+ ε(t),        ε(t) \~ N(0, R)

In plain words: "the sensor reading we'd expect right now equals what the physics model predicts for the current conditions and current health, plus some random sensor noise." ε(t) (epsilon) is that sensor noise, with its own spread controlled by a number called R.

So there are exactly two "dial settings" the filter needs:

* **Q** — how much the filter allows θ to wander between steps on its own. A larger Q lets the filter react faster to real changes but also makes it more easily fooled by noise. A smaller Q makes the filter smoother but slower to notice real degradation.

* **R** — how much the filter trusts each sensor. A larger R (noisier sensor) makes the filter lean more on its own prediction and less on that reading; a smaller R makes it trust that sensor's readings more.

Choosing Q and R well is exactly what Step 0.5 (tuning) does, using simulated data where the true θ is known.

## **5.4 The UKF cycle, step by step**

At every time step, the UKF repeats a predict-then-correct cycle. Here is what actually happens inside each part, described without skipping steps:

### **Step A — Represent uncertainty with sigma points**

The filter does not know θ exactly — it only knows a best-guess value and how uncertain that guess is (its "spread," mathematically a covariance). Rather than trying every possible value of θ (which would be far too slow), the UKF picks a small, carefully chosen set of representative points around the current best guess, called sigma points. For a health-parameter vector with n values, the UKF typically uses 2n \+ 1 sigma points — for example, with the 3 health parameters used in the reference paper's case study, that would be 7 points. These points are spread out just enough to accurately represent the current uncertainty of θ, both its center and its spread.

### **Step B — Predict: push each sigma point forward in time**

Each sigma point is passed through the random-walk equation (θ(t) \= θ(t−1) \+ a small nudge) to predict where it should be at the next time step. Combining all the pushed-forward points gives a new predicted center and spread for θ — this is the filter's "before looking at new data" guess.

### **Step C — Predict what the sensors should read**

Each of those same predicted sigma points is then run through the physics model F(w, θ) — using the current operating conditions w — to see what sensor readings each one would produce. Averaging these predicted sensor readings (with the correct weights) gives the filter's single best prediction of what the real sensors should currently read, plus how uncertain that prediction is.

### **Step D — Correct: compare with the real sensor reading**

Now the actual, real sensor reading finally enters the picture. The filter compares the real reading against its predicted reading from Step C — this gap is the innovation. If the innovation is small, the prediction was good and little correction is needed. If it's large, either something unexpected has changed (real degradation) or this was an unusually noisy reading.

### **Step E — Apply the Kalman gain**

The filter computes a weighting factor called the Kalman gain, which decides how much of that innovation gets absorbed into the updated θ̂ estimate. The gain is automatically larger when the filter's own prediction is very uncertain (so it leans more on the new data) and smaller when the sensor is known to be noisy, i.e. R is large (so it leans more on its own prediction). The updated θ̂, and its new, usually smaller, uncertainty, becomes the output for this time step and the starting point for the next cycle.

### **Step F — Repeat**

The whole predict-correct cycle above runs again at the next time step, using the just-updated θ̂ as the new starting point. This is why it's called a filter — it continuously filters a noisy stream of sensor data down into a smooth, running estimate of hidden engine health.

## **5.5 Why a surrogate model is used**

Running the full physics model F for every sigma point, at every single time step, can be too slow for an onboard computer with limited processing power. The fix is to train a smaller, faster neural network, called a surrogate model and written D, to imitate F closely — this surrogate is trained once, offline, in Stage 0, and then substituted into the UKF's Step C in place of the full physics model, giving nearly the same accuracy at a fraction of the computing cost.

## **5.6 What comes out, and why it matters downstream**

* **θ̂** directly answers "which subsystem is losing health," because each θ was deliberately tied to one physical subsystem back in Stage 0\.

* **Residuals (xₛ − x̂ₛ)** show exactly which individual sensor channels disagree with the physics model, which is the main evidence used later to tell apart an engine fault from a sensor fault (Stage 4's sensor check).

* **Virtual sensors (x̂ᵥ)** give extra context (like torque or stall margin) that no physical sensor provides, enriching everything downstream.

* **Innovation statistics** flag moments when the filter was especially surprised, which is a useful trigger for closer inspection.

## **5.7 Two honest limitations of the twin core**

Two limitations are worth keeping in mind when interpreting the twin core's output:

1. It reacts slowly to sudden events. Because θ is modeled as changing gradually (a random walk with small steps), the twin core is good at catching gradual wear but will lag behind a sudden, abrupt failure. This is exactly why Stage 4 includes fast detectors running in parallel, rather than relying on the twin core alone.

2. It can only separate faults that affect the sensors differently. If two different health parameters would move the exact same sensors in the exact same way, the filter mathematically cannot tell which one actually changed — this is called an identifiability limit, and it is why the choice of which θ parameters to track (Step 0.2) needs to be made carefully, with each one affecting a distinguishable pattern of sensors.

# **Part 6 — Stage 4: The Three Parallel Detectors (proposed design)**

The twin core alone is not enough, mainly because of the two limitations just described: it's slow to react to sudden events, and it can't by itself tell a broken sensor from a broken engine. Stage 4 runs three different kinds of detector at the same time, side by side, each compensating for something the others miss. "Parallel" simply means they all run continuously and independently, on the same incoming data, rather than one waiting for another to finish.

## **6.1 Why three, and not just one**

| Detector | What it's good at | What it would miss alone |
| :---- | :---- | :---- |
| Fast detectors | Sudden, sharp events happening within milliseconds to seconds (misfire, a vibration spike) | Slow, gradual wear building up over many flight hours |
| Anomaly model | General "this doesn't look like anything healthy I've seen," even for unexpected fault types | Won't say which specific fault it is, and needs a well-defined "normal" per flight regime |
| Sensor check | Telling apart "the sensor is lying" from "the engine is actually degraded" | Doesn't detect faults itself — it only classifies alarms that other detectors have already raised |

## **6.2 Fast detectors**

These are purpose-built, lightweight checks aimed at problems that happen too quickly for the twin core's gradual, random-walk-based estimate to catch in time.

### **Misfire and combustion instability**

A misfire (defined in the glossary) causes a brief, characteristic hiccup in how smoothly the crankshaft is rotating. The detector watches the fine-grained rotational speed of the crankshaft and computes how "rough" each individual firing event was, then compares that roughness against a threshold that depends on the current speed and load (because some roughness is normal at idle, less so at high power). A related signal is cycle-to-cycle variation (COV, defined in the glossary): if a proxy for combustion pressure becomes unusually inconsistent from one cycle to the next, that points to unstable combustion even without an outright misfire.

### **Vibration monitoring**

The detector computes standard vibration statistics — overall vibration energy (RMS), how "spiky" the signal is (kurtosis), and which specific rotational frequencies ("engine orders") the vibration is concentrated at. A sudden jump, or vibration appearing at a new frequency tied to a specific rotating part, points toward mechanical problems like bearing wear or imbalance.

### **Hard safety limits**

Simple, fixed thresholds (for example, "CHT above X" or "oil pressure below Y") remain in place as a backstop underneath everything else. The rest of this pipeline exists to warn earlier and more precisely than these hard limits alone — it does not replace them as a final safety net.

## **6.3 Anomaly model**

This detector answers a more general question than the fast detectors: "does this data, overall, look like anything the model has seen from a healthy engine?" — without needing to know in advance exactly what shape a fault will take.

### **How the autoencoder works, step by step**

1. During Stage 0 training, the autoencoder (defined in the glossary) is shown large amounts of healthy engine data — specifically, the twin core's residuals combined with the current flight-regime tag.

2. It learns to compress that healthy data down to a small internal representation and then reconstruct (rebuild) it as closely as possible to the original.

3. Because it only ever practiced on healthy patterns, it becomes very good at reconstructing healthy data accurately, but comparatively bad at reconstructing patterns it has never seen — such as an unusual fault.

4. In live use, the difference between the real input and the autoencoder's reconstruction of it — the reconstruction error — becomes the anomaly score. A low score means "looks healthy"; a high score means "looks unfamiliar."

### **Why the threshold depends on flight regime**

A given reading can be completely normal in one situation and abnormal in another — for instance, higher vibration during a rapid climb versus the same vibration during steady cruise. To avoid constant false alarms, the anomaly score is compared against a threshold that is specific to the current flight regime (a short tag such as "climb," "cruise," or "loiter," produced back in Stage 2), rather than one single threshold for the entire flight.

### **Conformal prediction for threshold-setting**

Rather than picking a threshold by guesswork, conformal prediction (defined in the glossary) is used to set it: it looks at how the anomaly score behaves on held-out healthy data and picks a threshold that mathematically guarantees a chosen, controlled false-alarm rate — for example, "no more than 1 false alarm per 100 flight hours of healthy operation," without needing to assume the scores follow a particular textbook distribution.

## **6.4 Sensor check**

This detector's job is specifically to answer: when something looks wrong, is it the engine, or is it just the sensor that's wrong?

### **Analytic redundancy**

Many engine sensor channels are physically linked to each other by the laws of physics — for example, fuel flow, RPM, and EGT tend to move together in predictable ways, and CHT is related to fuel flow, airspeed, and altitude. This physical relationship between multiple sensors is called analytic redundancy, because the sensors partly "back each other up" — one sensor's expected value can be cross-checked against several others.

### **The core decision rule**

* **One channel disagrees, its physically related channels do not —** suspect that one sensor is faulty, since a real engine problem would normally show up across more than one linked measurement.

* **Several physically related channels move together, in a way that makes physical sense —** suspect a real engine problem, since coordinated movement across multiple independent sensors is much harder to explain by a single sensor glitch.

### **Catching slow sensor drift with CUSUM**

A sensor slowly drifting out of calibration over many hours can be hard to catch with a simple threshold on any single reading, because each individual reading only changes by a tiny amount. CUSUM (cumulative sum, defined in the glossary) instead keeps a running total of small deviations over time; a slow drift causes that running total to steadily grow in one direction, standing out clearly even though no single reading looked alarming.

### **What happens after a sensor fault is confirmed**

Once a channel is confidently identified as faulty, the twin core can substitute its own model-predicted value (x̂ₛ from Stage 3\) in place of that broken sensor's readings, so that the rest of the pipeline — health indices, prognostics, advisories — keeps working sensibly instead of being corrupted by one bad sensor.

## **6.5 How the three detectors' outputs are used together**

None of the three detectors is used in isolation. Their combined outputs — a fast-detector event flag, an anomaly score with its confidence, and a sensor-vs-engine classification — are all passed forward together into Stage 6 (fault isolation), where they are matched against the fault-signature table built in Stage 0 to work out which specific problem is most likely and how confident that identification is.

# **Part 7 — The Remaining Stages, Explained**

## **Stage 1 — CAN ingestion (proposed design)**

This is the entry point of the whole pipeline: reading the raw electronic messages that the engine's control unit sends over the CAN bus, decoding them into named, human-readable values (RPM, CHT, EGT, etc.) using a DBC file, and time-stamping and quality-checking each message as it arrives. Every raw message is also written to a tamper-evident log using a hash chain (defined in the glossary), so recorded flights can later be replayed and trusted not to have been altered. A virtual CAN interface can stand in for real hardware during development, letting the whole pipeline be built and demonstrated with simulated or recorded data before real flight hardware is available.

## **Stage 2 — Clean and tag (proposed design)**

Raw sensor data is checked for plausibility (is the value within a physically possible range, did it change too fast to be real, has it been stuck at exactly the same value for too long), then resampled to a common rate so all channels line up in time. Each moment of data is also tagged with the current flight phase (climb, cruise, etc.) and a short regime label describing the current combination of operating conditions — both tags are used later by the anomaly model and by reporting. Suspect channels are flagged, not deleted, because later stages (particularly the sensor check in Stage 4\) need to know a channel is under suspicion, not simply have it disappear.

## **Stage 5 — Data flow into diagnosis (proposed design)**

This is a routing stage rather than a computation stage: it simply collects the twin core's θ̂ and residuals together with the three detectors' outputs and passes them all forward as one bundle into fault isolation, ensuring nothing downstream has to separately go and fetch data from four different places.

## **Stage 6 — Fault isolation (proposed design)**

This stage turns "something is wrong" into "here is what is probably wrong, and here is the evidence." It compares the live combination of symptoms — which θ moved, which residuals are large, whether a fast-detector event fired, what the sensor check concluded — against the fault-signature table built in Stage 0, scoring how well the live pattern matches each known fault type. The result is a ranked list of fault hypotheses with a confidence score for each; if nothing matches well, the honest output is "unknown anomaly" rather than forcing an incorrect specific label. To make the reasoning visible to a human maintainer, SHAP (defined in the glossary) is applied to explain which inputs drove the anomaly score, and this is combined with a plain-language physical explanation, for example: "CHT residual \+18°C, EGT normal, cooling-effectiveness parameter down 9% — matches the cooling-degradation signature."

## **Stage 7 — Health indices (proposed design)**

Each θ̂ from the twin core is converted into an easy-to-read health index between 0 and 1 (or 0–100%), using a simple formula:

HI \= clip( (θ̂ − θ\_fail) / (θ\_healthy − θ\_fail),  0,  1 )

In plain words: this measures where the current estimated health value sits on a scale from "fully failed" (θ\_fail) to "fully healthy" (θ\_healthy), and clips the result so it can never report below 0% or above 100%. θ\_healthy and θ\_fail are set during Stage 0 from simulation and engineering limits. Each subsystem (cooling, injection, lubrication, air path, electrical) gets its own index, so a maintainer can see at a glance, for example, "cooling 82%, injector 91%," rather than one vague overall number.

## **Stage 8 — Prognostics (core method, extended)**

This stage estimates Remaining Useful Life, combining two complementary approaches:

### **8.1 The trained network G (core method)**

A neural network, trained back in Stage 0 exactly as described in the hybrid physics \+ deep learning framework, takes the enhanced feature set — operating conditions, raw sensors, model-predicted sensors, virtual sensors, and θ̂ — over a short recent window of time, and outputs a direct RUL estimate. This network learns complex patterns in how the combination of all these signals has historically related to time-to-failure, without needing an explicit failure-threshold rule.

### **8.2 Trend extrapolation (proposed design)**

Separately, each θ̂'s recent trend is projected forward in time to see when it would be expected to cross its failure threshold (θ\_fail from Stage 7). Because θ̂ itself comes with an uncertainty range from the UKF, this projection is repeated many times with slightly different random starting points drawn from that uncertainty (a technique sometimes called Monte Carlo simulation), producing not just one crossing time but a whole distribution of plausible crossing times.

### **8.3 Fusing the two, with uncertainty**

The network's RUL estimate and the trend-extrapolation estimate are combined into a single answer, weighted by how much each currently agrees with the other and how confident each one is. Rather than reporting a single number, a range is reported — for example, "RUL 42 hours, 80% confidence interval 30 to 58 hours" — which is far more honest and more useful for planning than a false sense of precision from one bare number.

### **8.4 Averaging over a flight, and the prediction-horizon idea**

Point-by-point RUL predictions can jump around within a single flight, since some flight phases are more informative than others; averaging predictions over each flight helps smooth this out. A useful way to report overall performance is the prediction horizon: how far in advance, before the actual failure, the pipeline's RUL estimate becomes and stays reliably accurate — a longer prediction horizon means earlier, more trustworthy warning.

## **Stage 9 — Maintenance advisory (proposed design)**

This stage turns everything upstream into a short, actionable recommendation for a human. It combines the identified fault (Stage 6), its severity (Stage 7's health index), the RUL estimate and its uncertainty range (Stage 8), and the planned length of the next mission, into a plain-language message together with an urgency level:

| Urgency level | Typical trigger |
| :---- | :---- |
| Monitor | Minor deviation, high RUL, low urgency |
| Schedule inspection | Moderate health-index drop, or RUL comfortably longer than the next mission |
| Restrict operation | RUL close to or shorter than the next planned mission |
| Land now | A hard safety-limit breach or a confirmed fast-detector event, bypassing RUL logic entirely |

## **Stage 10 — Secure downlink (proposed design)**

Rather than transmitting continuous raw sensor data (which would need far more bandwidth than a typical UAV data link provides), the onboard system sends down compact summaries: health indices, residual summaries, alerts, and advisories. Only when an alert fires does it additionally send a short raw-data snapshot from around that event, for closer analysis on the ground. Every message is both signed (so the ground station can verify who sent it and that it wasn't tampered with) and encrypted (so its contents can't be read by an eavesdropper) — these are two different protections and both are needed, layered together with key rotation and replay protection, rather than relying on signing alone. That UAV-to-GCS rule does not change. A second, fatter link from the GCS to the hub is described in Part 9; it can carry more raw data after landing, in priority order, without asking the airborne radio to do the same job.

## **Stage 11 — Ground control station (proposed design)**

On the ground, a full copy of the twin can replay any past flight from the tamper-evident logs, exactly reproducing the onboard analysis for verification. It can also run what-if simulations — keeping the same recorded throttle history but changing the operating conditions, for example simulating a hotter day or a higher-altitude mission, to see how the engine would have behaved — which directly covers the required high-altitude, endurance, hot-weather, and rapid-throttle-transition scenarios. Heavier models that don't fit onboard, such as a detailed crank-angle-resolved combustion model, can also run here for a deeper look when needed. A dashboard presents live health status, alerts, trends, and mission-wise reports to operators and maintainers, and, optionally, model updates learned separately by multiple UAVs or test rigs can be combined centrally using federated learning (defined in the glossary), without any raw flight data ever leaving each aircraft. The GCS is also the ground node in Part 9: it is where maintainers talk to the interface model, and where flight logs are queued to the hub when the line is up. Federated learning remains the option to use if a site must not send raw data; if policy allows raw after landing, the hub can retune Stage 0 on the real files instead.

# **Part 8 — Feedback Loop and What to Remember**

## **The feedback loop**

1. After every real maintenance event, record what was actually found and compare it against what the pipeline diagnosed, to measure real-world accuracy.

2. Use confirmed real faults to correct and expand the fault-signature table and to adjust alarm thresholds.

3. Periodically re-tune the UKF's Q and R settings and the θ\_healthy / θ\_fail limits as the specific engine ages, since a very old but still-airworthy engine's "normal" may drift over its lifetime.

4. Periodically retrain the prognostics network and anomaly model on newly collected data. A useful trick is a dual-thread update: train a fresh copy of a model offline while the current copy keeps running live, then swap the fresh copy in once it's ready, so there's never a gap in live coverage.

5. When several bases are flying, send confirmed findings and known-good hours to the hub so Step 0.10 is not limited to one lab engine.  
6. Ship a new model pack only after an offline check; fly the previous pack until the new one is signed off (the dual-thread rule above).

## **Source of each piece**

Ground node, hub, interface model, model pack, and the GCS-to-hub priority link — proposed design in Part 9\. They do not change the twin core (Stage 3\) or the three detectors (Stage 4).

| Piece | Source |
| :---- | :---- |
| Twin core: physics model F, θ as a random walk, the UKF, x̂ₛ, x̂ᵥ | Core method — Arias Chao et al. (2022) |
| Enhanced 50-feature input, prognostics network G, evaluation metrics | Core method — Arias Chao et al. (2022) |
| Signature table, residual-based fault isolation, sensor-vs-engine check | Proposed design — needs validation |
| Fast misfire and vibration detectors | Standard engine-diagnostics methods, integrated here |
| Trend-extrapolation RUL, fusion with the network, uncertainty bounds | Proposed design — needs validation |
| Advisory rules, edge/ground split, secure link, replay, fleet learning | Proposed design, built to satisfy the stated requirements |

## **Two risks to keep in view**

1. All training data in Stage 0 is simulated. State this plainly in any demo, and validate against every piece of real data available, however limited — this is what genuinely separates a credible design from an overclaimed one.

2. Keep the number of health parameters (θ) small and make sure each one affects a genuinely distinguishable pattern of sensors — otherwise Stage 6's fault isolation will not be able to tell two different faults apart, no matter how good the rest of the pipeline is (the identifiability limit described in Part 5).

3. Do not put the interface model in the live estimate of θ or RUL, and do not make a live safety call wait on the hub. If the radio or the fiber is down, the UAV and the GCS must still run on the last model pack they already hold.

# **Part 9 — Ground Node, Hub, and Interface Model (proposed design)**

This part does not replace Stages 0 through 11\. It says where those stages live when the system is used by more than one aircraft, and how a person talks to the pipeline without turning a language model into the estimator of engine health. Everything here is a proposed design and should be validated in the same spirit as the other proposed stages.

## **9.1 Three computers, not two**

The glossary already distinguished the airborne edge from the ground station. With a fleet, a third computer is needed so that known-good data and confirmed maintenance findings from many bases can improve Stage 0 without each UAV having to carry that archive.  
Table A — three places

| Place | What it is | What it runs |
| :---- | :---- | :---- |
| Airborne node | The small computer on the UAV | Stages 1–10 in real time: CAN ingest, twin core, detectors, isolation, health indices, a short RUL, the advisory, and a compact signed downlink. Hard safety limits stay here. |
| Ground node (GCS rack) | The computer at BRD’s of the operating bases | Stage 11 replay and what-if work, the full flight log, the interface model for maintainers, and a queue toward the hub. |
| Central Hub | The central computer connected to all nodes | Storage of summaries and selected raw logs, re-tuning of the Stage 0 model pack, and headquarters questions through a second interface model. |

A UAV is not a ground rack. The interface model and any heavy replay stay on the ground unless the airframe has spare computing you are willing to spend. In flight, the crew and the GCS get the Stage 9 one-line advisory over the existing radio; the longer conversation happens after the packet arrives or after landing once raw MC and FCS data can be ingested.

## 

## **9.2 What the engineering model is in this part of the document**

The engineering model is the pipeline already specified: the mean-value physics model, the UKF, the three parallel detectors, fault isolation, health indices, prognostics, and the maintenance advisory. The twin core remains the source of θ̂, model sensors, virtual sensors, and residuals. The interface model does not re-predict those quantities.  
That matters for residuals. A residual is only as good as the healthy model it is measured against. Until enough known-good time exists for an engine family — an acceptance sweep or a stretch of clean operations — alerts should lean on hard safety limits, cylinder-to-cylinder spreads, and Stage 2 quality flags, not on residual thresholds alone.

## **9.3 The interface model**

The interface model sits on top of the pipeline. A person asks a question in ordinary language; the interface model is allowed to answer only from tools that return pipeline outputs:

* health parameters θ̂ and health indices (Stages 3 and 7\)  
* residuals and innovation statistics (Stage 3\)  
* detector flags, including sensor-versus-engine (Stage 4\)  
* the ranked fault list and the plain-language physical explanation (Stage 6\)  
* the remaining-useful-life range and its uncertainty (Stage 8\)  
* the advisory and urgency level (Stage 9\)  
* limits, manuals, and the last recorded maintenance notes held on that node

If a number is not in that list, the interface model must say it does not have it. It must not invent a cylinder-head temperature, an exhaust-gas temperature, or a remaining-useful-life figure.  
A second copy of the interface model may sit at the hub for fleet questions — for example, how many bases saw a cooling-effectiveness drop this month. Site staff still talk to the ground-node copy. Live conversation must not depend on the hub being reachable.

## **9.4 How Stage 0 uses the fleet**

Stage 0 still happens in the lab first: the physics model is written from engineering knowledge, health parameters are chosen so they are identifiable, faults are injected in simulation, and the UKF, the prognostics network, and the anomaly model are trained where the true θ is known.  
The hub does not write those equations. It feeds them. Known-good flights from many climates and mission types are used to calibrate the healthy model so that “normal” is not only a datasheet or a single bench cell. Confirmed maintenance findings are used to check the signature table and the thresholds, as already required in Part 8\. The injection library stays, because a real aero piston engine is still rarely run to a known failure with a complete ground-truth θ.  
Retraining follows the dual-thread rule in Part 8\. A new model pack is built offline at the hub, checked, and loaded before a flight. The live UKF does not update the physics model while the aircraft is airborne.

## **9.5 Two different links**

The airborne radio and the line from the GCS to the hub are not the same pipe. Stage 10 already limits what the UAV sends in the air. That rule stays. After landing, or on a fatter ground link, the node may send more, but still in priority order so many bases do not fill the hub at once.  
Table B — priority classes

| Class | What travels | When |
| :---- | :---- | :---- |
| P0 | Health indices, residual peaks, advisories, heartbeats, and later operator labels | Immediately, on both the radio (compact) and the ground line |
| P1 | A short raw snapshot around an alert | Next, and it may pause lower classes |
| P2 | Priority channels such as CHT, EGT, oil, and operating conditions | Often, but with a bandwidth cap |
| P3 | Remaining raw channels and extra sensors | In staggered time slots so neighbouring bases do not upload together |
| P4 | Deep archive that might never be needed | At night or in quiet periods; first to be dropped if the disk or the line is full |

P0 never waits behind raw files. Bulk uploads are sent in chunks so a new P1 alert can interrupt them and then resume the same file. Every object keeps a shared clock, a site identifier, an asset identifier, and a schema version, or the hub cannot collate logs from different bases.  
Federated learning, already listed in Stage 11, remains the path if a site is not allowed to send raw files. If policy allows it after landing, the hub’s Stage 0 loop is simply easier to run.

## **9.6 Independence when a link is cut (Built in redundancies)**

Hub reachability may make an answer richer. It must never be required for a live safety call.  
Table C — cut-link behaviour

| What is cut | What must still work |
| :---- | :---- |
| UAV radio to the GCS | Onboard Stages 1–9, especially hard safety limits and a Land now advisory. The aircraft does not wait on the ground node to decide that oil pressure is illegal. |
| GCS line to the hub | The ground interface model, local replay, and the last model pack on that node. Fleet context from other bases goes stale and should be labelled as such. |
| Both | Whatever model pack is already on the UAV and on the GCS disk. Outbound queues sit on disk until a link returns. |

## **9.7 A flight from preflight to the next sortie**

1. Before flight, the GCS loads the last approved model pack onto the UAV.  
2. In flight, the edge loop runs the twin core and the fast detectors. The radio carries P0 summaries and, if something fires, a P1 snapshot.  
3. After landing, the tamper-evident log is copied to the ground node. Maintainers talk to the interface model there. Replay and what-if work stay at Stage 11\.  
4. If the hub line is up, P0 goes first, then P1, then staggered raw. Confirmed findings are attached as labels.  
5. The hub may build a new model pack. It is checked offline and, only then, offered for the next preflight load.

## **9.8 What this part does not change**

It does not change the state-space model, the UKF cycle, the choice that each health parameter must move a distinguishable pattern of sensors, or the honest limits already stated in Part 5 and Part 8\. Training data in Stage 0 still begins in simulation. Real fleet data makes that simulation less lonely; it does not make the simulator a perfect copy of every engine in the country.  
The one-line split is: the twin flies; the interface model waits on the ground; the hub teaches between flights.

SHUBHAM DUMP 

**\#\# 9\. Density Altitude and OAT Normalisation for Cross-Flight Comparison**

Every baseline and trend computed across multiple flights implicitly assumes the flights are comparable. They are not, by default: density altitude (DA) and outside air temperature (OAT) both affect engine behaviour independently of anything mechanical.

**\#\#\# 9.1 Why Density Altitude Alone Is Not Sufficient**

DA is the correct single normalising variable for parameters that depend on air density acting on the engine or airframe — power output at a given throttle setting, manifold pressure behaviour, true airspeed for a given indicated airspeed.

This breaks down for thermal parameters. EGT, oil temperature, and coolant temperature are not purely functions of air density — they also depend on the actual temperature of the ambient air, which is simultaneously the cooling medium for the intercooler, oil cooler, and coolant radiator.

**\#\#\# 9.2 Approach**

\- **\*\*Performance-type parameters\*\*** (MAP, power output, TAS-from-IAS): normalise using DA directly  
\- **\*\*Thermal-type parameters\*\*** (EGT, oil temp, coolant temp): stratify or normalise using OAT, or both DA and OAT together  
\- **\*\*Stratification is preferred over invented correction formulas\*\*** where no OM reference exists

Fleet-level analytics across ALL logs in data/logs/.

Organised into five insight categories:

  1\. BASELINES        — what "normal" looks like for this engine,  
                         derived empirically from your own flight history  
  2\. TRENDS            — is any parameter drifting over engine hours?  
                         (includes cylinder balance stability)  
  3\. OUTLIERS          — does any single flight stick out from the pack?  
  4\. OPERATIONAL       — efficiency, utilisation, flying patterns,  
                         and per-flight engine-health observables  
                         (overboost time, oil condensation risk)  
  5\. DATA QUALITY       — sensor reliability, FADEC fuel totals

This is intentionally a SUMMARY tool — for a deep dive on one specific  
flight, use 01\_first\_flight\_analysis.py. For the ENGINE ECU-specific  
investigation, use 02\_engine\_ecu\_correlation  
