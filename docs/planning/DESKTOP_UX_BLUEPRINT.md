# Orgumented Desktop UX Blueprint

Status: target UX blueprint

Purpose: define the product UX for a desktop-native Orgumented where Ask is the flagship feature and all supporting workflows are organized around operator decision-making.

## 1. UX Principles
- Ask is the first screen and the primary action.
- Operators should think in decisions and explanations, not endpoints and payloads.
- Raw JSON is available, but never the primary mode.
- Org connectivity should feel like selecting a local tool-backed session, not configuring auth internals.
- Retrieval should feel like browsing and selecting meaning-rich metadata, not running deployment commands.

## 2. Primary Navigation
Desktop navigation should be stable and minimal:

1. Ask
2. Org Sessions
3. Org Browser
4. Refresh and Build
5. Explain and Analyze
6. Proofs and History
7. Settings and Diagnostics

## 3. Home / Launch Experience
When the app opens:
1. show current org session status
2. show Ask input front and center
3. show latest graph snapshot and trust state
4. show quick actions:
- connect org
- refresh aliases
- browse metadata
- run refresh

## 4. Ask Workspace
Ask is the flagship and should occupy the primary screen.

### Layout
1. question composer
2. decision packet panel
3. evidence/proof rail
4. follow-up actions
5. optional raw JSON inspector

### Default response structure
1. short answer
2. deterministic explanation
3. why this answer is trusted
4. proof metadata
5. citations/evidence
6. follow-up options

### Follow-up options
- inspect impacted automation
- inspect permissions
- open proof
- compare alternatives
- save to history

## 5. Org Sessions Workspace
Purpose: manage local Salesforce org connectivity without exposing unnecessary auth complexity.

### Core UI
1. detected aliases list
2. alias details:
- username
- instance URL
- org ID
- sf status
- cci status
3. actions:
- refresh aliases
- connect
- switch
- disconnect
- add new org

### Add New Org
This should launch local CLI-backed login, not embed a custom auth system.

## 6. Org Browser Workspace
Purpose: allow org-wide selective retrieve using a real metadata browsing experience.

### Core behaviors
- search across metadata types
- expand metadata types
- search within members
- multi-select members
- retrieve cart
- retrieve selected
- show retrieval progress and results

### UX rule
This must feel like a product-grade org browser, not a text box over a REST endpoint.

## 7. Refresh and Build Workspace
Purpose: turn retrieved metadata into a usable semantic state.

### Panels
1. current source state
2. refresh controls
3. job status
4. drift/change summary
5. recent refresh history

### Key outputs
- source path
- snapshot ID
- node/edge/evidence counts
- drift summary
- ontology validation state

## 8. Explain and Analyze Workspace
Purpose: expose deterministic architecture analysis workflows without making operators build URL queries manually.

Modes:
1. permissions
2. automation
3. impact
4. system permissions
5. later: release risk / simulation

### UX rule
Results must be readable explanation cards first, structured details second.

## 9. Proofs and History Workspace
Purpose: make proof and replay usable without forcing operators to manage opaque IDs manually.

### Required behaviors
- recent question history
- saved labeled sessions
- retrieve proof by human-readable label
- replay from history
- inspect trust/policy envelope
- export/share decision packet

### UX rule
Policy IDs, proof IDs, and replay tokens are implementation details. They can be shown, but the operator should not have to manage them manually.

## 10. Settings and Diagnostics Workspace
Purpose: provide runtime transparency without making the entire app feel like a debug console.

Should include:
- detected `sf` and `cci`
- version checks
- local storage paths
- health summary
- logs
- advanced settings
- support bundle export

## 11. Visual Direction
The desktop app should feel modern, precise, and operator-grade.

Requirements:
- clean typography
- strong information hierarchy
- task-oriented panels
- minimal chrome
- deliberate color system
- motion used for status and transitions, not decoration

Avoid:
- recycled endpoint-console layouts
- wall-of-cards without hierarchy
- raw JSON as main content
- auth/config clutter in primary views

## 12. Interaction Model
- high-frequency operator actions must be one or two clicks
- long-running jobs need visible status and artifacts
- every failure state needs a clear next action
- every important decision should be recoverable from history

## 13. Desktop-Native Expectations
- remember recent orgs
- remember recent asks
- allow background jobs
- provide local notifications for job completion/failure
- provide persistent history without browser-local fragility

## 14. UX Exit Criteria
The UX blueprint is considered implemented only when:
1. Ask is the clear primary surface
2. org connect/select flows are simple and local-native
3. org browser supports org-wide selective retrieval
4. proof/history are accessible without token bookkeeping
5. raw JSON is secondary, not the main product experience
