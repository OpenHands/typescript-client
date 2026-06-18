/**
 * deriveSwitchPlan — pure helper that decides whether a profile switch can
 * happen live (in-conversation), requires a new conversation, or is already
 * current.
 *
 * Lives in its own module so the canvas can import it without pulling in HTTP
 * client code, and so it can be unit-tested without any I/O.
 */

import type { ACPProviderInfo } from '../models/acp';
import type { ACPAgentProfile, OpenHandsAgentProfile } from '../models/agent-profile';

export type SwitchPlan =
  | { action: 'current' }
  | { action: 'switch-live'; mutableFields: string[] }
  | { action: 'start-new'; reason: string }
  | { action: 'disabled'; reason: string };

// Fields excluded from content comparison (identity / provenance fields).
const IDENTITY_FIELDS = new Set(['id', 'name', 'revision', 'schema_version', 'agent_kind']);

function changedNonMutableFields(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  mutable: Set<string>
): string[] {
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const changed: string[] = [];
  for (const key of allKeys) {
    if (IDENTITY_FIELDS.has(key) || mutable.has(key)) continue;
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
      changed.push(key);
    }
  }
  return changed;
}

/**
 * Compute a {@link SwitchPlan} for transitioning a running conversation from
 * the currently-launched profile content (`snapshot`) to `targetProfile`.
 *
 * @param snapshot      Full content of the profile that launched the current
 *                      conversation, or `null`/`undefined` when no profile was
 *                      used at conversation start.
 * @param targetProfile The profile the user wants to apply.
 * @param providerInfo  ACP provider info for the *current* agent (from
 *                      {@link getAcpProvider}), or `null` for OpenHands or
 *                      custom ACP servers. Used to check
 *                      `supports_runtime_model_switch`.
 *
 * Decision rules (mirrors epic #3713):
 * - **current**: `snapshot` content is identical to `targetProfile` content.
 * - **switch-live**: can transition without restarting the conversation:
 *   - OpenHands → OpenHands: only `llm_profile_ref` differs.
 *   - ACP → ACP: same `acp_server`, only `acp_model` differs, and the
 *     provider declares `supports_runtime_model_switch`.
 * - **start-new**: possible but requires a fresh conversation.
 * - **disabled**: no path forward (e.g. unknown agent kind).
 */
export function deriveSwitchPlan(
  snapshot: OpenHandsAgentProfile | ACPAgentProfile | null | undefined,
  targetProfile: OpenHandsAgentProfile | ACPAgentProfile,
  providerInfo: ACPProviderInfo | null
): SwitchPlan {
  if (!snapshot) {
    return { action: 'start-new', reason: 'no launched profile' };
  }

  // Fast-path: exact same profile version already running.
  if (snapshot.id === targetProfile.id && snapshot.revision === targetProfile.revision) {
    return { action: 'current' };
  }

  // Kind change: never a live switch.
  if (snapshot.agent_kind !== targetProfile.agent_kind) {
    return { action: 'start-new', reason: 'agent kind changed' };
  }

  const snapshotRaw = snapshot as unknown as Record<string, unknown>;
  const targetRaw = targetProfile as unknown as Record<string, unknown>;

  if (snapshot.agent_kind === 'openhands') {
    // OpenHands → OpenHands: live only if just llm_profile_ref differs.
    const nonMutable = changedNonMutableFields(snapshotRaw, targetRaw, new Set(['llm_profile_ref']));
    if (nonMutable.length === 0) {
      const llmDiffers =
        snapshot.llm_profile_ref !== (targetProfile as OpenHandsAgentProfile).llm_profile_ref;
      if (!llmDiffers) {
        return { action: 'current' };
      }
      return { action: 'switch-live', mutableFields: ['llm_profile_ref'] };
    }
    return { action: 'start-new', reason: `fields changed: ${nonMutable.join(', ')}` };
  }

  if (snapshot.agent_kind === 'acp') {
    const snapshotAcp = snapshot as ACPAgentProfile;
    const targetAcp = targetProfile as ACPAgentProfile;

    // Different ACP provider → must restart.
    if (snapshotAcp.acp_server !== targetAcp.acp_server) {
      return { action: 'start-new', reason: 'ACP provider changed' };
    }

    // ACP → ACP (same provider): live only if just acp_model differs and
    // the provider supports runtime model switching.
    const nonMutable = changedNonMutableFields(snapshotRaw, targetRaw, new Set(['acp_model']));
    if (nonMutable.length > 0) {
      return { action: 'start-new', reason: `fields changed: ${nonMutable.join(', ')}` };
    }
    if (!providerInfo?.supports_runtime_model_switch) {
      return {
        action: 'start-new',
        reason: 'provider does not support runtime model switch',
      };
    }
    const modelDiffers = snapshotAcp.acp_model !== targetAcp.acp_model;
    if (!modelDiffers) {
      return { action: 'current' };
    }
    return { action: 'switch-live', mutableFields: ['acp_model'] };
  }

  // Unreachable with a valid AgentProfile union, but guards against future variants.
  const exhaustiveCheck: never = snapshot;
  return { action: 'disabled', reason: `unknown agent_kind: ${(exhaustiveCheck as { agent_kind: string }).agent_kind}` };
}
