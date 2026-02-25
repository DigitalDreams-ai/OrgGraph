**The dominant paradigm: Volume + Speed**

Most current thinking about context engineering is implicitly throughput-oriented. The questions being asked are: *How many tokens can I fit in the window? How fast can I retrieve them? How cheaply can I compress or summarize them?* The underlying assumption is that better context = more relevant information delivered faster. This leads to engineering work focused on chunking strategies, embedding quality, reranking pipelines, and latency optimization.

It's a fundamentally *logistical* framing -- context as cargo to be shipped efficiently.

---

**The ontological alternative**

An ontology framework asks a prior question: *What categories of things does the model need to know about, and how do those categories relate to each other?* Before worrying about retrieval speed or token budgets, you ask: what is the conceptual architecture of the domain the model is operating in?

This borrows from knowledge representation in classical AI and from ontology engineering in the semantic web tradition. An ontology isn't just a list of facts -- it's a structured account of *kinds of things*, their properties, and their relationships. Entities, classes, hierarchies, constraints, dependencies.

Applied to context engineering, this means you're not just asking "what documents are relevant to this query?" You're asking: "what does the model need to understand about the *structure of the world* it's operating in to reason well here?" That's a different question. It might include:

- **Taxonomies**: what categories exist and how do they nest
- **Causal and dependency relationships**: if X is true, what does that imply about Y
- **Constraints and invariants**: what is always true in this domain regardless of the specific case
- **Role relationships**: who can do what to whom under what conditions
- **State machines**: what transitions are possible, what triggers them

These structures aren't well-served by token-stuffing. You can retrieve ten highly relevant documents and still give the model a shallow, incoherent picture of a domain if the structural relationships aren't represented.

---

**Why this distinction matters practically**

Consider a model operating in a complex enterprise environment -- say, managing software deployments across teams with different permissions, dependencies, and release cycles. The volume/speed approach gives you fast retrieval of the most semantically similar documents to the current query. But what the model actually needs to reason well is an understanding of the *permission hierarchy*, the *dependency graph between services*, the *invariants around deployment windows*. These aren't documents you retrieve -- they're structural facts that should be architecturally present in the context, probably represented in a compact, explicit, machine-readable form rather than prose.

The ontology approach says: engineer the *shape* of what the model knows, not just the *amount*.

---

**Tensions and tradeoffs**

The volume/speed paradigm won commercially because it's largely domain-agnostic. You can build one RAG pipeline and point it at anything. Ontology engineering is expensive -- it requires deep domain expertise, it doesn't generalize easily, and ontologies go stale as the world changes.

But this tension is resolving in an interesting direction. As models get better at reasoning, the bottleneck shifts. A highly capable model given a structurally coherent but token-sparse context will often outperform the same model drowning in retrieved documents. The diminishing returns on volume are real, and they push designers toward asking harder questions about structure.

There's also a **composability argument**: ontological context is easier to compose. If you represent the permission model separately from the deployment schedule separately from the service catalog, you can mix and match them across tasks. Prose retrieved documents don't compose as cleanly -- they carry implicit assumptions, redundancies, and contradictions that compound as you add more of them.

---

**Where this points**

The most sophisticated context engineering is probably heading toward a **hybrid**: a stable ontological substrate (structured representations of the domain's invariant structure, encoded compactly and precisely) combined with dynamic retrieval for the variable, instance-level facts relevant to a particular query. The ontology gives the model a conceptual skeleton; retrieval puts flesh on it for the specific case.

This reframes what "good context" means: not maximum relevant tokens delivered fast, but *minimum sufficient structure* that enables the model to reason correctly. That's a very different optimization target.