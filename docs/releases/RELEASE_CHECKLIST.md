# Release Checklist

## Purpose
Operational checklist for routine Orgumented upgrades and safe promotion.

## 1. Dependencies
- [ ] `pnpm install` completed without unresolved lockfile drift
- [ ] API tests pass: `pnpm --filter api test`
- [ ] Web typecheck passes: `pnpm --filter web typecheck`
- [ ] Docker images rebuild cleanly: `docker compose -f docker/docker-compose.yml build`

## 2. Runtime Validation
- [ ] Readiness check: `curl http://localhost:3100/ready`
- [ ] Ingest summary check: `curl http://localhost:3100/ingest/latest`
- [ ] Smoke check: `npm run phase7:smoke-live`
- [ ] Regression check: `npm run phase7:regression`

## 3. Promotion Safety
- [ ] Dry-run promotion: `npm run phase8:promotion-dry-run`
- [ ] Create restore point: `npm run phase8:restore-point:create`
- [ ] Log operator sign-off: `ORGUMENTED_OPERATOR=<name> npm run phase8:promotion-log -- promoted`
- [ ] Rollback command verified: `npm run phase8:restore-point:apply -- <stamp>`

## 4. Security/Config
- [ ] Salesforce CLI keychain alias is authenticated in runtime (`sf org display --target-org <alias> --json`)
- [ ] Keychain persistence paths are mounted and writable (`/root/.sf`, `/root/.sfdx`)
- [ ] No secrets committed (`git status`, secret scan if available)

## 5. Post-Release
- [ ] Capture new snapshot: `npm run phase7:snapshot`
- [ ] Optional retention prune: `npm run phase8:retention-prune`
- [ ] Record notes in `RELEASE.md`
