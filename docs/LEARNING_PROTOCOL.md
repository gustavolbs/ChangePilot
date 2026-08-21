# ChangePilot AI — Learning Protocol

## Purpose

This document defines the mandatory teaching and implementation protocol for every lesson in the ChangePilot AI learning roadmap.

Its purpose is to guarantee:

- consistent lesson structure;
- progressive learning;
- alignment with the real repository state;
- incremental code evolution;
- predictable exercise scope;
- strong conceptual understanding;
- minimal architectural guessing;
- high-quality code reviews.

This protocol applies to every module and every lesson in the course.

---

# 1. Sources of Truth

Before preparing any implementation lesson, the instructor must inspect the current project state.

The following sources must be consulted:

1. `docs/ROADMAP.md`
2. `docs/PROJECT_STATE.md`
3. `docs/ARCHITECTURE.md`
4. relevant ADRs in `docs/adr/`
5. the current repository code
6. the latest relevant merged PR or implementation

The repository code is the ultimate source of truth for what currently exists.

Documentation describes intent and architecture, but it must not override the actual implementation when they diverge.

If documentation and code disagree, the discrepancy must be explicitly identified.

---

# 2. Zero Assumptions Rule

Never reference a project symbol, type, function, file, package, endpoint, service, class, interface, route, or architectural component without first verifying that it exists in the current repository.

Do not assume that something exists because:

- it was discussed in a previous lesson;
- it appeared in an earlier plan;
- it would normally exist in a similar architecture;
- it would make the current explanation easier.

If something does not exist yet, explicitly say that it will be introduced in the current lesson.

Incorrect:

> Update `EmbeddingService` to support batching.

when `EmbeddingService` does not exist.

Correct:

> There is currently no `EmbeddingService` in the repository. In this lesson we will introduce the first abstraction responsible for this behavior.

---

# 3. Evolution Rule

Every implementation lesson must begin from the current repository state.

New code must:

- extend existing code;
- deliberately refactor existing code;
- or deliberately replace an existing implementation.

Do not create parallel abstractions for concepts that the project already models unless the lesson explicitly teaches a migration or architectural change.

Example:

If the project already contains:

```ts
GenerationRequest;
```

a future lesson must not introduce:

```ts
AIRequest;
```

for the same responsibility without explicitly explaining why the existing abstraction is insufficient and why the migration is necessary.

Architecture must evolve intentionally.

---

# 4. Scope Rule

A lesson must introduce only what is necessary to teach its learning objective.

Do not introduce future technologies merely because they will eventually be useful.

For example, a lesson about embeddings must not introduce, unless specifically required:

- vector databases;
- RAG;
- reranking;
- agents;
- LangGraph;
- queues;
- workers.

Future concepts may be briefly mentioned for context, but they must not become implementation requirements before their roadmap milestone.

---

# 5. Consistency Rule

Every lesson must follow the same pedagogical structure defined in this document.

The lesson format must not change because a topic is more complex.

If a topic cannot fit the standard lesson format without becoming excessively large, divide it into smaller lessons.

Complexity must change lesson granularity, not lesson structure.

---

# 6. Lesson Size Rule

Each implementation lesson should represent a focused learning unit.

The exercise should normally be achievable in approximately:

**30–90 minutes**

for an experienced software engineer who is learning the AI-specific concept for the first time.

This is a guideline, not a strict time limit.

If an exercise requires several unrelated architectural changes, multiple new abstractions, or a large amount of boilerplate, it should probably be divided into smaller lessons.

Prefer:

```text
02.6 — AST Fundamentals
02.7 — Symbol Extraction
02.8 — Import Relationships
02.9 — AST-Aware Chunking
```

instead of:

```text
02.6 — Implement the Complete Code Intelligence Engine
```

---

# 7. Required Lesson Structure

Every lesson must use the following structure.

---

## XX.Y — Lesson Title

### 1. Where We Are

Describe the real project state relevant to the lesson.

This section must be based on repository inspection.

It should answer:

- what already exists;
- what was implemented in the previous relevant lesson;
- what packages/files are relevant;
- what does not exist yet.

Example:

```text
Current state

packages/ai/
├── generation.ts
├── adapters/
│   └── openai.ts
└── streaming.ts

apps/api/
└── ...

There is currently no embeddings package.
```

Do not invent future structure in this section.

---

### 2. Lesson Objective

Define no more than 2–3 primary learning objectives.

At the end of the lesson, the student should know exactly what they are expected to understand.

Example:

> By the end of this lesson you should be able to:
>
> - explain what an embedding represents;
> - distinguish embeddings from generated text;
> - reason about semantic similarity using vectors.

