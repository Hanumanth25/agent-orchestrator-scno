# Autonomous Agent Orchestrator (SCNO)

A zero-dependency TypeScript autonomous agent runtime built on top of the Gemini API, designed for Supply Chain Network Operations (SCNO) incident triage and automated rerouting.

## Key Architecture & Features

- **Decoupled Orchestration**: Built without heavy framework abstractions (LangChain/LlamaIndex) to maintain full control over the context window, prompt construction, and execution state machine.
- **Concurrent Tool Execution**: Executes multi-tool calls in parallel (`Promise.all`) in a single turn, reducing latency across independent data retrieval steps.
- **Resilient Fault Handling**:
  - Differentiates between transient failures (handled via automatic exponential backoff retries) and non-transient schema/validation errors.
  - Returns structured semantic error contracts (`{ status: "error", message: ... }`) to the model, enabling autonomous self-correction without crashing the runtime.
- **Deterministic Circuit Breaker**: Enforces a strict turn limit (`MAX_TURNS = 6`) to prevent infinite recursion and runaway inference costs.

## Tech Stack
- **Runtime**: Node.js (v20+), TypeScript
- **Model**: `gemini-2.5-flash` via `@google/genai`
- **Execution Tool**: `tsx`

## Quickstart

1. Clone the repository and install dependencies:
   ```bash
   npm install