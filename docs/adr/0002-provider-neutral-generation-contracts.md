# ADR 0002: Provider-Neutral Generation Contracts

## Status

Accepted

## Context

ChangePilot needs to use LLM capabilities without coupling the
application, API routes and frontend to one provider SDK.

Provider SDK types describe the external API, but they are not the
business contract of ChangePilot. Tests and local development also need
to run without network access or provider credentials.

## Decision

Define provider-neutral generation contracts in `packages/ai`.

- Domain requests and responses do not expose OpenAI types.
- Provider adapters map between domain and provider representations.
- The API receives a `StreamingGenerationAdapter` through composition.
- Provider selection happens in the API composition root.
- A Fake provider implements the same streaming contract.
- Streaming, structured generation and tool calling remain separate
  capabilities instead of one universal adapter.

Provider-specific options remain inside their respective adapters.

## Consequences

Positive:

- provider SDK changes remain isolated
- API and frontend do not depend on OpenAI types
- offline and contract testing are possible
- local development can use the Fake provider

Negative:

- mapping code must be maintained
- provider-specific features may require new explicit capabilities
- adding a provider is not automatically free
