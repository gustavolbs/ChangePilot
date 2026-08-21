# ChangePilot AI

ChangePilot AI is an AI Engineering platform designed to understand software
repositories and assist developers with change analysis, architecture,
implementation planning, testing and CI.

The current version provides a complete vertical slice for streaming AI-powered
change reviews through a provider-neutral AI layer.

## Current capability

A user can describe a software change in the Next.js interface and receive an
incremental AI review.

The current flow supports:

- streaming text generation
- OpenAI and local Fake providers
- cancellation from the browser
- application-level timeout
- normalized generation errors
- retry with exponential backoff and jitter
- token usage and estimated cost tracking
- client and server latency measurement
- incomplete response handling
- deterministic offline testing

The current product reviews manually supplied change descriptions. It does not
read repositories or GitHub pull requests yet.

## Architecture

```mermaid
flowchart LR
    Web["Next.js Web"]
    API["Hono API"]
    AI["AI package"]
    Provider["OpenAI or Fake"]

    Web -->|"HTTP + SSE"| API
    API --> AI
    AI --> Provider
```

The main architectural components are:

- `apps/web`: user interface and streaming client
- `apps/api`: HTTP boundary, provider composition and SSE transport
- `packages/ai`: generation contracts, providers, reliability, usage and testing
- `docs`: architecture, project state, roadmap and decision records

The frontend and API do not consume OpenAI response types directly. Provider
representations are mapped to ChangePilot generation contracts inside the AI
package.

See [Architecture](docs/ARCHITECTURE.md) for the complete description.

## Tech stack

- TypeScript
- Node.js 22
- Next.js
- React
- Hono
- OpenAI Responses API
- Zod
- Vitest
- pnpm
- Turborepo

## Requirements

- Node.js 22 or newer
- pnpm 9
- OpenAI credentials only when using the OpenAI provider

## Environment setup

Create the API environment file:

```bash
cp .env.example .env
```

Create the web environment file:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Install dependencies:

```bash
pnpm install
```

### API environment variables

The root `.env` supports:

```env
# openai | fake
AI_PROVIDER=fake

OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-luna

AI_GENERATION_TIMEOUT_MS=30000
API_PORT=3001
WEB_ORIGIN=http://localhost:3000
```

`AI_PROVIDER` selects the implementation used by the API.

When using:

```env
AI_PROVIDER=fake
```

no OpenAI credentials are required.

When using:

```env
AI_PROVIDER=openai
```

both `OPENAI_API_KEY` and `OPENAI_MODEL` are required.

`AI_GENERATION_TIMEOUT_MS` defines the maximum application-level duration of a
generation in milliseconds.

### Web environment variables

The `apps/web/.env.local` file should contain:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Running locally

Start all applications:

```bash
pnpm dev
```

By default:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- API health: `http://localhost:3001/health`

## Manual review request

With the API running, a review can be started using:

```bash
curl -N \
  -X POST http://localhost:3001/reviews/stream \
  -H "Content-Type: application/json" \
  -d '{"changeDescription":"Increase session expiration from 24 hours to 30 days."}'
```

The response is a sequence of Server-Sent Events.

A successful stream contains:

- one or more `text-delta` events
- exactly one final `finished` event

Errors emitted after streaming begins use an `error` event.

## Verification

Run TypeScript checks:

```bash
pnpm check-types
```

Run deterministic tests:

```bash
pnpm test
```

Build all applications and packages:

```bash
pnpm build
```

The default test suite does not make real provider requests.

### OpenAI integration verification

The real OpenAI streaming integration is opt-in:

```bash
pnpm --filter @changepilot/ai test:integration:openai
```

This command:

- loads credentials from the root `.env`
- makes a real provider request
- consumes provider tokens
- verifies structural streaming invariants
- does not assert the model's exact output text

## Project structure

```text
.
├── apps/
│   ├── api/                  # Hono API and provider composition
│   └── web/                  # Next.js user interface
├── packages/
│   ├── ai/                   # AI Engineering primitives and adapters
│   ├── eslint-config/
│   └── typescript-config/
└── docs/
    ├── adr/                  # Architecture Decision Records
    ├── ARCHITECTURE.md
    ├── PROJECT_STATE.md
    └── ROADMAP.md
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Project state](docs/PROJECT_STATE.md)
- [AI Engineering roadmap](docs/ROADMAP.md)
- [Architecture decisions](docs/adr)

## Current limitations

ChangePilot does not currently provide:

- repository ingestion
- GitHub integration
- embeddings
- semantic code search
- vector storage
- RAG
- persistent application data
- authentication
- background workers
- persistent metrics or dashboards
- AI quality evals
- MCP integrations
- autonomous agents

Structured output and tool calling exist inside the AI package, but the current
web review flow uses streaming text generation.

## Roadmap

The LLM Engineering Foundations milestone is complete.

The next milestone is:

```text
02 — Embeddings and Code Intelligence
```

See the complete [Roadmap](docs/ROADMAP.md).
