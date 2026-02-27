# Deployment Sizing Guide

## Baseline Topology
- `web`: Next.js operator console
- `api`: NestJS runtime + parsers + trust engine
- `postgres`: persistence for production mode

## Small Team (1-3 operators)
- API: 1 vCPU / 2 GB RAM
- Web: 0.5 vCPU / 1 GB RAM
- Postgres: 1 vCPU / 2 GB RAM / SSD

## Medium Team (4-15 operators)
- API: 2 vCPU / 4 GB RAM
- Web: 1 vCPU / 2 GB RAM
- Postgres: 2 vCPU / 4 GB RAM / SSD

## Heavy Analysis (large org + simulation)
- API: 4 vCPU / 8 GB RAM
- Web: 1-2 vCPU / 2 GB RAM
- Postgres: 4 vCPU / 8 GB RAM / SSD with tuned shared buffers

## Operational SLO Targets
- `/ready` 99.9% uptime
- trust dashboard refresh < 2s
- simulation endpoint p95 < 3s for baseline payloads

## Capacity Triggers
Scale API when either is sustained for >10 minutes:
- CPU > 75%
- p95 `/ask` or `/ask/simulate` > 3s