---

### 3. Concept

Explain the subject independently of frameworks and vendor APIs whenever possible.

Start with the simplest correct explanation.

Then progressively introduce technical depth.

The explanation should cover:

- what the concept is;
- what problem it solves;
- why it exists;
- important terminology;
- important limitations.

Avoid introducing implementation details before the conceptual model is clear.

---

### 4. Mental Model

Every lesson must include a simple mental model.

The goal is to answer:

> How should a software engineer think about this concept?

Prefer diagrams or concise relationships.

Example:

```text
Generative model

text
 ↓
model
 ↓
new text
```

versus:

```text
Embedding model

text
 ↓
model
 ↓
vector
```

The mental model must help the student reason about future implementations without memorizing APIs.

---

### 5. How This Fits ChangePilot

Explain why the current concept matters to the actual product.

Every lesson must connect theory to a concrete ChangePilot capability.

Example:

```text
"Where is authentication handled?"
             ↓
          embedding
             ↓
      semantic retrieval
             ↓
 relevant repository code
```

The course must never become a collection of unrelated AI tutorials.

---

### 6. Code Evolution

Before giving the exercise, explicitly show how the repository will evolve.

Use:

```text
BEFORE
```

and:

```text
AFTER THIS LESSON
```

when useful.

Example:

```text
BEFORE

packages/
└── ai/

AFTER

packages/
├── ai/
└── code-intelligence/
    └── src/
```

Explain the responsibility of each new element.

Do not provide the full exercise solution in this section.

---

### 7. Exercise

Every implementation lesson must provide a clearly scoped exercise.

The exercise must include all of the following subsections.

#### Files

Explicitly identify files to create, modify, and avoid modifying when relevant.

Example:

```text
Create:
- packages/code-intelligence/src/vector.ts
- packages/code-intelligence/src/vector.test.ts

Modify:
- packages/code-intelligence/src/index.ts

Do not modify:
- apps/web
- apps/api
```

#### Required Behavior

Describe what must be implemented in behavioral terms.

Prefer requirements over implementation instructions.

#### Constraints

Explicitly define restrictions.

Examples:

- do not use an external math library;
- do not introduce a provider SDK;
- do not alter existing public contracts;
- keep the function pure;
- do not implement future roadmap concepts.

#### Required Cases

List important cases the implementation must support.

#### Tests

Define what should be tested.

Do not necessarily provide the complete test implementation unless writing the test itself is not part of the learning goal.

#### Acceptance Criteria

Every exercise must include:

- [ ] requested behavior is implemented;
- [ ] existing public contracts remain valid unless explicitly changed;
- [ ] tests for the lesson pass;
- [ ] existing tests continue to pass;
- [ ] lint passes;
- [ ] type checking passes;
- [ ] build passes when applicable;
- [ ] no unrelated future concepts were introduced.

---

# 8. Exercise Solution Rule

Do not provide the complete solution immediately before asking the student to implement it.

Examples used during the conceptual explanation must not directly solve the exercise.

The learning flow should be:

```text
exercise
   ↓
student implementation
```

If the student becomes blocked:

```text
exercise
   ↓
hint
   ↓
stronger hint
   ↓
partial solution
   ↓
full explanation only if necessary
```

The goal is active implementation, not transcription.

---

# 9. Learning Verification

Every lesson must end with a section:

## What You Should Be Able to Explain

Include 3–7 questions or statements the student should be able to explain after completing the exercise.

Example:

> You should now be able to explain:
>
> - what an embedding is;
> - why two semantically related texts may produce nearby vectors;
> - why vector dimensionality exists;
> - why semantic similarity is useful for ChangePilot.

The student should understand the engineering concept, not merely have passing tests.

---

# 10. Pull Request Workflow

For implementation lessons, the default workflow is:

```text
main
 ↓
lesson branch
 ↓
implementation
 ↓
tests
 ↓
pull request
 ↓
review
 ↓
corrections
 ↓
approval
 ↓
merge
```

The instructor should stop after giving the exercise.

The lesson must not automatically continue into the next roadmap item.

The final instruction should normally be:

1. implement the exercise;
2. run the required checks;
3. open a pull request;
4. send the PR link for review.

Do not start the next lesson until the current implementation has been reviewed and accepted.

---

# 11. Code Review Protocol

When reviewing a lesson PR, evaluate at least:

- correctness;
- alignment with lesson requirements;
- TypeScript modeling;
- architecture and responsibility boundaries;
- coupling;
- naming;
- readability;
- edge cases;
- tests;
- regression risk;
- unnecessary abstractions;
- premature implementation of future concepts.

