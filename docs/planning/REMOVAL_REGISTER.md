# Orgumented Removal Register

Status: active removal register

Purpose: make removal work explicit so the project stops carrying dead paths, duplicate runtime models, and failed auth ideas.

## 1. Removal Policy
- If a path is not part of the desktop target architecture, it should not be preserved as a product feature.
- Temporary migration scaffolding is allowed only if it has an explicit removal trigger.
- No new feature work should expand items listed here.

## 2. Immediate Removal Targets

### Auth and session
1. External client app auth
- status: remove
- reason: not part of target auth model

2. Access-token-based auth entry points
- status: remove
- reason: bypasses CLI keychain source of truth

3. Frontdoor/magic-link auth as primary workflow
- status: remove
- reason: convenience hack, not stable core architecture

4. Auth-code file workflows
- status: remove
- reason: obsolete OAuth-era behavior

5. Browser-broker / VNC auth sidecars
- status: remove immediately
- reason: wrong solution to containerized browser problem

### Retrieve
6. Manifest-driven standard retrieve workflow
- status: remove
- reason: standard operator workflows must be selector-driven

7. package.xml as required operator dependency
- status: remove
- reason: obsolete retrieval model

### Runtime
8. Docker as product runtime
- status: deprecate now, remove from future-state architecture
- reason: unnecessary complexity in desktop target

9. Container-specific operator instructions
- status: remove from primary docs
- reason: wrong mental model for target product

### UI
10. Endpoint-console-derived operator UI
- status: replace
- reason: not aligned to Ask-first product UX

11. Raw JSON as default answer presentation
- status: replace
- reason: operator-hostile default output

## 3. Conditional Transitional Items
These may remain temporarily during migration but must not shape future design.

1. Existing browser-hosted operator UI
- temporary role: migration scaffold only
- removal trigger: desktop workflow parity for core operator tasks

2. Docker compose setup
- temporary role: development/test harness only
- removal trigger: desktop development flow established

3. Script wrappers
- temporary role: developer support and regression harness
- removal trigger: equivalent desktop/native orchestration exists

## 4. Removal Order
1. Remove obsolete auth pathways from docs and planning claims.
2. Remove browser-broker/VNC implementation.
3. Remove superseded connect controls from primary UX.
4. Remove manifest-driven retrieve assumptions from remaining operator docs/code.
5. Deprecate Docker runtime from planning and product claims.
6. Retire old operator web shell after desktop parity.

## 5. Blockers To Watch
1. hidden dependencies on package.xml
2. hidden dependencies on Docker-mounted paths
3. stale env/config keys still referenced by scripts or docs
4. auth/session logic spread across multiple modules

## 6. Verification Checklist
- [ ] no supported operator auth flow bypasses Salesforce CLI keychain
- [ ] no primary runbook tells operators to use obsolete auth
- [ ] no primary runbook treats Docker as required product runtime
- [ ] no standard operator retrieve flow requires package.xml
- [ ] no primary UI depends on endpoint-console patterns

## 7. Governance Rule
Any item added here must include:
1. why it is obsolete
2. whether it is temporary or permanent removal
3. what blocks removal
4. what proves it is gone
