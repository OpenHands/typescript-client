/**
 * Canonical persisted MCP settings types.
 *
 * The generated Agent Server component remains the field-level source of
 * truth. These aliases add the stable transport discrimination and sparse
 * RFC 7386 mutation semantics expected by client callers.
 */
import type {
  McpServerInputWritable,
  McpoAuthAuthenticationInputWritable,
  McpoAuthStateInputWritable,
} from '../generated/agent-server-schema';

type GeneratedMCPServer = McpServerInputWritable;
type GeneratedMCPTransport = NonNullable<GeneratedMCPServer['transport']>;
type GeneratedMCPAuthCredential = NonNullable<GeneratedMCPServer['auth']>;
type GeneratedMCPEnv = NonNullable<GeneratedMCPServer['env']>;
type GeneratedMCPHeaders = NonNullable<GeneratedMCPServer['headers']>;

type MCPDisplayFields = Pick<GeneratedMCPServer, 'description' | 'icon' | 'timeout'>;
type MCPStdioFields = Pick<GeneratedMCPServer, 'args' | 'env' | 'cwd'>;
type MCPRemoteFields = Pick<
  GeneratedMCPServer,
  'headers' | 'auth' | 'sse_read_timeout' | 'keep_alive'
>;

export type MCPTransport = GeneratedMCPTransport;
export type RemoteMCPTransport = Exclude<MCPTransport, 'stdio'>;
export type MCPAuthCredential = GeneratedMCPAuthCredential;
export type MCPOAuthAuthentication = McpoAuthAuthenticationInputWritable;
export type MCPOAuthState = McpoAuthStateInputWritable;

export type StdioMCPServer = MCPDisplayFields &
  MCPStdioFields & {
    transport: 'stdio';
    command: string;
    url?: never;
  };

export type RemoteMCPServer = MCPDisplayFields &
  MCPRemoteFields & {
    transport: RemoteMCPTransport;
    url: string;
    command?: never;
  };

export type MCPServer = StdioMCPServer | RemoteMCPServer;
export type MCPConfig = Record<string, MCPServer>;

type MCPStringMapPatch<Value> = Record<string, Value | null> | null;

export type MCPServerPatch = Omit<Partial<GeneratedMCPServer>, 'env' | 'headers' | 'auth'> & {
  env?: MCPStringMapPatch<GeneratedMCPEnv[string]>;
  headers?: MCPStringMapPatch<GeneratedMCPHeaders[string]>;
  auth?: MCPAuthCredential | null;
};

export type MCPConfigPatch = Record<string, MCPServerPatch | null>;
