/**
 * ACP (Agent Client Protocol) provider registry — TypeScript mirror of the
 * Python source of truth at
 * `openhands.sdk.settings.acp_providers.ACP_PROVIDERS` in
 * https://github.com/OpenHands/software-agent-sdk.
 *
 * The runtime data is defined inline so the published ESM build does not
 * import JSON (Node requires JSON import attributes). The JSON mirror at
 * `./acp-providers.json` exists for Python drift checks and must stay in
 * sync with this inline registry.
 *
 * To add or modify a provider, edit `acp_providers.py` in software-agent-sdk
 * first, then mirror the change in both this file and `acp-providers.json`.
 * CI will fail until all three match.
 */

/**
 * Stable registry key for a built-in ACP provider.
 *
 * Does **not** include `'custom'` — `custom` is a UI-side discriminator
 * meaning "user typed their own command" and intentionally has no registry
 * entry.
 */
export type ACPProviderKey = 'claude-code' | 'codex' | 'gemini-cli';

/**
 * One selectable model for a built-in ACP provider's model picker. Mirrors
 * `openhands.sdk.settings.acp_providers.ACPModelOption` field-for-field.
 */
export interface ACPModelOption {
  /** Exact model identifier sent to the ACP server as `acp_model`. */
  readonly id: string;
  /** Human-readable label shown in the model picker (e.g. `"Claude Opus 4.7"`). */
  readonly label: string;
}

/**
 * Declarative spec for one file-content credential a provider can consume
 * (e.g. Codex `auth.json`). Mirrors
 * `openhands.sdk.settings.acp_providers.ACPFileSecretSpec` field-for-field.
 */
export interface ACPFileSecretSpec {
  /** Reserved secret name whose value is the file's content. */
  readonly secret_name: string;
  /** Filename the secret is materialised as. */
  readonly filename: string;
  /** Env var pointed at the materialised file (or its directory). */
  readonly env_var: string;
  /** Per-provider subdirectory the file lives in. */
  readonly subdir: string;
  /** Whether `env_var` points at the file itself or its directory. */
  readonly env_points_to: 'file' | 'dir';
  /** Companion env vars the server warns about when missing. */
  readonly warn_if_unset: readonly string[];
}

/**
 * Immutable metadata record for one built-in ACP provider. Mirrors
 * `openhands.sdk.settings.acp_providers.ACPProviderInfo` field-for-field.
 */
export interface ACPProviderInfo {
  readonly key: ACPProviderKey;
  readonly display_name: string;
  readonly default_command: readonly string[];
  /** `null` for providers that authenticate via browser login. */
  readonly api_key_env_var: string | null;
  /** `null` if the provider does not support env-based base-URL override. */
  readonly base_url_env_var: string | null;
  /** ACP session-mode ID that suppresses all permission prompts. */
  readonly default_session_mode: string;
  /** Lowercase substring fragments matched against the runtime agent name. */
  readonly agent_name_patterns: readonly string[];
  /**
   * `true` if this provider selects its *initial* model via the
   * `set_session_model` protocol call (rather than session `_meta`).
   */
  readonly supports_set_session_model: boolean;
  /**
   * `true` if this provider supports `set_session_model` for *runtime*,
   * mid-conversation switching (the capability `switchAcpModel` relies on).
   */
  readonly supports_runtime_model_switch: boolean;
  /** Top-level `_meta` key for model selection, or `null`. */
  readonly session_meta_key: string | null;
  /**
   * Curated `acp_model` candidates surfaced in this provider's model picker.
   * Suggestions, not authoritative access checks — a custom `acp_model` is
   * always allowed, and availability depends on the account's plan tier.
   */
  readonly available_models: readonly ACPModelOption[];
  /**
   * Model ID preselected when none is configured (one of {@link available_models}),
   * or `null` to let the ACP server pick its own default.
   */
  readonly default_model: string | null;
  /** File-content credentials the agent server can materialise on disk. */
  readonly file_secrets: readonly ACPFileSecretSpec[];
  /**
   * Bare executable name of the provider's pinned CLI, or `null`. The agent
   * server prefers this binary over the `npx` fallback when it is on PATH.
   */
  readonly binary_name: string | null;
  /** Env var that relocates the provider's data/config directory, or `null`. */
  readonly data_dir_env_var: string | null;
}

