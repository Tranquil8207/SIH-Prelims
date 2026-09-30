# Fleet architecture — agent context

Standalone brief for another agent.
Describes how the UAV piston-engine digital twin is deployed: one hub, many ground nodes, many UAVs per node.
Not a pitch. Not a replacement for the plant equations (Shubham S1–S17) or the diagnostic models (Tejas Models 1–3).
Those run *inside* the boxes below.

Companion file: `Prelim_Twin_Modules_Brief.md` (detection heads, mission `b`, residual identities).
Parent pipeline: Stages 0–11 of `UAV_Engine_Digital_Twin_Pipeline`.

---

## 1. Topology

```
                         HUB
              Stage 0 retune, pack signing, fleet IM
                 |  fibre  |  pack N+1 down
                 |         |  P0-P4 + labels up
                 |         |  (or pack-delta if federated)
        ---------+---------+---------
        |                  |                  |
      NODE A             NODE B             NODE ...
      pack N             pack N             pack N
      site IM            site IM            site IM
      replay + queue     replay + queue     replay + queue
        |     |            |     |              |
     radio P0/P1        radio P0/P1         radio P0/P1
        |     |            |     |              |
      UAV A1 UAV A2      UAV B1 UAV B2        UAV ...
      edge twin          edge twin            edge twin
```

Cardinalities: 1 hub, N nodes (bases / GCS racks), M_i UAVs on node i.
A node is one administrative site. A UAV never talks to the hub directly.
A UAV never talks to another node's IM.

---

## 2. EM and IM

### 2.1 Engineering model (EM)

EM is the executable twin pipeline, not a chat weight file.

Contents:

- Plant `F` = Shubham slow (time-domain) handoff plus S16/S17 lags.
  Onboard does **not** integrate S10 at crank angle unless the board is proven.
- Residual: `r = x_s - (F(w, theta) + b(profile))`.
- Layer 0 OM redlines.
- Partitioned Stage 4 heads (thermal CUSUM/band, burn/fuel, mech `L_k`/`I_R`, lube map, open-set).
- Fast path (misfire/knock debounce).
- Stage 6 isolation table.
- Stage 5/7 HI and optional UKF `theta`.
- Stage 8 RUL (endurance indices only) when enabled.
- Stage 9 compact advisory.

EM instances:

| Instance | Where | What it may do |
| --- | --- | --- |
| Edge EM | UAV | Live 1-10. Mean-value `F`. Layer 0. Heads that fit the board. Sign P0/P1. |
| Node EM | GCS rack | Replay a log through full two-scale `F` (including S10). Tejas Models 1-3 on the log. What-if. Does not replace the airborne `theta-hat` loop. |
| Hub EM | central | Stage 0 retune of pack artefacts. No live LAND NOW. |

All three run the **same pack schema**. They do not run different physics families.

### 2.2 Interface model (IM)

IM is a grounded language model with **tools only**.

Allowed tools (must map to pipeline outputs or node-local notes):

- `theta-hat` / health indices (Stages 3, 7)
- `r` and innovation statistics (Stage 3)
- Stage 4 flags, including sensor-versus-engine
- Stage 6 ranked faults
- Stage 8 RUL band and uncertainty
- Stage 9 advisory
- OM limits, manuals, last maintenance notes stored on **that** node
- Tejas features if computed on the node: `I_R`, LTFT/STFT, EKF `b_k`, `h0` (ground)

If a quantity is not in a tool, IM says it does not have it.
IM does not estimate CHT, EGT, `theta`, or RUL from prose.
IM is never in the live control / LAND NOW path.

IM instances:

| Instance | Audience | Grounding |
| --- | --- | --- |
| Node IM | maintainers / GCS crew at that site | that node's logs, that node's pack N, that node's UAVs |
| Hub IM | fleet officer | aggregated P0 and labels across nodes; never a substitute for a site IM when the fibre is down |

No IM on the UAV.

---

## 3. What each computer is allowed to run

### 3.1 UAV edge

Must run:

- Ingest of the eight channels plus `w`
- Mean-value / cycle-average `F` from pack N
- Frozen `b(profile)` loaded at preflight
- Layer 0 versus OM
- Grouped residual heads that fit the compute budget
- Fast path (`I_R`, EGT residual, hold-on)
- Compact Stage 9 advisory
- Sign and emit P0; emit P1 on trip

Must not run:

- IM
- Crank-angle S10 as the residual rate (unless separately qualified)
- Sommerfeld `h0` / Raimondi-Boyd
- Model 3 EKF as a default (node/post-flight)
- Hub RPC
- Pack training
- Growing `b` in flight

Independence: if radio to its node dies, Layer 0 and the last pack still run.

### 3.2 Ground node

Must run:

- Pack N on disk
- Preflight: select mission profile → look up or compute `b` → push pack N + `b` to UAVs on this node
- Stage 11 replay / what-if on landed logs
- Node IM
- Upload queue with P0-P4 policy
- Tejas Models 1-3 on logs
- Optional full Shubham two-scale replay including S10

