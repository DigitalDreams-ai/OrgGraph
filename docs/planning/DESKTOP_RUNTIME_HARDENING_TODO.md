# Desktop Runtime Hardening TODO

Status: active follow-on checklist

Purpose: track the remaining browser-era and dev-server-era carryover that still affects the standalone Windows desktop product.

## Assessment Summary
- Docker is no longer part of the active product runtime.
- The remaining cleanup debt is primarily browser-era architecture and verification carryover.
- Orgumented is still partly implemented as a local web/server stack wrapped by Tauri, rather than a fully self-owned desktop runtime.

## 1. Runtime Ownership
- [x] Make the packaged desktop shell explicitly own API process startup and shutdown.
- [ ] Make the packaged desktop shell explicitly own embedded UI runtime startup and shutdown.
- [x] Prove the packaged desktop app can start required local services without relying on dev-only orchestration.
- [x] Remove primary-runtime dependence on the standalone Next server path in `apps/web/.next/standalone/apps/web/server.js`.
- [ ] Replace environment assumptions that treat `http://localhost:3100` and `http://127.0.0.1:3001` as the permanent desktop runtime contract.

## 2. Desktop Data Boundary
- [x] Replace the browser-style `/api/query` Next proxy with a desktop-native request boundary.
- [x] Remove the large route multiplexer in `apps/web/app/api/query/route.ts` from the primary product path.
- [ ] Reduce or remove `NEXT_PUBLIC_API_BASE` dependence for the primary desktop runtime.
- [x] Decide whether health/readiness checks should be exposed through a desktop-native bridge instead of a browser-style proxy.

## 3. Verification Cleanup
- [x] Replace browser-era UI smoke checks with desktop-shell verification.
- [x] Replace Playwright screenshot proofs that assume a browser-first surface.
- [x] Remove stale browser-era UI smoke scripts and their outdated expectations from the repo.
- [x] Make the primary product verification path prove the packaged desktop shell, not only the local web surface.

## 4. UI Structure Cleanup
- [ ] Break the monolithic `apps/web/app/page.tsx` into workspace modules.
- [ ] Move Ask rendering into explicit decision-packet components.
- [ ] Move Org Sessions, Org Browser, Refresh & Build, Explain & Analyze, Proofs & History, and Settings & Diagnostics into separate feature modules.
- [ ] Remove inherited endpoint-console patterns that still leak into the desktop UX.

## 5. Documentation Cleanup
- [ ] Remove outdated browser-proof references from operator docs.
- [x] Remove stale `/api/query` examples from user-facing guidance once the desktop-native boundary replaces them.
- [ ] Keep docs explicit about what is product runtime versus verification-only tooling.

## 6. Current Carryover Reference Points
- `apps/desktop/src-tauri/tauri.conf.json`
- `apps/desktop/scripts/dev-runtime.mjs`
- `apps/web/app/lib/status-client.ts`
- `apps/web/app/page.tsx`
- `scripts/desktop-release-smoke.ps1`

## 7. Completion Condition
This checklist is complete when:
1. the packaged Windows desktop app owns its required local processes,
2. the primary desktop path no longer depends on the browser-style Next proxy layer,
3. verification proves the desktop shell rather than a browser-hosted surface,
4. UI workspaces are modular and no longer inherit the old console structure.
