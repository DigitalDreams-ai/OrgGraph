# UI Workflow Tour (Phase 25)

This runbook is the fastest path through the new Orgumented WebUI.

## Tabs and Purpose
- `Connect`: establish or switch active org session and verify tooling readiness.
- `Org Browser`: search metadata types/members and build retrieval cart.
- `Refresh & Build`: run graph refresh and compare snapshot diffs.
- `Analyze`: run deterministic permission, automation, and impact checks.
- `Ask`: ask deterministic natural-language questions with proof envelope.
- `Proofs & Metrics`: inspect proof artifacts, replay, and export metrics.
- `System`: inspect diagnostics, meta-context actions, and action telemetry.

## Happy Path (Operator)
1. Open `Connect`.
2. Select auth path (`CumulusCI`, `SF CLI`, or `Magic Link`).
3. Set alias and run `Check Session` then `Connect Org`.
4. Open `Org Browser` and click `Refresh Types`.
5. Expand types, add members/types to retrieval cart.
6. Click `Retrieve Selected`.
7. Open `Refresh & Build` and run `Run Refresh`.
8. Open `Analyze` and run permission/automation/impact checks.
9. Open `Ask` and run deterministic question.
10. Open `Proofs & Metrics` for replay and export.

## Troubleshooting
- If status is not ready, use `Connect` > `Check Tool Status`.
- If metadata list is empty, run `Connect Org`, then `Refresh Types` again.
- If output fails, open `System` and inspect recent errors.

## Validation Commands
```bash
npm run test:web-smoke
npm run test:ui-smoke
```

Artifacts produced by UI smoke:
- `artifacts/ui-smoke-playwright.png`
- `artifacts/ui-smoke-page.html`
