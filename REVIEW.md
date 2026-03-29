# Code Review: @openhands/typescript-client

**Reviewed at:** commit `60cefdb` (HEAD of `main`)
**Date:** 2026-03-29

---

## Taste Rating: 🟡 Acceptable — Works, but several structural problems need attention

The bones are solid: clean interfaces, sensible module boundaries, good test infrastructure for
the utilities that *are* tested. But the codebase has accumulated real debt — duplicated types,
a 957-line God class, dead code sold as "backwards compatibility," a debug log that leaks
request bodies in production, and a test-coverage pipeline that is completely broken. None of
these are theoretical concerns; they affect real users right now.

---

## [CRITICAL ISSUES]

### 1. Production debug log leaks request bodies — `src/client/http-client.ts`, Line 91

```typescript
console.log('HTTP Request Body:', bodyData);
```

This fires on **every single non-GET HTTP request**. It will dump API keys, user messages,
secret values, agent configurations — anything in the request body — straight to the console.
In a browser this is the DevTools console. In Node.js it's stdout, which may be captured by
logging infrastructure and shipped to observability systems. This is an information-disclosure
vulnerability in the most-used class in the library.

**Fix:** Delete the line. If debug logging is needed, gate it behind an opt-in `debug` flag or
use a proper logging abstraction that can be silenced in production.

---

### 2. Test coverage is completely broken

Running `npm run test:coverage` produces **0% coverage across all files** and 6 out of 8 test
suites fail to even load:

```
TypeError: minimatch is not a function
```

The root cause is the `minimatch` override in `package.json`:

```json
"overrides": { "minimatch": "^10.2.1" }
```

This forces `minimatch@10` which has an ESM-only / different export shape, breaking
`test-exclude` → `babel-plugin-istanbul` → Jest coverage instrumentation. The CI workflow
(`ci.yml`) does **not** run `test:coverage`, so this has been silently broken.

**Impact:** There is no way to measure or enforce test coverage. You're flying blind.

**Fix:** Either remove the override and let transitive deps resolve their own `minimatch`
versions, or pin to a version that's actually compatible with the test toolchain. Add
`npm run test:coverage` to CI.

---

### 3. `src/index.ts` — 336-line barrel file with 100% redundant default export

Lines 1–253 export everything as named exports. Then lines 258–336 **re-import every single
thing** and stuff it into a default export object. This is ~80 lines of pure duplication that
must be kept manually in sync.

No consumer should use `import OpenHands from '@openhands/typescript-client'` and then write
`OpenHands.RemoteConversation` — that's an anti-pattern in TypeScript. The default export adds
zero value and doubles the maintenance surface of the barrel file.

**Fix:** Delete lines 258–336 (the re-imports and `export default`). If backwards compatibility
is truly required, deprecate it and remove in the next minor version.

---

## [IMPROVEMENT OPPORTUNITIES]

### 4. Duplicate type definitions — multiple sources of truth

| Type | Location 1 | Location 2 | Identical? |
|------|-----------|-----------|------------|
| `SecretValue` | `src/types/base.ts:158` | `src/conversation/secret-registry.ts:13` | Yes |
| `TextContent` | `src/types/base.ts:64` (extends `MessageContent`) | `src/llm/base.ts:38` (standalone) | No — different shapes |
| `ImageContent` | `src/types/base.ts:69` (extends `MessageContent`) | `src/llm/base.ts:43` (standalone) | No — different shapes |
| `riskValue()` | `src/security/confirmation-policy.ts:83` | `src/security/security-analyzer.ts:250` | Yes — identical switch |

Two different `TextContent` types with different shapes is a time bomb. Eventually someone will
import the wrong one and wonder why types don't match at runtime.

**Fix:**
- `SecretValue`: Delete the duplicate in `secret-registry.ts`, import from `types/base`.
- `TextContent`/`ImageContent`: Pick one canonical definition. The `types/base.ts` versions
  extend `MessageContent`; the `llm/base.ts` versions don't. Reconcile them.
- `riskValue()`: Extract to a shared utility function in `src/security/` (e.g.,
  `riskLevelToNumeric(level: RiskLevel): number`).

---

### 5. `local-conversation.ts` is a 957-line God class

This single file handles: conversation lifecycle, LLM orchestration, tool execution, security
analysis, stuck detection, secret management, title generation, two different event emission
systems, confirmation handling, and state management.

