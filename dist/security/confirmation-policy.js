/**
 * Confirmation Policy for Conversations
 *
 * Defines policies for when actions require user confirmation before execution.
 * This mirrors the Python SDK's confirmation policy system.
 */
/**
 * Convert a risk level to a numeric value for comparison.
 */
export function riskLevelToNumeric(level) {
    switch (level) {
        case 'low':
            return 1;
        case 'medium':
            return 2;
        case 'high':
            return 3;
        case 'unknown':
            return 2; // Treat unknown as medium
    }
}
/**
 * Never require confirmation - all actions are auto-approved.
 * This is the default policy for development/testing.
 */
export class NeverConfirm {
    constructor() {
        this.type = 'never';
    }
    requiresConfirmation(_action, _riskLevel) {
        return false;
    }
}
/**
 * Always require confirmation for all actions.
 * Use this for maximum safety/oversight.
 */
export class AlwaysConfirm {
    constructor() {
        this.type = 'always';
    }
    requiresConfirmation(_action, _riskLevel) {
        return true;
    }
}
/**
 * Require confirmation based on risk level.
 * Actions at or above the threshold require confirmation.
 */
export class RiskBasedConfirm {
    constructor(threshold = 'medium') {
        this.type = 'risk_based';
        this.threshold = threshold;
    }
    requiresConfirmation(_action, riskLevel) {
        const level = riskLevel || 'unknown';
        return riskLevelToNumeric(level) >= riskLevelToNumeric(this.threshold);
    }
}
/**
 * Require confirmation for specific tools.
 */
export class ToolBasedConfirm {
    constructor(tools) {
        this.type = 'tool_based';
        this.toolsRequiringConfirmation = new Set(tools);
    }
    requiresConfirmation(action, _riskLevel) {
        return this.toolsRequiringConfirmation.has(action.tool_name);
    }
}
/**
 * Composite policy - requires confirmation if ANY sub-policy requires it.
 */
export class CompositeConfirm {
    constructor(policies) {
        this.type = 'composite';
        this.policies = policies;
    }
    requiresConfirmation(action, riskLevel) {
        return this.policies.some((policy) => policy.requiresConfirmation(action, riskLevel));
    }
}
/**
 * Create a confirmation policy from a type string.
 */
export function createConfirmationPolicy(type, options) {
    switch (type) {
        case 'never':
            return new NeverConfirm();
        case 'always':
            return new AlwaysConfirm();
        case 'risk_based':
            return new RiskBasedConfirm(options?.threshold);
        case 'tool_based':
            return new ToolBasedConfirm(options?.tools || []);
        default:
            return new NeverConfirm();
    }
}
//# sourceMappingURL=confirmation-policy.js.map