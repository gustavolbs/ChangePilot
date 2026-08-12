# Project State

Last updated: 2026-08-12

## Current milestone

Foundation / Bootstrap

## What exists

- pnpm monorepo
- Next.js web application
- Hono API
- Web → API communication
- shared TypeScript configuration
- first real LLM integration
- official OpenAI SDK
- manual generation with the Responses API
- basic request, response, and usage inspection
- provider-neutral generation contract
- GenerationRequest and GenerationResponse
- basic finish reasons and token usage
- first OpenAI generation adapter
- offline mapping tests
- provider-neutral structured generation contract
- Zod schema for ChangeReview
- OpenAI Structured Outputs with strict JSON Schema
- runtime validation before structured data enters the domain
- incomplete, invalid, and refused responses cannot produce structured objects
- parsing failures use fail-fast behavior

## What does not exist yet

- validated multi-provider abstraction and second provider (planned for Lesson 01.17)
- regeneration retry (planned for Lesson 01.16)
- RAG
- embeddings
- MCP
- agents
- persistence
- workers
- GitHub integration

## Current objective

Build the foundational LLM primitives without relying on
high-level AI orchestration frameworks.

## Next milestone

LLM Engineering Fundamentals.
