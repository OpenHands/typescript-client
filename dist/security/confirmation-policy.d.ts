/**
 * Confirmation Policy for Conversations
 *
 * Defines policies for when actions require user confirmation before execution.
 * This mirrors the Python SDK's confirmation policy system.
 */
import { ActionEvent } from '../events/types';
/**
 * Risk level for an action
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'unknown';
/**
 * Convert a risk level to a numeric value for comparison.
 */
export declare function riskLevelToNumeric(level: RiskLevel): number;
/**
 * Result of a security analysis
 */
export interface SecurityAnalysisResult {
    /** The determined risk level */
    riskLevel: RiskLevel;
    /** Whether confirmation is required */
    requiresConfirmation: boolean;
    /** Human-readable explanation of the risk assessment */
    explanation?: string;
    /** Specific concerns identified */
    concerns?: string[];
}
/**
 * Base interface for confirmation policies.
 * Policies determine when actions require user confirmation.
 */
export interface ConfirmationPolicy {
    /** Policy type identifier */
    readonly type: string;
    /**
     * Determine if an action requires confirmation.
     *
     * @param action - The action to evaluate
     * @param riskLevel - Optional pre-determined risk level
     * @returns True if confirmation is required
     */
    requiresConfirmation(action: ActionEvent, riskLevel?: RiskLevel): boolean;
}
/**
 * Never require confirmation - all actions are auto-approved.
 * This is the default policy for development/testing.
 */
export declare class NeverConfirm implements ConfirmationPolicy {
    readonly type = "never";
    requiresConfirmation(_action: ActionEvent, _riskLevel?: RiskLevel): boolean;
}
/**
 * Always require confirmation for all actions.
 * Use this for maximum safety/oversight.
 */
export declare class AlwaysConfirm implements ConfirmationPolicy {
    readonly type = "always";
    requiresConfirmation(_action: ActionEvent, _riskLevel?: RiskLevel): boolean;
}
/**
 * Require confirmation based on risk level.
 * Actions at or above the threshold require confirmation.
 */
export declare class RiskBasedConfirm implements ConfirmationPolicy {
    readonly type = "risk_based";
    private threshold;
    constructor(threshold?: RiskLevel);
    requiresConfirmation(_action: ActionEvent, riskLevel?: RiskLevel): boolean;
}
/**
 * Require confirmation for specific tools.
 */
export declare class ToolBasedConfirm implements ConfirmationPolicy {
    readonly type = "tool_based";
    private toolsRequiringConfirmation;
    constructor(tools: string[]);
    requiresConfirmation(action: ActionEvent, _riskLevel?: RiskLevel): boolean;
}
/**
 * Composite policy - requires confirmation if ANY sub-policy requires it.
 */
export declare class CompositeConfirm implements ConfirmationPolicy {
    readonly type = "composite";
    private policies;
    constructor(policies: ConfirmationPolicy[]);
    requiresConfirmation(action: ActionEvent, riskLevel?: RiskLevel): boolean;
}
/**
 * Create a confirmation policy from a type string.
 */
export declare function createConfirmationPolicy(type: string, options?: unknown): ConfirmationPolicy;
//# sourceMappingURL=confirmation-policy.d.ts.map