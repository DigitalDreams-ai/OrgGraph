# Deployment Sizing Guide

## Baseline Topology
- `desktop shell`: Tauri window plus WebView2
- `embedded UI`: Next.js operator layer
- `local engine`: NestJS runtime + parsers + trust engine
- `storage`: SQLite local-first by default, Postgres only when a later storage wave explicitly requires it

## Small Team (1-3 operators)
- Windows desktop: 4 logical cores / 8 GB RAM
- Local engine working set: 1 vCPU equivalent / 2 GB RAM
- Embedded UI working set: 0.5 vCPU equivalent / 1 GB RAM

## Medium Team (4-15 operators)
- Windows desktop: 6 logical cores / 16 GB RAM
- Local engine working set: 2 vCPU equivalent / 4 GB RAM
- Embedded UI working set: 1 vCPU equivalent / 2 GB RAM

## Heavy Analysis (large org + simulation)
- Windows desktop: 8 logical cores / 32 GB RAM
- Local engine working set: 4 vCPU equivalent / 8 GB RAM
- Embedded UI working set: 1-2 vCPU equivalent / 2 GB RAM
- Optional external storage sizing should be defined only when a Postgres-backed wave is active

## Operational SLO Targets
- `/ready` 99.9% uptime
- trust dashboard refresh < 2s
- simulation endpoint p95 < 3s for baseline payloads

## Capacity Triggers
Scale API when either is sustained for >10 minutes:
- CPU > 75%
- p95 `/ask` or `/ask/simulate` > 3s
