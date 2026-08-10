# Architecture

## Current architecture

┌──────────────┐
│   Next.js    │
│     Web      │
└───────┬──────┘
        │ HTTP
        ↓
┌──────────────┐
│     Hono     │
│     API      │
└──────────────┘

## Web

Responsible for the user interface and user interaction.

It must not directly contain LLM provider integrations.

## API

Entry point for backend capabilities.

AI capabilities will be consumed by the API but implemented
in independent packages.

## AI package

`packages/ai` will contain low-level abstractions for interacting
with LLM providers.

Its architecture will be developed during the LLM Engineering
Fundamentals milestone.