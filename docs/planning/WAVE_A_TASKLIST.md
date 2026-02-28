# Wave A Tasklist - Operator Baseline

Objective: establish a reliable operator baseline and remove legacy runtime friction before deeper semantic/runtime work.

## Interpretation Update
- Wave A remains active where legacy removal is still incomplete.
- The original web/Docker implementation framing is no longer the future-state product target.
- Remaining Wave A work should be interpreted as legacy-removal and contract-hardening work that supports the desktop transition.
- Any Wave A item that depends on browser-broker auth, VNC, or Docker as product runtime is obsolete.

## Scope
- Remove legacy auth/session paths from primary workflows.
- Enforce Salesforce CLI keychain baseline (`sf` + `cci`).
- Remove manifest-first retrieve dependency from standard operator workflows.
- Stabilize connect -> retrieve -> refresh on real sandbox metadata.

## Tasks
- [x] Replace `/org/retrieve` standard path with explicit metadata selector contract.
- [x] Deprecate and remove `SF_MANIFEST_PATH` from active runtime/config paths.
- [x] Keep selective metadata retrieval (`/org/metadata/retrieve`) as the primary retrieve path.
- [x] Ensure preflight only reports checks relevant to keychain + selector retrieval.
- [x] Make auth/session failures actionable with concrete remediation text.
- [x] Remove legacy WebUI connect controls not aligned to keychain baseline.
- [x] Add smoke suite for WebUI connect/retrieve/refresh against non-fixture source.
- [x] Update runbooks and usage docs to remove package.xml-first instructions.

## Exit Gates
- [ ] WebUI connect success rate >= 95% on benchmark runs.
- [x] Retrieve works without package.xml requirement in standard workflows.
- [x] Refresh uses non-fixture source path and succeeds.
- [x] Failure classes are explicit and operator-actionable.

## Remaining Relevant Wave A Work
- close remaining legacy-auth removal items
- make alias/session contracts explicit and stable
- ensure selector-first retrieve remains the standard path
- remove obsolete runtime/docs assumptions that conflict with the desktop target

## Evidence
- Live `GET /api/ready` shows non-fixture source path: `/app/data/sf-project/force-app/main/default`.
- Live `WEB_SMOKE_USE_SF_PROJECT=1 ./scripts/web-smoke.sh` passed on branch `wave-a`.
- Current ready counts on the real org-backed baseline:
  - `nodeCount=7024`
  - `edgeCount=51754`