It also has two event-emitting methods:
- `emitTypedEvent()` (line 916) — the correct one
- `emitEvent()` (line 930) — marked `@deprecated` but still used by ~15 call sites within the
  same class

There are two private boolean flags (`_isPaused`, `_isFinished`) *plus* an `executionStatus`
string on the state object, creating a parallel state representation that can get out of sync.

**Fix:** Break this into composable pieces:
- Extract `AgentRunner` (the `run()` + `handleToolCall()` + `executeBuiltinTool()` loop)
- Extract `EventEmitter` (consolidate the two emission paths)
- The state booleans should derive from `executionStatus`, not exist independently

---

### 6. 152 lines of dead code: `LocalWorkspace`

Every method in `LocalWorkspace` throws `LocalWorkspaceNotSupportedError`. It is 152 lines of
code whose sole purpose is to tell you it doesn't work. The class exists to "mirror the Python
SDK's LocalWorkspace architecture" — but mirroring a skeleton is not architecture, it's cargo
culting.

Similarly:
- `Workspace` (in `workspace.ts`) — extends `RemoteWorkspace`, adds nothing
- `LLM` (in `llm/llm.ts`) — extends `OpenRouterLLM`, adds nothing
- `Conversation` (in `conversation.ts`) — extends `RemoteConversation`, adds nothing

These are empty inheritance wrappers that increase the API surface without adding functionality.

**Fix:** If these are truly needed for backwards compatibility, document them as deprecated
aliases. Otherwise delete them. The factory functions (`createWorkspace`, `createConversation`,
`createLLM`) already serve the "pick the right implementation" use case.

---

### 7. `uuid` dependency is installed but unused — hand-rolled UUID instead

`package.json` lists `uuid: ^13.0.0` as a runtime dependency. Meanwhile:

- `src/conversation/remote-conversation.ts:8` has `// import { v4 as uuidv4 } from 'uuid';`
  (commented out)
- `src/conversation/local-conversation.ts:950-956` rolls its own UUID with `Math.random()`:

```typescript
private generateConversationId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
```

- `src/events/types.ts:424` generates event IDs with `Math.random().toString(36).substr(2, 9)`
  — note `substr` is deprecated in favor of `substring`.

A paid-for dependency sits unused while two different ad-hoc ID generators use
`Math.random()`, which is not cryptographically random and can produce collisions under load.

**Fix:** Either use the `uuid` package you're already shipping, or remove it from dependencies.
Replace `Math.random()` ID generation with `crypto.randomUUID()` (available in Node 19+ and
all modern browsers) or the `uuid` package.

---

### 8. Duplicated request-building in `openrouter-llm.ts`

`chatCompletion()` (lines 170-236) and `chatCompletionStream()` (lines 238-310) construct
nearly identical request parameter objects:

```typescript
const requestParams: Record<string, unknown> = { model, messages, stream: false/true };
if (options.temperature !== undefined) { ... } else if (this.defaultTemperature !== undefined) { ... }
if (options.maxTokens !== undefined) { ... } else if (this.defaultMaxTokens !== undefined) { ... }
if (options.tools && options.tools.length > 0) { ... }
if (options.toolChoice) { ... }
if (options.stop) { ... }
```

This is ~20 lines copy-pasted between two methods. When a new parameter is added (e.g.,
`topP`, `presencePenalty`), it must be added in both places.

**Fix:** Extract a `private buildRequestParams(options, stream: boolean)` method.

---

### 9. WebSocket client duplicates browser/Node.js event handling

`src/events/websocket-client.ts`, `connect()` method (lines 75-159):

```typescript
if (typeof window !== 'undefined') {
    // Browser WebSocket API — 30 lines
    this.ws.onopen = () => { ... };
    this.ws.onmessage = (event) => { ... };
    this.ws.onclose = (event) => { ... };
    this.ws.onerror = (error) => { ... };
} else {
    // Node.js ws library — 30 lines (nearly identical logic)
    this.ws.on('open', () => { ... });
    this.ws.on('message', (data) => { ... });
    this.ws.on('close', (code, reason) => { ... });
    this.ws.on('error', (error) => { ... });
}
```

The callback bodies are identical. Only the event-binding API differs.

**Fix:** Normalize the API surface. Both `ws` and browser `WebSocket` support
`addEventListener`. Or extract the handler logic into named methods and just wire them
differently in two lines each.

