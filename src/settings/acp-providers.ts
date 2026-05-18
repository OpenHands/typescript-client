/**
 * ACP provider registry — TypeScript mirror of the Python SDK's
 * ``openhands.sdk.settings.acp_providers`` module. The Python module is the
 * source of truth; this file is hand-kept in sync.
 *
 * Each record captures the static properties known at configuration time
 * (before any subprocess is launched):
 *
 * - ``key``                   settings discriminator (``ACPAgentConfig.acp_server``)
 * - ``displayName``           human-readable label for UI display
 * - ``defaultCommand``        default ``npx``-based launch command
 * - ``apiKeyEnvVar``          env var the subprocess expects for its API key
 * - ``baseUrlEnvVar``         env var for proxy/base-URL routing (or ``null``)
 * - ``defaultSessionMode``    ACP mode ID that disables permission prompts
 * - ``agentNamePatterns``     lowercase substrings in the runtime agent name;
 *                             used to auto-detect mode / protocol
 * - ``supportsSetSessionModel``  whether to use the ``set_session_model``
 *                                protocol call (vs ``_meta``) for model selection
 * - ``sessionMetaKey``        top-level ``_meta`` key for model selection, or null
 */

/** Settings discriminator value for the four built-in ``acp_server`` choices. */
export type ACPServerKind = 'claude-code' | 'codex' | 'gemini-cli' | 'custom';

/** Immutable metadata record for one built-in ACP provider. */
export interface ACPProviderInfo {
  /** Settings discriminator value (``ACPAgentConfig.acp_server``). */
  readonly key: string;
  /** Human-readable name suitable for UI labels. */
  readonly displayName: string;
  /** Default subprocess command used when no explicit ``acp_command`` is set. */
  readonly defaultCommand: readonly string[];
  /**
   * Env var the ACP subprocess expects for its primary API credential.
   *
   * ``null`` for providers that authenticate via browser login rather than
   * an API key (e.g. Claude Code's ``claude-login`` flow).
   */
  readonly apiKeyEnvVar: string | null;
  /**
   * Env var the ACP subprocess reads for a custom API base URL.
   *
   * Allows routing provider calls through a proxy such as LiteLLM.
   * ``null`` if the provider does not support env-based base-URL override.
   */
  readonly baseUrlEnvVar: string | null;
  /**
   * ACP session-mode ID that suppresses all permission prompts.
   *
   * Different servers use different IDs for the same concept:
   *
   * - ``bypassPermissions`` — claude-agent-acp
   * - ``full-access``       — codex-acp
   * - ``yolo``              — gemini-cli
   */
  readonly defaultSessionMode: string;
  /**
   * Lowercase substring fragments present in the runtime ``agent_name``.
   *
   * ``ACPAgent`` checks these against the name returned by the ACP server's
   * ``InitializeResponse`` to auto-select the correct session mode and
   * determine which model-selection protocol to use.
   */
  readonly agentNamePatterns: readonly string[];
  /**
   * ``true`` if this provider uses the ``set_session_model`` protocol call.
   *
   * - ``false`` for claude-agent-acp, which uses session ``_meta`` instead.
   * - ``true``  for codex-acp and gemini-cli.
   */
  readonly supportsSetSessionModel: boolean;
  /**
   * Top-level ``_meta`` key for model selection, or ``null``.
   *
   * When non-null, the provider selects its model via ACP session ``_meta``
   * using the structure ``{[sessionMetaKey]: {options: {model: <model>}}}``.
   * ``null`` means the provider uses the ``set_session_model`` protocol call
   * instead (see {@link supportsSetSessionModel}).
   *
   * - ``"claudeCode"`` — claude-agent-acp
   * - ``null``         — codex-acp, gemini-cli
   */
  readonly sessionMetaKey: string | null;
}

