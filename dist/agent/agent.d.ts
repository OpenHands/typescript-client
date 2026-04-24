/**
 * Agent class that provides a constructor-based API for creating agents.
 * Provides a cleaner API that matches the Python SDK naming.
 */
import { AgentBase, LLM } from '../types/base';
export interface AgentOptions {
    llm: LLM;
    kind?: string;
    name?: string;
    [key: string]: any;
}
/**
 * Agent class that implements AgentBase interface.
 * Provides a constructor-based API for creating agents.
 *
 * Usage:
 *   const agent = new Agent({
 *     llm: {
 *       model: 'gpt-4',
 *       api_key: 'your-key'
 *     }
 *   });
 */
export declare class Agent implements AgentBase {
    kind: string;
    llm: LLM;
    name?: string;
    [key: string]: any;
    constructor(options: AgentOptions);
}
//# sourceMappingURL=agent.d.ts.map