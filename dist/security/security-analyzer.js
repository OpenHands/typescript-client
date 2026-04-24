/**
 * Security Analyzer for Conversations
 *
 * Analyzes actions for potential security risks.
 * This mirrors the Python SDK's SecurityAnalyzer system.
 */
import { riskLevelToNumeric } from './confirmation-policy';
/**
 * Pattern-based security analyzer.
 * Uses regex patterns to identify risky commands and operations.
 */
export class PatternBasedAnalyzer {
    constructor() {
        this.type = 'pattern_based';
        // Patterns for high-risk operations
        this.highRiskPatterns = [
            /\brm\s+-rf?\s+[/~]/i, // rm -rf with absolute/home paths
            /\bsudo\b/i, // sudo commands
            /\bchmod\s+777\b/i, // chmod 777
            /\b(curl|wget).*\|\s*(sh|bash)\b/i, // piped downloads
            /\bdd\s+.*of=/i, // dd command
            /\bmkfs\b/i, // filesystem creation
            /\b(shutdown|reboot|halt)\b/i, // system control
            /\bkill\s+-9\s+1\b/i, // kill init
            />(\/dev\/(sd|hd|nvme)|\/etc\/)/i, // writing to devices/etc
            /\bpasswd\b/i, // password changes
            /\buseradd\b|\buserdel\b/i, // user management
        ];
        // Patterns for medium-risk operations
        this.mediumRiskPatterns = [
            /\brm\b/i, // any rm command
            /\bgit\s+push\b/i, // git push
            /\bgit\s+reset\s+--hard\b/i, // git reset hard
            /\bnpm\s+(publish|unpublish)\b/i, // npm publish
            /\bpip\s+install\b/i, // pip install
            /\bcurl\b|\bwget\b/i, // network downloads
            /\bchmod\b/i, // permission changes
            /\bchown\b/i, // ownership changes
            /\benv\b.*=.*\bexport\b/i, // environment modifications
            /\b(docker|kubectl)\b/i, // container/k8s commands
        ];
        // Patterns for sensitive file access
        this.sensitivePathPatterns = [
            /\/etc\/(passwd|shadow|sudoers)/i,
            /~?\/.ssh\//i,
            /~?\/.aws\//i,
            /~?\/.gnupg\//i,
            /\.env\b/i,
            /\.(pem|key|crt|cer)\b/i,
            /secrets?\.(json|ya?ml|txt)\b/i,
            /credentials?\b/i,
        ];
    }
    analyze(action) {
        const concerns = [];
        let highestRisk = 'low';
        // Get the command or content to analyze
        const contentToAnalyze = this.getContentToAnalyze(action);
        // Check for high-risk patterns
        for (const pattern of this.highRiskPatterns) {
            if (pattern.test(contentToAnalyze)) {
                concerns.push(`High-risk pattern detected: ${pattern.source}`);
                highestRisk = 'high';
            }
        }
        // Check for medium-risk patterns (only if not already high)
        if (highestRisk !== 'high') {
            for (const pattern of this.mediumRiskPatterns) {
                if (pattern.test(contentToAnalyze)) {
                    concerns.push(`Medium-risk pattern detected: ${pattern.source}`);
                    if (highestRisk === 'low') {
                        highestRisk = 'medium';
                    }
                }
            }
        }
        // Check for sensitive file access
        for (const pattern of this.sensitivePathPatterns) {
            if (pattern.test(contentToAnalyze)) {
                concerns.push(`Sensitive file access detected: ${pattern.source}`);
                if (highestRisk === 'low') {
                    highestRisk = 'medium';
                }
            }
        }
        return {
            riskLevel: highestRisk,
            requiresConfirmation: highestRisk !== 'low',
            explanation: concerns.length > 0
                ? `Found ${concerns.length} potential security concern(s)`
                : 'No significant risks detected',
            concerns,
        };
    }
    getContentToAnalyze(action) {
        // Combine relevant fields for analysis
        const parts = [action.tool_name];
        if (action.action) {
            // For execute_command tool
            if (typeof action.action === 'object' && 'command' in action.action) {
                parts.push(String(action.action.command));
            }
            // For write_file tool
            if (typeof action.action === 'object' && 'path' in action.action) {
                parts.push(String(action.action.path));
            }
            if (typeof action.action === 'object' && 'content' in action.action) {
                parts.push(String(action.action.content));
            }
            // Generic: stringify the action
            parts.push(JSON.stringify(action.action));
        }
        return parts.join(' ');
    }
}
/**
 * Allowlist-based security analyzer.
 * Only allows explicitly approved tools and patterns.
 */
export class AllowlistAnalyzer {
    constructor(allowedTools, allowedPatterns = []) {
        this.type = 'allowlist';
        this.allowedTools = new Set(allowedTools);
        this.allowedPatterns = allowedPatterns;
    }
    analyze(action) {
        // Check if tool is allowed
        if (this.allowedTools.has(action.tool_name)) {
            return {
                riskLevel: 'low',
                requiresConfirmation: false,
                explanation: `Tool '${action.tool_name}' is in the allowlist`,
            };
        }
        // Check if action matches allowed patterns
        const actionStr = JSON.stringify(action.action);
        for (const pattern of this.allowedPatterns) {
            if (pattern.test(actionStr)) {
                return {
                    riskLevel: 'low',
                    requiresConfirmation: false,
                    explanation: `Action matches allowed pattern`,
                };
            }
        }
        // Not in allowlist
        return {
            riskLevel: 'high',
            requiresConfirmation: true,
            explanation: `Tool '${action.tool_name}' is not in the allowlist`,
            concerns: ['Unlisted tool or action'],
        };
    }
}
/**
 * No-op analyzer - marks everything as low risk.
 * Use for development/testing only.
 */
export class NoOpAnalyzer {
    constructor() {
        this.type = 'noop';
    }
    analyze(_action) {
        return {
            riskLevel: 'low',
            requiresConfirmation: false,
            explanation: 'No security analysis performed',
        };
    }
}
/**
 * Composite analyzer - combines multiple analyzers.
 * Returns the highest risk level from all analyzers.
 */
export class CompositeAnalyzer {
    constructor(analyzers) {
        this.type = 'composite';
        this.analyzers = analyzers;
    }
    async analyze(action) {
        const results = await Promise.all(this.analyzers.map((a) => a.analyze(action)));
        // Combine results - highest risk wins
        let highestRisk = 'low';
        const allConcerns = [];
        const explanations = [];
        for (const result of results) {
            if (riskLevelToNumeric(result.riskLevel) > riskLevelToNumeric(highestRisk)) {
                highestRisk = result.riskLevel;
            }
            if (result.concerns) {
                allConcerns.push(...result.concerns);
            }
            if (result.explanation) {
                explanations.push(result.explanation);
            }
        }
        return {
            riskLevel: highestRisk,
            requiresConfirmation: highestRisk !== 'low',
            explanation: explanations.join('; '),
            concerns: allConcerns.length > 0 ? allConcerns : undefined,
        };
    }
}
/**
 * Create a security analyzer from a type string.
 */
export function createSecurityAnalyzer(type, options) {
    switch (type) {
        case 'pattern_based':
            return new PatternBasedAnalyzer();
        case 'allowlist': {
            const opts = options;
            return new AllowlistAnalyzer(opts?.tools || [], opts?.patterns || []);
        }
        case 'noop':
            return new NoOpAnalyzer();
        default:
            return new PatternBasedAnalyzer();
    }
}
//# sourceMappingURL=security-analyzer.js.map