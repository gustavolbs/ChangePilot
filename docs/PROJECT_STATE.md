# Project State

Last updated: 2026-08-26

## Current milestone

02 — Embeddings and Code Intelligence in progress.

## Project status

ChangePilot currently has an early but functional vertical slice for AI-powered
change reviews.

A user can manually describe a software change in the web interface and receive
an incremental review generated through the API.

The system can run with either:

- OpenAI as the real provider
- a deterministic local Fake provider

The current product does not inspect repositories or GitHub pull requests
automatically.

An early `packages/code-intelligence` package now exists as an educational
foundation, but it is not connected to the product runtime.

## Product capability currently available

### Web application

The Next.js application currently provides:

- change-description input
- review request submission
- incremental text rendering
- generation status
- stop/cancel action
- completed state
- cancelled state
- public error presentation
- partial output preservation
- incomplete finish-reason handling
- client-perceived latency measurement

### API application

The Hono API currently provides:

- health endpoint
- `POST /reviews/stream`
- request-body validation
- provider composition
- provider-neutral generation execution
- Server-Sent Event streaming
- application timeout
- client-disconnection propagation
- public error mapping
- usage and cost logs
- latency logs

### Provider selection

The API supports:

```env
AI_PROVIDER=openai
```

and:

```env
AI_PROVIDER=fake
```

The Fake provider allows the complete API and web flow to run without network
access or OpenAI credentials.

## AI foundation currently available

### Generation contracts

The AI package contains provider-neutral contracts for:

- generation requests
- generation responses
- conversation messages
- generation parameters
- token usage
- finish reasons
- streaming generation
- structured generation
- tool calling

### OpenAI integration

The OpenAI implementation currently supports:

- Responses API request mapping
- response mapping
- streaming text deltas
- completed responses
- incomplete responses
- token usage
- structured outputs
- strict JSON Schema
- Zod runtime validation
- local tool calling
- cancellation signal forwarding
- normalized provider errors
- application-controlled retry

### Structured generation

The AI package contains:

- provider-neutral structured generation contracts
- a `ChangeReview` Zod schema
- OpenAI strict Structured Outputs integration
- runtime validation before data enters the domain
- fail-fast handling for invalid structured responses

Structured generation is currently exercised through the AI package runners and
tests. The web review feature does not use it yet.

### Tool calling

The AI package contains:

- tool definitions
- Zod input schemas
- tool argument validation
- application-side tool execution
- tool result messages
- continuation of generation after tool execution
- loop stopping conditions

A local change-evidence tool exists for learning and verification.

Tool calling is not used by the current web review feature.

### Streaming

The streaming implementation supports:

- provider stream consumption
- incremental text deltas
- one terminal generation response
- completed and incomplete finish reasons
- SSE delivery from API to frontend
- concatenation consistency between deltas and final output
- cancellation across browser, API and provider

## Runtime and reliability

### Errors

Provider and application failures are normalized using `GenerationError`.

Current error categories include:

- invalid request
- authentication
- permission denied
- rate limit
- quota exceeded
- provider unavailable
- timeout
- cancelled
- unknown

Internal provider errors are translated into safe public messages before being
sent to the frontend.

### Timeout and cancellation

The current implementation supports:

- browser cancellation using `AbortController`
- API disconnection detection
- application-level generation timeout
- provider cancellation signal propagation
- cancellation while waiting for retry

### Retry

The OpenAI streaming adapter supports:

- retryable versus non-retryable errors
- exponential backoff
- jitter
- `Retry-After`
- maximum attempts
- total delay budget
- cancellation-aware waiting

Retry does not occur after text has been emitted.

The OpenAI SDK's internal retry is disabled so that retry ownership remains in
the ChangePilot adapter.

## Code Intelligence baseline

The `packages/code-intelligence` package is intended to concentrate future
primitives for understanding software repositories.

It currently contains a literal-search lab and a provider-independent vector
representation. The literal baseline performs case-insensitive substring
matching and is deliberately limited: it can find identifiers that occur in
candidate text, but it returns no result when a query is only semantically
related to the code.

`EmbeddingVector` preserves component order, calculates dimensionality from the
number of components, rejects empty vectors and accepts only finite numeric
components. It also copies its input to prevent later mutations to the original
array from changing the vector.

The package now provides pure dot product, Euclidean distance and cosine
similarity operations. Every operation requires equal dimensionality. Cosine
similarity additionally rejects either input when its magnitude is zero.

An exact in-memory search calculates cosine similarity for every candidate and
ranks all results in descending order while preserving the original order for
tied scores.

Repository file discovery is now the first implemented stage of repository
ingestion. It recursively produces path-selected candidates as globally sorted,
portable paths relative to the repository root while ignoring symbolic links.
The `.git` and `node_modules` structural exclusions are applied at every level
and cannot be reverted by project rules. Only the `.gitignore` found directly
at the discovery root is applied, using case-sensitive matching; nested
`.gitignore` files remain ordinary candidates.

`RepositoryDocument` is the minimal contract that associates a repository path
with its exact textual content. Discovery and document creation are now
connected by a sequential loading stage. Only valid UTF-8 content without NUL
bytes is converted into documents, and files larger than 1 MiB are omitted.
This stage returns no reason for an omission.

Documents with explicit generation evidence are now omitted after textual
loading. Recognized signals are `.generated.` or a `.generated` suffix in the
basename, `@generated` in the first 20 lines, and strong same-line combinations
of a generation phrase with `do not edit`. Matching is case-insensitive.

The policy prioritizes precision: directories named `generated` and lockfiles
are not excluded automatically. This package remains disconnected from the web,
API and AI generation runtime.