const ACP_PROVIDER_DATA = {
  'claude-code': {
    key: 'claude-code',
    display_name: 'Claude Code',
    default_command: ['npx', '-y', '@agentclientprotocol/claude-agent-acp@0.44.0'],
    api_key_env_var: 'ANTHROPIC_API_KEY',
    base_url_env_var: 'ANTHROPIC_BASE_URL',
    default_session_mode: 'bypassPermissions',
    agent_name_patterns: ['claude-agent'],
    supports_set_session_model: true,
    session_meta_key: 'claudeCode',
    available_models: [
      {
        id: 'default',
        label: 'Default (recommended)',
      },
      {
        id: 'opus[1m]',
        label: 'Claude Opus 4.8 (1M)',
      },
      {
        id: 'sonnet',
        label: 'Claude Sonnet 4.6',
      },
      {
        id: 'haiku',
        label: 'Claude Haiku 4.5',
      },
    ],
    default_model: 'opus[1m]',
    supports_runtime_model_switch: true,
    file_secrets: [],
    binary_name: 'claude-agent-acp',
    data_dir_env_var: 'CLAUDE_CONFIG_DIR',
  },
  codex: {
    key: 'codex',
    display_name: 'Codex',
    default_command: ['npx', '-y', '@zed-industries/codex-acp@0.16.0'],
    api_key_env_var: 'OPENAI_API_KEY',
    base_url_env_var: 'OPENAI_BASE_URL',
    default_session_mode: 'full-access',
    agent_name_patterns: ['codex-acp'],
    supports_set_session_model: true,
    session_meta_key: null,
    available_models: [
      {
        id: 'gpt-5.5',
        label: 'GPT-5.5',
      },
      {
        id: 'gpt-5.4',
        label: 'GPT-5.4',
      },
      {
        id: 'gpt-5.4-mini',
        label: 'GPT-5.4 Mini',
      },
    ],
    default_model: 'gpt-5.5',
    supports_runtime_model_switch: true,
    file_secrets: [
      {
        secret_name: 'CODEX_AUTH_JSON',
        filename: 'auth.json',
        env_var: 'CODEX_HOME',
        subdir: 'codex',
        env_points_to: 'dir',
        warn_if_unset: [],
      },
    ],
    binary_name: 'codex-acp',
    data_dir_env_var: 'CODEX_HOME',
  },
  'gemini-cli': {
    key: 'gemini-cli',
    display_name: 'Gemini CLI',
    default_command: ['npx', '-y', '@google/gemini-cli@0.46.0', '--acp'],
    api_key_env_var: 'GEMINI_API_KEY',
    base_url_env_var: 'GEMINI_BASE_URL',
    default_session_mode: 'default',
    agent_name_patterns: ['gemini-cli'],
    supports_set_session_model: true,
    session_meta_key: null,
    available_models: [
      {
        id: 'auto',
        label: 'Auto',
      },
      {
        id: 'gemini-3.1-pro-preview',
        label: 'Gemini 3.1 Pro (preview)',
      },
      {
        id: 'gemini-3-pro-preview',
        label: 'Gemini 3 Pro (preview)',
      },
      {
        id: 'gemini-3-flash-preview',
        label: 'Gemini 3 Flash (preview)',
      },
      {
        id: 'gemini-3.1-flash-lite',
        label: 'Gemini 3.1 Flash Lite',
      },
      {
        id: 'gemini-2.5-pro',
        label: 'Gemini 2.5 Pro',
      },
      {
        id: 'gemini-2.5-flash',
        label: 'Gemini 2.5 Flash',
      },
    ],
    default_model: 'auto',
    supports_runtime_model_switch: true,
    file_secrets: [
      {
        secret_name: 'GOOGLE_APPLICATION_CREDENTIALS_JSON',
        filename: 'gcloud-credentials.json',
        env_var: 'GOOGLE_APPLICATION_CREDENTIALS',
        subdir: 'gemini-cli',
        env_points_to: 'file',
        warn_if_unset: ['GOOGLE_CLOUD_PROJECT', 'GOOGLE_CLOUD_LOCATION'],
      },
    ],
    binary_name: 'gemini',
    data_dir_env_var: 'HOME',
  },
} as const satisfies Readonly<Record<ACPProviderKey, ACPProviderInfo>>;

export const ACP_PROVIDERS: Readonly<Record<ACPProviderKey, ACPProviderInfo>> = ACP_PROVIDER_DATA;

/**
 * Return the {@link ACPProviderInfo} for `key`, or `null` if unknown.
 * Mirrors the Python `get_acp_provider` semantics — returns `null` for the
 * UI-side `'custom'` discriminator and for any unknown / falsy value.
 */
export function getAcpProvider(key: string | null | undefined): ACPProviderInfo | null {
  if (!key) {
    return null;
  }
  return (ACP_PROVIDERS as Record<string, ACPProviderInfo | undefined>)[key] ?? null;
}

/**
 * Allow-list of fields that travel on an `ACPAgent` settings payload.
 * Mirrors `openhands.sdk.settings.model.ACPAgentSettings`'s field set.
 * Clients filter ACP-only fields out when switching to a non-ACP variant.
 */
export const ACP_SETTINGS_KEYS: readonly string[] = [
  'acp_command',
  'acp_args',
  'acp_env',
  'acp_model',
  'acp_session_mode',
  'acp_prompt_timeout',
  'acp_server',
];
