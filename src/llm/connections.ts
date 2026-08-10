/**
 * Provider Connection client (scaffold, draft).
 *
 * Generated/typed client methods for the new /api/llm/connections endpoints
 * added in software-agent-sdk. This package MUST be released to npm before
 * the OpenHands frontend can consume the new endpoints (release gate).
 *
 * Tracking: OpenHands/OpenHands#15492, Linear OSS-5295.
 * Scope: typescript-client PR2 of the provider-connections plan.
 *
 * TODO (implementation):
 *  - Add Connection / ConnectionCreate / ConnectionValidate types.
 *  - listConnections / createConnection / getConnection / patchConnection /
 *    deleteConnection / validateConnection methods.
 *  - Regenerate src/generated/* from the updated agent-server OpenAPI.
 *  - Bump version + release to npm.
 */

export interface ProviderConnection {
  id: string;
  provider: string;
  label?: string;
  maskedKey: string;
  modelCount: number;
  lastRefreshedAt?: string;
}

export interface CreateConnectionRequest {
  provider: string;
  key: string;
  label?: string;
}

export const connectionService = {
  // TODO: implement against /api/llm/connections
} as const;
