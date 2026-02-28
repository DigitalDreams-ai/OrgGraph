# Orgumented Desktop Transition Plan

Status: migration plan

Purpose: define how Orgumented moves from the prior browser-hosted and Docker-oriented implementation to a desktop-native product built on Next.js + NestJS.

## 1. Migration Goal
Move Orgumented to a desktop-native runtime where:
- Next.js provides the product UI
- NestJS remains the semantic engine initially
- Tauri provides the desktop shell
- Salesforce CLI keychain becomes the only auth source of truth
- Docker is removed from product architecture
- Windows is the only supported desktop platform

## 2. Transition Constraints
- No big-bang rewrite combined with backend contract churn.
- No preserving Docker as a first-class target.
- No further investment in legacy auth paths.
- Ask remains the flagship workflow during and after migration.
- Existing semantic logic should be reused where it provides real lift.

## 3. Current State
- current operator surface is still implemented as an embedded Next.js app that can also be exercised through local dev servers
- runtime still carries cleanup debt from prior Docker assumptions
- auth/session logic has accumulated legacy paths and failed experiments
- semantic engine contains substantial reusable value
- UI does not yet represent the desired product quality

## 4. Target State
- desktop-native local app
- Windows desktop application only
- clean local auth/session model based on `sf` + `cci`
- fresh workflow-native UI
- Ask-first interaction model
- local stores for graph, evidence, proof, and history
- no product-critical dependency on Docker

## 5. Migration Strategy
Use staged replacement, not parallel indefinite support.

Phase D1: architecture freeze
- approve desktop target architecture
- approve framework decisions: Tauri + Next.js + NestJS
- freeze auth model: Salesforce CLI keychain only
- freeze product rule: Docker is not a supported future-state runtime

Phase D2: codebase boundary hardening
- isolate tool execution behind a single adapter layer
- centralize config and local-path management
- remove UI/runtime assumptions from domain services where possible
- inventory every auth, retrieve, and storage assumption

Phase D3: legacy removal preparation
- create deletion register
- mark all unsupported auth paths
- stop expanding current web-auth UX
- stop adding Docker-specific operator flows

Phase D4: desktop foundation
- stand up Tauri shell
- run NestJS backend locally under managed lifecycle
- integrate Next.js frontend in desktop shell
- add settings, diagnostics, and local runtime status

Phase D5: session and retrieve migration
- implement local alias discovery
- implement connect/switch/disconnect
- implement selector-based retrieve through desktop workflows
- implement local retrieve history and failures

Phase D6: Ask-first UX migration
- make Ask the default workspace
- convert answer rendering to decision packet UX
- integrate proof, history, replay, and follow-up actions

Phase D7: full cutover
- retire current primary web-hosted operator UI
- retire Docker product assumptions
- close remaining legacy-removal gates

## 6. Workstream Breakdown
1. Product and UX
- information architecture
- screen map
- desktop interaction patterns
- Ask-first decision packet UX

2. Runtime and platform
- Tauri shell
- local process lifecycle
- path management
- local diagnostics

3. Backend and domain
- tool adapters
- session management
- retrieve pipeline
- Ask/proof/policy logic

4. Data and storage
- local app data layout
- graph/evidence/proof persistence
- run history

## 7. Keep / Replace Strategy
Keep:
- ontology package
- parsers
- ingestion pipeline
- graph/query logic
- proof/replay/trust logic
- most DTOs and structured outputs

Refactor:
- config service
- org service
- retrieve orchestration
- proof access model
- path and persistence services

Replace:
- current operator WebUI shell
- Docker-first runtime assumptions
- legacy auth paths
- browser-broker ideas

## 8. Cutover Rules
- New desktop workflows must reach parity before legacy operator claims are made.
- No "operator-ready" claim until connect, retrieve, refresh, Ask, and proof replay succeed in desktop runtime.
- Legacy browser-hosted operator flows are removal debt and must not be treated as supported product paths.

## 9. Risks
1. Maintaining two first-class runtimes too long
- result: duplicated effort and architectural drift

2. Carrying legacy auth paths into desktop design
- result: complexity without value

3. Reusing the current UI structure
- result: desktop app that still feels like a debug console

4. Mixing migration with large semantic-engine rewrites
- result: no stable baseline

## 10. Risk Controls
- one target runtime model
- one auth model
- explicit delete list
- phased adoption gates
- module-level keep/refactor/delete inventory

## 11. Recommended Immediate Deliverables
1. `DESKTOP_ARCHITECTURE.md`
2. `DESKTOP_UX_BLUEPRINT.md`
3. `LEGACY_REMOVAL_REGISTER.md`
4. `REUSE_REFACTOR_DELETE_MATRIX.md`
5. roadmap update mapping future waves to desktop transition work
6. `DESKTOP_RUNTIME_HARDENING_TODO.md`

## 12. Completion Criteria
Desktop transition is complete when:
1. Orgumented runs locally as a desktop application
2. the supported desktop runtime is Windows and does not depend on Linux/macOS desktop support
3. operator connects an org using local CLI-backed alias workflows
4. selective retrieve works from desktop UX
5. Ask, proof, replay, and explain flows run in desktop UX
6. Docker is no longer required for product use