Must not run:

- The airborne estimator as if it were still flying
- Signing of a global pack (hub only)
- Inventing raw that the UAV did not record

Independence: if fibre to hub dies, node IM + pack N + local UAVs still work. Queue persists.

### 3.3 Hub

Must run:

- Collation of P0 (and allowed raw) + maintenance labels
- Retune of pack artefacts (see section 6)
- Sign pack N+1
- Fleet IM
- Optional federated aggregate of pack deltas

Must not run:

- LAND NOW
- Live S10
- Overwriting a node's pack mid-sortie

---

## 4. Information flow

### 4.1 UAV → node (radio)

| Class | Payload | When |
| --- | --- | --- |
| P0 | HI, residual peaks, detector flags, heartbeat, asset id, pack schema, profile id | always, low rate |
| P1 | short raw snapshot around an alert (channels + `w` + timestamps) | on trip; preempts nothing on this thin link except by dropping lower-value samples |

No P2-P4 on the airborne radio. No IM tokens. No pack training data.

### 4.2 Node → UAV (preflight / radio as needed)

- Pack N (or a confirmation that the UAV already holds N)
- Mission profile key
- Frozen `b` vector
- Layer 0 OM numbers if they live in the pack rather than firmware

No mid-mission pack swap.
No mid-mission `b` update (endurance slope must survive).

### 4.3 Node → hub (fibre, after landing or when a queue drains)

| Class | Payload | Policy |
| --- | --- | --- |
| P0 | same as radio P0 plus labels when maintenance exists | first; never behind raw |
| P1 | alert snapshots | next; may pause P2-P4 |
| P2 | priority raw: CHT, EGT, oil P/T, `w` | rate-capped |
| P3 | remaining raw | staggered slots so many nodes do not collide |
| P4 | deep archive | night; first dropped if disk or line is full |

Chunked files. A new P1 can preempt a P3/P4 chunk; the same file resumes.

Every object: shared clock, site id, asset id, schema version, pack id, profile id.

### 4.4 Hub → node

- Signed pack N+1 (artefact + signature + changelog)
- Optional fleet-IM answers
- Optional federated objective + current pack (when in federated mode)

Pack N+1 is **loaded at the next preflight**, not into a flying UAV.

### 4.5 Federated mode (raw must not leave the node)

Up: pack delta or gradients, plus P0 flags/labels if policy allows those.
Not up: P3-P4 time series.
Down: still a signed global pack.

Default when policy allows raw after landing: **central** mode (section 7). Federated is the exception.

---

## 5. Cut-link matrix

| Cut | UAV | Node | Hub | Notes |
| --- | --- | --- | --- | --- |
| One UAV radio down | that UAV: Layer 0 + pack N | other UAVs on the node unaffected | unaffected | sibling UAVs still P0 |
| All radios on a node down | each UAV independent | node IM has stale live P0; replay still works on last logs | that node's live P0 stops | |
| Node-hub fibre down | unchanged | pack N, IM, queues | other nodes still connected | no new pack for this node |
| Hub dark | unchanged | every node is an island | — | pack N everywhere until hub returns |
| Hub dark + one radio down | that UAV still Layer 0 | — | — | safety does not nest |

Hub reachability is IM context. It is not a precondition for LAND NOW.

---

## 6. Model pack

One signed artefact. Same schema on edge, node, hub.

Minimum fields:

- schema version
- engine family / asset class (e.g. 916iS-class)
- `F` or a surrogate of the Shubham slow model
- property model flag (temperature/composition-dependent `c_v` as locked on the plant side)
- `Q`, `R` when UKF enabled
- residual bands per channel / regime
- CUSUM slack and trip `H`
- signature table
- `b` tables keyed by profile
- Stage 8 weights when enabled
- Tejas design thresholds (`a1`, `b1`, `c1`, `N1`…) as pack fields, still uncalibrated until data exists
- Shubham constants that are allowed to move in calibration: S16 gains (first draft was badly scaled — do not ship those raw), Wiebe set once fitted, `eta_v` rule
- changelog and signature

Load only at preflight.
Dual-thread: edge flies pack N until N+1 is signed **and** loaded at a later preflight.
Live UKF does not write a new `F`.

What may change between N and N+1 (hub or federated):

- `b(profile)`
- bands, CUSUM slack
- one-class / open-set model
- S16 thermal/electrical calibration once rescaled
- detector thresholds

What must not change mid-family without a lab review:

- crank-resolved ODE structure
- Woschni form
- PFI rail structure
- Layer 0 OM numbers (those are legal limits, not learned)

---

## 7. Learning modes

### 7.1 Central (default)

Preconditions: policy allows raw after landing.

Flow:

