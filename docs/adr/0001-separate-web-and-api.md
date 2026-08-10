# ADR 0001: Separate Web and API Applications

## Status

Accepted

## Context

ChangePilot will eventually perform backend-heavy AI workloads,
including repository analysis, retrieval, agent orchestration,
GitHub integrations and asynchronous processing.

Next.js Route Handlers could initially host these operations,
but this would couple the AI/backend architecture to the web
application.

## Decision

Use separate applications:

- `apps/web`: Next.js
- `apps/api`: Hono running on Node.js

## Consequences

Positive:

- clearer backend/frontend boundaries
- API can evolve independently
- easier future integration with workers and MCP
- frontend remains focused on presentation

Negative:

- one additional application to run and deploy
- HTTP boundary between frontend and backend
