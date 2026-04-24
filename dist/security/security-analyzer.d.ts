/**
 * Security Analyzer for Conversations
 *
 * Analyzes actions for potential security risks.
 * This mirrors the Python SDK's SecurityAnalyzer system.
 */
import { ActionEvent } from '../events/types';
import { SecurityAnalysisResult } from './confirmation-policy';
/**
 * Base interface for security analyzers.
 * Analyzers evaluate actions to determine their risk level.
 */
export interface SecurityAnalyzer {
    /** Analyzer type identifier */
    readonly type: string;
    /**
     * Analyze an action for security risks.
     *
     * @param action - The action to analyze
     * @returns Analysis result with risk level and details
     */
    analyze(action: ActionEvent): Promise<SecurityAnalysisResult> | SecurityAnalysisResult;
}
/**
 * Pattern-based security analyzer.
 * Uses regex patterns to identify risky commands and operations.
 */
export declare class PatternBasedAnalyzer implements SecurityAnalyzer {
    readonly type = "pattern_based";
    private readonly highRiskPatterns;
    private readonly mediumRiskPatterns;
    private readonly sensitivePathPatterns;
    analyze(action: ActionEvent): SecurityAnalysisResult;
    private getContentToAnalyze;
}
/**
 * Allowlist-based security analyzer.
 * Only allows explicitly approved tools and patterns.
 */
export declare class AllowlistAnalyzer implements SecurityAnalyzer {
    readonly type = "allowlist";
    private allowedTools;
    private allowedPatterns;
    constructor(allowedTools: string[], allowedPatterns?: RegExp[]);
    analyze(action: ActionEvent): SecurityAnalysisResult;
}
/**
 * No-op analyzer - marks everything as low risk.
 * Use for development/testing only.
 */
export declare class NoOpAnalyzer implements SecurityAnalyzer {
    readonly type = "noop";
    analyze(_action: ActionEvent): SecurityAnalysisResult;
}
/**
 * Composite analyzer - combines multiple analyzers.
 * Returns the highest risk level from all analyzers.
 */
export declare class CompositeAnalyzer implements SecurityAnalyzer {
    readonly type = "composite";
    private analyzers;
    constructor(analyzers: SecurityAnalyzer[]);
    analyze(action: ActionEvent): Promise<SecurityAnalysisResult>;
}
/**
 * Create a security analyzer from a type string.
 */
export declare function createSecurityAnalyzer(type: string, options?: unknown): SecurityAnalyzer;
//# sourceMappingURL=security-analyzer.d.ts.map