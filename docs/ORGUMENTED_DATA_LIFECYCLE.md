# Orgumented Data Lifecycle

This document maps how org data moves through Orgumented and how Ask answers are produced, persisted, and replayed.

## 1) End-to-End Runtime Flow

```mermaid
flowchart TD
    A[Operator Connects Org] --> B[Session Connect API]
    B --> C[sf CLI Keychain Auth]
    C --> D[CCI Alias Bridge]
    D --> E[Org Session State Connected]

    E --> F[Metadata Retrieve]
    F --> G[Retrieved Files in SF Project Path]
    G --> H[Refresh Ingestion Pipeline]

    H --> I[Parsers Transform Metadata]
    I --> J[Typed Graph Payload Nodes and Edges]
    J --> K[Ontology Constraint Validation]

    K -->|Pass| L[Graph Store Update]
    K -->|Fail| M[Refresh Error and Report]

    L --> N[Evidence Index Update]
    N --> O[Snapshot and Drift State Update]
    O --> P[Ready for Query and Ask]
```

## 2) Retrieval Paths

```mermaid
flowchart LR
    A[Retrieve Trigger] --> B{Mode}
    B --> C[Org Retrieve Pipeline]
    B --> D[Selective Metadata Retrieve]
    B --> E[Local Refresh Only]

    C --> C1[/org/retrieve]
    C1 --> C2[sf project retrieve start]
    C2 --> C3[data/sf-project/force-app/main/default]

    D --> D1[/org/metadata/catalog]
    D --> D2[/org/metadata/members]
    D --> D3[/org/metadata/retrieve]
    D3 --> C3

    E --> E1[/refresh with fixturesPath]
    E1 --> E2[Parse Existing Local Metadata]
```

## 3) Ask Determination Flow

```mermaid
flowchart TD
    A[Ask Request] --> B[Input Validation]
    B --> C[Planner Intent and Entity Extraction]
    C --> D{Intent}

    D -->|perms| E1[queries.perms]
    D -->|automation| E2[analysis.automation]
    D -->|impact| E3[analysis.impact]
    D -->|mixed| E4[Deterministic Composition]
    D -->|unknown| E5[Reject or Low Trust Path]

    E1 --> F[Deterministic Result Set]
    E2 --> F
    E3 --> F
    E4 --> F
    E5 --> F

    F --> G[Evidence Search and Citation Binding]
    G --> H[Policy and Trust Evaluation]
    H --> I[Ask Response Envelope]
```

## 4) Answer and Proof Lifecycle

```mermaid
flowchart TD
    A[Ask Response Built] --> B[Return JSON to Client]
    A --> C[Persist Proof Artifact]
    A --> D[Persist Metrics Record]

    C --> E[Proof Lookup by proofId]
    C --> F[Replay Lookup by replayToken]
    F --> G[Deterministic Re-execution]
    G --> H[Replay Match Evaluation]

    D --> I[Metrics Export]
    D --> J[Trust Dashboard Aggregation]
```

## 5) State Artifacts

- Runtime session state: connected or disconnected alias.
- Retrieved metadata tree: Salesforce project parse path.
- Graph state: typed nodes and edges in configured graph backend.
- Evidence index: source snippets and references used by Ask.
- Snapshot and drift state: refresh output and semantic delta metadata.
- Proof store: immutable Ask proof records with replay tokens.
- Metrics store: trust, policy, provider, and performance records.

## 6) Determinism Contract

For a fixed snapshot, policy, and query:

1. Planner emits the same intent and plan.
2. Deterministic graph calls produce the same core result.
3. Proof replay should match prior result payload semantics.
4. Any mismatch is surfaced as replay non-match, not hidden.
