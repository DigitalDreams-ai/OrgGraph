# Release Checklist

## Purpose
Operational checklist for routine Orgumented upgrades and safe promotion.

## 1. Dependencies
- [ ] `pnpm install` completed without unresolved lockfile drift
- [ ] API tests pass: `pnpm --filter api test`
- [ ] Web typecheck passes: `pnpm --filter web typecheck`
- [ ] Desktop readiness passes: `pnpm desktop:info`
- [ ] Desktop shell build passes: `pnpm desktop:build`

## 2. Runtime Validation
- [ ] Readiness check: `curl http://localhost:3100/ready`
- [ ] Ingest summary check: `curl http://localhost:3100/ingest/latest`
- [ ] Packaged shell smoke passes: `pnpm desktop:smoke:release`
- [ ] Review smoke artifacts under `logs/desktop-release-smoke-*.json` and `logs/desktop-release-smoke.*.log`

## 3. Promotion Safety
- [ ] Dry-run promotion: `npm run phase8:promotion-dry-run`
- [ ] Create restore point: `npm run phase8:restore-point:create`
- [ ] Log operator sign-off: `ORGUMENTED_OPERATOR=<name> npm run phase8:promotion-log -- promoted`
- [ ] Rollback command verified: `npm run phase8:restore-point:apply -- <stamp>`

## 4. Security/Config
- [ ] Salesforce CLI keychain alias is authenticated in runtime (`sf org display --target-org <alias> --json`)
- [ ] Local Salesforce CLI keychain is readable from the operator environment
- [ ] No secrets committed (`git status`, secret scan if available)

## 5. Post-Release
- [ ] Capture new snapshot: `npm run phase7:snapshot`
- [ ] Optional retention prune: `npm run phase8:retention-prune`
- [ ] Record notes in `RELEASE.md`
