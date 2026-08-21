# ADR 0003: SSE for Review Streaming

## Status

Accepted

## Context

Change reviews produce incremental text from server to client.

The client sends a request body containing the change description and
then receives a one-directional sequence of generation events.

## Decision

Expose review streaming through:

- `POST /reviews/stream`
- `text/event-stream`
- Hono `streamSSE`
- browser `fetch` with `ReadableStream`
- `AbortController` for cancellation

Domain generation events are serialized by the API. OpenAI stream
events are never exposed directly to the frontend.

Native `EventSource` is not used because the review starts with a POST
request containing a JSON body.

## Consequences

Positive:

- simple one-directional streaming over HTTP
- progressive rendering
- cancellation through the request signal
- no WebSocket infrastructure

Negative:

- the frontend maintains an SSE frame parser
- automatic `EventSource` reconnection is not available
- a future bidirectional agent protocol may require another transport
