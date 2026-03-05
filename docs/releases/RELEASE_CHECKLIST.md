# Release Checklist

## Purpose
Operational checklist for Orgumented desktop release readiness and rollback safety.

## 1. Local Build/Test Gate
- [ ] Dependency install passes: `pnpm install --frozen-lockfile`
- [ ] API tests pass: `pnpm --filter api test`
- [ ] Web typecheck passes: `pnpm --filter web typecheck`
- [ ] Web build passes: `pnpm --filter web build`
- [ ] Desktop readiness passes: `pnpm desktop:info`
- [ ] Desktop shell build passes: `pnpm desktop:build`
- [ ] Packaged smoke passes: `pnpm desktop:smoke:release`

## 2. Runtime Validation Gate
- [ ] `/ready` returns healthy runtime: `curl http://127.0.0.1:3100/ready`
- [ ] latest ingest summary is readable: `curl http://127.0.0.1:3100/ingest/latest`
- [ ] org status is reachable: `curl http://127.0.0.1:3100/org/status`
- [ ] smoke artifacts reviewed under:
  - `logs/desktop-release-smoke-*.json`
  - `logs/desktop-release-smoke.*.log`

## 3. Operator Workflow Gate (Real Org)
- [ ] Runbook pass completed: `docs/runbooks/REAL_ORG_DESKTOP_QUICKSTART.md`
- [ ] Alias connect proof captured (Org Sessions screenshot)
- [ ] Browser retrieve/cart proof captured (Org Browser screenshot)
- [ ] Ask proof captured (decision packet + citations + replay token)
- [ ] Non-author operator executed the runbook once end-to-end

## 4. Promotion Safety / Rollback
- [ ] Dry-run promotion: `pnpm phase8:promotion-dry-run`
- [ ] Create restore point: `pnpm phase8:restore-point:create`
- [ ] Log operator sign-off: `ORGUMENTED_OPERATOR=<name> pnpm phase8:promotion-log -- promoted`
- [ ] Rollback command verified: `pnpm phase8:restore-point:apply -- <stamp>`

## 5. Security/Config
- [ ] Salesforce CLI keychain alias is authenticated in runtime (`sf org display --target-org <alias> --json`)
- [ ] Local Salesforce CLI keychain is readable from the operator environment
- [ ] No secrets committed (`git status`, secret scan if available)

## 6. Post-Release
- [ ] Capture new snapshot: `pnpm phase7:snapshot`
- [ ] Optional retention prune: `pnpm phase8:retention-prune`
- [ ] Record notes in `RELEASE.md`