`RepositoryChunk` is now the minimal path, index and content representation for
document fragments. The first chunking primitive divides a
`RepositoryDocument` by Unicode code points, preserves exact content and
supports overlap between adjacent chunks.

Repository chunks are not integrated with embeddings. Recursive, semantic and
AST-aware chunking are not implemented; fixed-size chunking is currently the
only concrete strategy.

Vectors are still constructed only directly in code or in test fixtures. No
model has generated an embedding and no semantic meaning has been produced;
the current scores and ranking demonstrate only the mathematical mechanics.

This is an educational experiment for making the textual-versus-semantic gap
observable. It is not consumed by the web application, API or AI generation
runtime.

## Usage, cost and observability

### Usage

Terminal generation responses contain:

- input tokens
- output tokens
- total tokens

### Estimated cost

ChangePilot calculates:

- input cost
- output cost
- total estimated cost

Pricing is stored locally per model and expressed in USD per million tokens.

The calculated cost is an estimate and does not replace provider billing data.

### Server latency

The API measures:

- application preparation time
- provider time to first token
- provider time to last token
- provider duration
- total server duration

### Client latency

The web application measures:

- time to first token
- time to last token
- total duration perceived by the browser

### Current telemetry destination

Usage, cost, latency, error and cancellation records are currently emitted as
structured console logs.

They are not persisted or aggregated.

## Provider abstraction

The API depends on:

```ts
StreamingGenerationAdapter;
```

rather than a concrete OpenAI adapter.

Provider-specific SDK types remain inside provider boundaries.

The Fake and OpenAI streaming adapters execute the same shared contract tests.

The abstraction deliberately models separate capabilities for:

- normal generation
- streaming
- structured output
- tool calling

ChangePilot does not use one universal interface for every AI capability.

## Testing strategy

### Deterministic tests

The project currently has offline tests for:

- generation primitives
- messages and roles
- context calculations
- prompt construction
- request and response mapping
- structured outputs
- tool calling
- streaming
- errors
- timeout
- cancellation
- retry and rate limiting
- usage and cost
- latency
- SSE parsing
- frontend reducers
- API routes
- provider composition
- the literal-search baseline and its semantic gap

### Provider simulation

OpenAI adapter tests use an injected fake SDK transport.

They do not call the real provider.

### Fake provider

A deterministic Fake provider supports:

- local development
- API tests
- contract tests
- full product verification without credentials

### Fixtures and contract tests

Reusable generation fixtures and stream collectors exist.

A common contract verifies Fake and OpenAI streaming behavior.

### Integration verification

A real OpenAI streaming integration check exists as an opt-in command:

```bash
pnpm --filter @changepilot/ai test:integration:openai
```

It is not part of the default test suite or CI.

### Tests versus evals

Tests verify deterministic software behavior.

AI quality evals are not implemented yet.

Future evals will measure:

- review correctness
- relevance
- completeness
- severity quality
- hallucination
- task success

## Architecture documentation

Current decision records include:

- separate web and API applications
- provider-neutral generation contracts
- SSE for review streaming

The current architecture and dependency rules are documented in
`docs/ARCHITECTURE.md`.

## LLM Engineering foundations completed

The first milestone established practical understanding of:

- the application-to-provider generation lifecycle
- tokens and context windows
- messages and roles
- prompt engineering
- context engineering
- generation parameters
- provider integration
- generation contracts
- structured outputs
- tool calling
- streaming
- token usage and costs
- latency
- errors
- timeout
- cancellation
- retry and rate limiting
- provider abstraction
- deterministic AI-layer testing
- the boundary between tests and evals

The main architectural conclusion is that provider integration is an external
boundary, not the ChangePilot business domain.

The product consumes provider-neutral contracts while provider adapters own SDK
mapping and external failure translation.

## Known limitations

### Repository knowledge

ChangePilot does not currently:

- read a repository
- inspect a Git diff
- inspect a pull request
- index files
- parse source-code structure
- identify symbols
- retrieve related code
- cite repository evidence

The current review depends entirely on a manually supplied description.

### Search and retrieval

The project does not currently provide:

- generated embeddings
- semantic similarity
- runtime repository search
- vector storage
- metadata filtering
- ranking
- RAG
- grounded repository answers

### Product infrastructure

The project does not currently provide:

- authentication
- user accounts
- persistent application data
- review history
- background jobs
- queues
- workers
- production deployment configuration

### Observability

The project does not currently provide:

- persistent metrics
- dashboards
- alerts
- distributed traces
- billing reconciliation
- aggregated cost reporting

### AI quality

The project does not currently provide:

- eval datasets
- review-quality scoring
- hallucination measurement
- regression baselines
- LLM-as-a-judge
- human evaluation workflows

### Advanced capabilities

The project does not currently provide:

- GitHub integration
- MCP
- autonomous agents
- LangGraph
- fine-tuning
- AI DevOps automation

These limitations are expected at the current stage and are tracked in the
roadmap.

## Current objective

Continue the Code Intelligence foundation required for ChangePilot to
understand software repositories.

The immediate goals are:

- learn embeddings
- represent text and code as vectors
- ingest repository documents
- prepare semantic code search

## Current milestone direction

02 — Embeddings and Code Intelligence is in progress.

The package now demonstrates literal matching, vector representation, three
similarity metrics, exact in-memory ranking and the first repository-discovery
primitive with path-based selection, limited textual document loading and
fixed-size chunking. Model-produced embeddings, advanced chunking strategies
and semantic repository search remain future work and current limitations.