Review the actual diff and current repository state.

Do not review based only on the expected solution.

When problems exist:

1. identify the problem;
2. explain why it matters;
3. provide guidance;
4. allow the student to correct it.

Do not automatically rewrite the implementation unless explicitly requested.

---

# 12. Roadmap Rule

`docs/ROADMAP.md` defines the intended learning progression.

Lessons must follow the roadmap order unless there is a deliberate reason to adjust it.

If the current implementation reveals that a roadmap topic:

- is too large;
- needs a prerequisite;
- should be split;
- should be postponed;

the instructor may propose a roadmap adjustment.

The change must be explicit.

Do not silently reorder the course.

---

# 13. Project State Rule

`docs/PROJECT_STATE.md` must describe what currently exists, not what is planned.

At appropriate milestones or module closures, update:

- implemented capabilities;
- important contracts;
- current architecture;
- known limitations;
- current milestone;
- next milestone.

Do not place speculative architecture in `PROJECT_STATE.md`.

---

# 14. Architecture Documentation Rule

`docs/ARCHITECTURE.md` describes the architecture that actually exists.

Update it when architectural boundaries materially change.

Examples:

- API starts consuming `packages/ai`;
- code intelligence package is introduced;
- persistence is added;
- workers are introduced;
- MCP server becomes part of the system.

Minor implementation details do not require architecture documentation updates.

---

# 15. ADR Rule

Create an ADR when the project makes a meaningful architectural decision with reasonable alternatives.

Examples:

- separate API from Next.js;
- choose a vector database;
- introduce a queue;
- adopt LangGraph;
- choose a persistence model.

Do not create ADRs for trivial implementation details.

---

# 16. Abstraction Rule

Do not introduce abstractions merely because they may be useful in the future.

Prefer:

```text
concrete problem
 ↓
first implementation
 ↓
second use case / pressure
 ↓
identify common responsibility
 ↓
abstraction
```

instead of:

```text
imagined future
 ↓
generic interface
 ↓
factory
 ↓
manager
 ↓
unused abstractions
```

Abstractions should emerge from demonstrated requirements.

---

# 17. Provider Rule

Provider-specific details must remain explicit until there is sufficient evidence for a shared abstraction.

Do not force different AI providers into an artificial common denominator.

When adding or comparing providers, distinguish:

- ChangePilot domain concepts;
- provider-specific capabilities;
- genuinely common behavior;
- capabilities that should remain provider-specific.

---

# 18. Framework Rule

Frameworks must be introduced only after the underlying problem and primitives have been understood.

Examples:

Before LangGraph:

- understand agent loops;
- state;
- routing;
- stopping conditions.

Before advanced RAG frameworks:

- understand retrieval;
- ranking;
- context construction.

When introducing a framework, explicitly explain:

> What code or complexity is this framework now replacing or managing for us?

---

# 19. Difficulty Rule

Difficulty should increase progressively.

A lesson may introduce conceptual complexity, implementation complexity, or architectural complexity, but should avoid increasing all three dramatically at once.

Prefer progressive evolution:

```text
concept
 ↓
isolated primitive
 ↓
package integration
 ↓
API integration
 ↓
product feature
 ↓
production concerns
```

---

# 20. Product Rule

ChangePilot is both a learning project and a real software product.

Whenever practical, learning should eventually produce a useful product capability.

However, product polish must not obscure the current learning objective.

Do not build large UI, authentication, billing, infrastructure, or SaaS features before they are needed by the roadmap.

---

# 21. Module Closure

At the end of every module:

1. review the module's roadmap items;
2. confirm all required concepts were covered;
3. review repository architecture;
4. remove obsolete experiments when appropriate;
5. update `PROJECT_STATE.md`;
6. update `ARCHITECTURE.md` when necessary;
7. update `ROADMAP.md`;
8. review relevant ADRs;
9. summarize what the student should now understand;
10. identify the exact starting state for the next module.

A module is not complete merely because all lesson numbers were visited.

It is complete when the concepts and implementation form a coherent foundation for the next module.

---

# 22. Mandatory Lesson Ending

Every implementation lesson should end with:

## What You Should Be Able to Explain

followed by the lesson's learning verification points.

Then:

## Exercise

with the implementation requirements and acceptance criteria.

Finally:

## When You Finish

```text
1. Run the required checks.
2. Open the lesson pull request.
3. Send the PR link for review.

Do not start the next lesson yet.
```

This ending should remain consistent across the entire course.