1. Node drains P0-P4 + labels.
2. Hub fits on pooled known-good + confirmed findings.
3. Hub signs pack N+1.
4. Nodes pull N+1. Edges keep flying N until next preflight load.

### 7.2 Federated (raw sovereign)

Preconditions: raw must not leave the node.

Flow:

1. Hub sends pack N and an objective (residual reconstruction, `b` fit, one-class, or S16 calibration — pick one per round; not specified beyond this list).
2. Node computes a delta or gradients on local logs only.
3. Hub aggregates (FedAvg-style or equivalent; weights, rounds, staleness **not** specified).
4. Hub signs a global pack.

May federate: `b`, bands, one-class, thermal-net calibration.
Must not federate: live UKF state, IM weights, crank-resolved coefficients as flight control.

Rare labelled failures still come from Stage 0.3 injection, not from hoping a node has seen a seized bearing.

Optional differential privacy on the delta was named, not designed.

### 7.3 What is not learning

- IM conversation
- Growing `b` during a loiter
- Updating Wiebe mid-sortie
- Treating SIM (X-Plane / Heron) logs as known-good

---

## 8. Preflight and sortie sequence (one UAV on one node)

1. Node has pack N on disk. Operator (or scheduler) sets mission profile (high / hot / endurance / slam / combo / unknown).
2. Node looks up `b(profile)` from the pack. Unknown → `b = 0`.
3. Node pushes pack N + profile + `b` to the UAV. UAV refuses to arm if schema mismatch.
4. Flight: edge Layer 0 ∥ `F+b` ∥ heads ∥ fast path.
5. Radio P0. P1 if a head or Layer 0 trips.
6. Landing: tamper-evident log copied to the node.
7. Node IM answers from tools. Replay is Stage 11.
8. If fibre up: enqueue P0, then P1, then P2-P4. Attach labels when maintenance exists.
9. If federated: enqueue delta instead of raw.
10. Hub may later emit pack N+1. This UAV keeps pack N until a future preflight.

---

## 9. Mission `b` and architecture

`b` is selected **on the node at preflight**, stored in the pack, applied **on the edge** to `xhat` only.

    xhat_phys   = F_slow(w, theta)
    xhat_sensor = S17_lag(xhat_phys)
    xhat_used   = xhat_sensor + b(profile)
    r           = x_s - xhat_used

Do not confuse:

- mission `b(profile)` — frozen, pack-resident
- S17 `b_sensor(t)` — gauge drift, a fault
- Tejas EKF `b_k` — isolated sensor bias on the node

Endurance: node must not push a new `b` mid-loiter even if fibre is up.

---

## 10. Detection placement (which computer)

| Function | Edge | Node | Hub |
| --- | --- | --- | --- |
| OM Layer 0 | yes | replay only | no |
| Mean-value residual `r` | yes | replay | no live |
| CUSUM / band | yes | replay | threshold retune only |
| `I_R` / `L_k` | yes | replay | no |
| Signature isolation | yes (stub) | richer | table retune |
| Open-set one-class | light or skip | yes | model retune |
| `h0` / Sommerfeld | no | yes | no |
| Model 3 EKF | no default | yes | no |
| RUL trend | optional light | yes | weights retune |
| LAND NOW | edge only | advisory echo | never |

---

## 11. Identifiers

Every message and every pack object carries:

- `site_id` — the node
- `asset_id` — the UAV / engine serial
- `pack_id` — schema + version
- `profile_id` — mission key used for `b`
- `t` — shared clock
- `class` — P0…P4 or `PACK` or `DELTA`

Without these the hub cannot collate bases.

---

## 12. Failure and security notes (specified only this far)

- Packs are signed. Edge rejects unsigned or schema-mismatched packs.
- Logs on the node are tamper-evident (hash chain or equivalent; algorithm not chosen).
- IM cannot issue a pack or a LAND NOW.
- Federated deltas are treated as untrusted input to the aggregator (poisoning not designed).

---

## 13. Open items (architecture)

- Numeric radio budgets for P0/P1.
- Exact FedAvg weights, rounds, client = node vs client = tail.
- How contradictory `b` from a hot-high node and a sea-level node are merged.
- Pack storage format.
- Whether coolant temperature is a live channel on the target airframe.
- Whether Model 3 EKF ever moves to edge.
- DP budget if privacy is required.

---

## 14. Do not

- Put IM on the UAV.
- Let the hub own LAND NOW.
- Swap packs in flight.
- Grow `b` during endurance because the hub sent a nicer table.
- Send P3 raw on the airborne radio.
- Mix SIM logs into known-good used to fit `b` or `R`.
- Federate live UKF state.
- Treat federated mode as the default when raw-after-landing is allowed.

---

## 15. One-sentence contract

The edge flies pack N and says LAND NOW if the book says so.
The node explains that flight and queues what policy allows.
The hub teaches between sorties and ships pack N+1.
If any wire is cut, the box below the cut still does its job.