---

### 10. 54 ESLint `@typescript-eslint/no-explicit-any` warnings — zero errors, zero enforcement

The linter reports 54 `any` type warnings across the codebase. Since these are warnings (not
errors), CI passes clean. The worst offenders:

- `src/types/base.ts`: 10 `any` types — the *core type definitions* are riddled with `any`,
  defeating the purpose of TypeScript
- `src/client/http-client.ts`: 12 `any` types
- `src/models/conversation.ts`: 6 `any` types, including `workspace: any` and `[key: string]: any`

When the foundational types use `any`, the type safety propagates nowhere.

**Fix:** Incrementally replace `any` with proper types. Start with `src/types/base.ts` since
everything depends on it. Consider escalating the ESLint rule to `error` for new code.

---

### 11. No unit tests for `LocalConversation` (957 lines, 0% coverage)

The biggest, most complex file in the codebase has **zero** unit tests. The existing test suite
covers:
- ✅ `SecretRegistry` (331 lines of tests)
- ✅ `StuckDetector` (314 lines of tests)
- ✅ `SecurityAnalyzer` + `ConfirmationPolicy` (319 lines of tests)
- ✅ Event types / type guards (357 lines of tests)
- ✅ Hooks config (355 lines of tests)
- ❌ `LocalConversation` — nothing
- ❌ `RemoteConversation` — nothing (needs mocking, but still)
- ❌ `HttpClient` — unit tests missing (only integration tests exist)
- ❌ `WebSocketCallbackClient` — nothing
- ❌ `RemoteState` — nothing
- ❌ `RemoteEventsList` — nothing
- ❌ `ConversationManager` — nothing

The utility classes are well-tested. The actual product code that users interact with is not.

---

### 12. `RemoteState` re-fetches conversation info on every property access

Every getter in `RemoteState` (lines 99-193) calls `this.getConversationInfo()` which makes
an HTTP GET request. If you call `getExecutionStatus()` then `getAgent()` then `getWorkspace()`,
that's 3 separate HTTP requests for the same data.

The `AsyncLock` protects concurrent access but doesn't cache results:

```typescript
private async getConversationInfo(): Promise<ConversationInfo> {
    return this.lock.acquire(async () => {
        const response = await this.client.get<ConversationInfo>(...);
        return response.data;
    });
}
```

**Fix:** Add a short TTL cache (even 1-2 seconds) or fetch once and let callers pass the
result around. A `refresh()` method that fetches once and updates all cached properties would
be cleaner.

---

## [STYLE NOTES]

### 13. Overly verbose JSDoc on trivial methods

Many one-line methods have multi-line JSDoc comments that just restate the method name:

```typescript
/**
 * Remove a secret from the registry.
 *
 * @param key - The secret key to remove
 */
removeSecret(key: string): void {
    this.secretSources.delete(key);
    this.exportedValues.delete(key);
}
```

This adds noise without value. Reserve JSDoc for non-obvious behavior.

### 14. `AsyncLock` comment says "reused from remote-events-list.ts" but it's only in `remote-state.ts`

Line 197 of `remote-state.ts`:
```typescript
// Simple async lock implementation (reused from remote-events-list.ts)
```

No `AsyncLock` exists in `remote-events-list.ts`. Stale comment.

### 15. Inconsistent `console.*` usage

The codebase mixes `console.log`, `console.debug`, and `console.error` with no structured
logging. A library should not write to the console by default — it pollutes consumer output.
Let the consumer decide what to log via callbacks or a configurable logger.

---

## VERDICT

❌ **Needs rework on critical items 1-2 before next release.** The debug log leak (#1) and broken
coverage pipeline (#2) are shipping bugs that affect every consumer.

Items 3-12 are engineering debt that should be tracked and addressed incrementally. None are
release blockers individually, but collectively they make the codebase harder to maintain and
extend than it needs to be.

## KEY INSIGHT

The codebase has good *breadth* (rich type system, multiple conversation modes, hooks, security
analyzers, stuck detection) but lacks *depth* in its foundations: the core types leak `any`
everywhere, the barrel file is its own maintenance burden, the biggest class is untested, and
a debug log is silently shipping secrets to the console. Fix the foundations and the rest
becomes much easier to maintain.

---

*This review was generated by an AI assistant (OpenHands) performing a full repository audit.*