/**
 * Read-only registry of built-in ACP providers keyed by ``acp_server`` value.
 *
 * Insertion order matches the Python SDK so consumers that render the
 * providers in a UI dropdown get the same default ordering. Note that this
 * registry intentionally omits the ``"custom"`` discriminator — that key
 * means *the user supplies the raw ``acp_command``*, so there is no static
 * metadata to track.
 */
export const ACP_PROVIDERS: Readonly<Record<string, ACPProviderInfo>> =
  Object.freeze({
    'claude-code': Object.freeze({
      key: 'claude-code',
      displayName: 'Claude Code',
      defaultCommand: Object.freeze([
        'npx',
        '-y',
        '@agentclientprotocol/claude-agent-acp',
      ]),
      apiKeyEnvVar: 'ANTHROPIC_API_KEY',
      baseUrlEnvVar: 'ANTHROPIC_BASE_URL',
      defaultSessionMode: 'bypassPermissions',
      agentNamePatterns: Object.freeze(['claude-agent']),
      supportsSetSessionModel: false,
      sessionMetaKey: 'claudeCode',
    }),
    codex: Object.freeze({
      key: 'codex',
      displayName: 'Codex',
      defaultCommand: Object.freeze([
        'npx',
        '-y',
        '@zed-industries/codex-acp',
      ]),
      apiKeyEnvVar: 'OPENAI_API_KEY',
      baseUrlEnvVar: 'OPENAI_BASE_URL',
      defaultSessionMode: 'full-access',
      agentNamePatterns: Object.freeze(['codex-acp']),
      supportsSetSessionModel: true,
      sessionMetaKey: null,
    }),
    'gemini-cli': Object.freeze({
      key: 'gemini-cli',
      displayName: 'Gemini CLI',
      defaultCommand: Object.freeze([
        'npx',
        '-y',
        '@google/gemini-cli',
        '--acp',
      ]),
      apiKeyEnvVar: 'GEMINI_API_KEY',
      baseUrlEnvVar: 'GEMINI_BASE_URL',
      defaultSessionMode: 'yolo',
      agentNamePatterns: Object.freeze(['gemini-cli']),
      supportsSetSessionModel: true,
      sessionMetaKey: null,
    }),
  });

/** Return the {@link ACPProviderInfo} for ``key``, or ``undefined`` if unknown. */
export function getACPProvider(key: string): ACPProviderInfo | undefined {
  return ACP_PROVIDERS[key];
}

/**
 * Identify a provider from the runtime ``agent_name`` string.
 *
 * Iterates {@link ACP_PROVIDERS} in insertion order and returns the first
 * entry whose {@link ACPProviderInfo.agentNamePatterns} contains a
 * substring of ``agentName.toLowerCase()``.
 *
 * Returns ``undefined`` when no pattern matches (e.g. a ``'custom'`` server
 * or an unrecognised third-party ACP implementation).
 */
export function detectACPProviderByAgentName(
  agentName: string,
): ACPProviderInfo | undefined {
  const lower = agentName.toLowerCase();
  for (const info of Object.values(ACP_PROVIDERS)) {
    if (info.agentNamePatterns.some((pat) => lower.includes(pat))) {
      return info;
    }
  }
  return undefined;
}

/**
 * Build ACP session ``_meta`` content for model selection.
 *
 * Returns the object to spread into ``newSession()`` kwargs for providers
 * that select their model via ``_meta`` (i.e. those whose
 * {@link ACPProviderInfo.sessionMetaKey} is non-null).
 *
 * Returns an empty object when *acpModel* is null/undefined or when the
 * detected provider uses the ``set_session_model`` protocol call instead.
 */
export function buildSessionModelMeta(
  agentName: string,
  acpModel: string | null | undefined,
): Record<string, unknown> {
  if (!acpModel) return {};
  const provider = detectACPProviderByAgentName(agentName);
  if (provider === undefined || provider.sessionMetaKey === null) {
    return {};
  }
  return {
    [provider.sessionMetaKey]: { options: { model: acpModel } },
  };
}
