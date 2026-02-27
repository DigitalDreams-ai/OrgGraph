# Wave A Tasklist - Operator Baseline

Objective: establish a reliable operator baseline and remove legacy runtime friction before deeper semantic/runtime work.

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
- [ ] Make auth/session failures actionable with concrete remediation text.
- [ ] Remove legacy WebUI connect controls not aligned to keychain baseline.
- [ ] Add smoke suite for WebUI connect/retrieve/refresh against non-fixture source.
- [x] Update runbooks and usage docs to remove package.xml-first instructions.

## Exit Gates
- [ ] WebUI connect success rate >= 95% on benchmark runs.
- [x] Retrieve works without package.xml requirement in standard workflows.
- [ ] Refresh uses non-fixture source path and succeeds.
- [ ] Failure classes are explicit and operator-actionable.
