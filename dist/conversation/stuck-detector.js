/**
 * Stuck Detection for Conversations
 *
 * Detects when an agent is stuck in repetitive or unproductive patterns.
 * This mirrors the Python SDK's StuckDetector class.
 */
import { isActionEvent, isObservationEvent, isAgentErrorEvent, isMessageEvent, } from '../events/types';
/**
 * Default thresholds for stuck detection
 */
export const DEFAULT_STUCK_THRESHOLDS = {
    actionObservation: 4,
    actionError: 4,
    monologue: 4,
    alternatingPattern: 6,
};
/**
 * Detects when an agent is stuck in repetitive or unproductive patterns.
 *
 * This detector analyzes the conversation history to identify various stuck patterns:
 * 1. Repeating action-observation cycles
 * 2. Repeating action-error cycles
 * 3. Agent monologue (repeated messages without user input)
 * 4. Repeating alternating action-observation patterns
 * 5. Context window errors indicating memory issues
 */
export class StuckDetector {
    constructor(thresholds) {
        this.thresholds = {
            ...DEFAULT_STUCK_THRESHOLDS,
            ...thresholds,
        };
    }
    /**
     * Check if the agent is stuck based on the event history.
     *
     * @param events - Array of conversation events to analyze
     * @returns StuckDetectionResult with stuck status and details
     */
    isStuck(events) {
        // Find the last user message index
        const lastUserMsgIndex = this.findLastUserMessageIndex(events);
        if (lastUserMsgIndex === -1) {
            // No user message found, skip detection
            return { isStuck: false };
        }
        // Only analyze events after the last user message
        const recentEvents = events.slice(lastUserMsgIndex + 1);
        // Determine minimum events needed
        const minThreshold = Math.min(this.thresholds.actionObservation, this.thresholds.actionError, this.thresholds.monologue);
        if (recentEvents.length < minThreshold) {
            return { isStuck: false };
        }
        // Collect actions and observations for analysis
        const maxNeeded = Math.max(this.thresholds.actionObservation, this.thresholds.actionError);
        const lastActions = [];
        const lastObservations = [];
        // Collect from the end of history
        for (let i = recentEvents.length - 1; i >= 0; i--) {
            const event = recentEvents[i];
            if (isActionEvent(event) && lastActions.length < maxNeeded) {
                lastActions.push(event);
            }
            else if ((isObservationEvent(event) || isAgentErrorEvent(event)) &&
                lastObservations.length < maxNeeded) {
                lastObservations.push(event);
            }
            if (lastActions.length >= maxNeeded && lastObservations.length >= maxNeeded) {
                break;
            }
        }
        // Check all stuck patterns
        // Scenario 1: Same action, same observation
        const actionObsResult = this.checkRepeatingActionObservation(lastActions, lastObservations);
        if (actionObsResult.isStuck) {
            return actionObsResult;
        }
        // Scenario 2: Same action, errors
        const actionErrorResult = this.checkRepeatingActionError(lastActions, lastObservations);
        if (actionErrorResult.isStuck) {
            return actionErrorResult;
        }
        // Scenario 3: Monologue
        const monologueResult = this.checkMonologue(recentEvents);
        if (monologueResult.isStuck) {
            return monologueResult;
        }
        // Scenario 4: Alternating action-observation pattern
        if (recentEvents.length >= this.thresholds.alternatingPattern) {
            const alternatingResult = this.checkAlternatingPattern(recentEvents);
            if (alternatingResult.isStuck) {
                return alternatingResult;
            }
        }
        return { isStuck: false };
    }
    /**
     * Find the index of the last user message in the events.
     */
    findLastUserMessageIndex(events) {
        for (let i = events.length - 1; i >= 0; i--) {
            const event = events[i];
            if (isMessageEvent(event) && event.source === 'user') {
                return i;
            }
        }
        return -1;
    }
    /**
     * Check for repeating action-observation pattern.
     */
    checkRepeatingActionObservation(lastActions, lastObservations) {
        const threshold = this.thresholds.actionObservation;
        if (lastActions.length < threshold || lastObservations.length < threshold) {
            return { isStuck: false };
        }
        // Filter to only regular observations (not errors)
        const observations = lastObservations.filter(isObservationEvent);
        if (observations.length < threshold) {
            return { isStuck: false };
        }
        // Check if all actions are identical
        const actionsEqual = lastActions
            .slice(0, threshold)
            .every((action) => this.actionsEqual(lastActions[0], action));
        // Check if all observations are identical
        const observationsEqual = observations
            .slice(0, threshold)
            .every((obs) => this.observationsEqual(observations[0], obs));
        if (actionsEqual && observationsEqual) {
            return {
                isStuck: true,
                pattern: 'action_observation_loop',
                repetitions: threshold,
                description: `Agent is repeating the same action-observation cycle ${threshold} times. Action: ${lastActions[0].tool_name}`,
            };
        }
        return { isStuck: false };
    }
    /**
     * Check for repeating action-error pattern.
     */
    checkRepeatingActionError(lastActions, lastObservations) {
        const threshold = this.thresholds.actionError;
        if (lastActions.length < threshold || lastObservations.length < threshold) {
            return { isStuck: false };
        }
        // Check if all actions are identical
        const actionsEqual = lastActions
            .slice(0, threshold)
            .every((action) => this.actionsEqual(lastActions[0], action));
        if (!actionsEqual) {
            return { isStuck: false };
        }
        // Check if all observations are errors
        const allErrors = lastObservations.slice(0, threshold).every(isAgentErrorEvent);
        if (allErrors) {
            return {
                isStuck: true,
                pattern: 'action_error_loop',
                repetitions: threshold,
                description: `Agent is repeating the same action ${threshold} times and getting errors. Action: ${lastActions[0].tool_name}`,
            };
        }
        return { isStuck: false };
    }
    /**
     * Check for agent monologue (repeated messages without user input).
     */
    checkMonologue(events) {
        const threshold = this.thresholds.monologue;
        if (events.length < threshold) {
            return { isStuck: false };
        }
        let agentMessageCount = 0;
        // Count consecutive agent messages from the end
        for (let i = events.length - 1; i >= 0; i--) {
            const event = events[i];
            if (isMessageEvent(event)) {
                if (event.source === 'agent') {
                    agentMessageCount++;
                }
                else if (event.source === 'user') {
                    // User interrupted, not a monologue
                    break;
                }
            }
            else if (event.kind === 'CondensationSummaryEvent') {
                // Condensation events don't break the monologue pattern
                continue;
            }
            else {
                // Other events (actions/observations) break the count
                break;
            }
        }
        if (agentMessageCount >= threshold) {
            return {
                isStuck: true,
                pattern: 'monologue',
                repetitions: agentMessageCount,
                description: `Agent has sent ${agentMessageCount} consecutive messages without user input`,
            };
        }
        return { isStuck: false };
    }
    /**
     * Check for alternating action-observation pattern (A-B-A-B-A-B).
     */
    checkAlternatingPattern(events) {
        const threshold = this.thresholds.alternatingPattern;
        const lastActions = [];
        const lastObservations = [];
        // Collect recent actions and observations
        for (let i = events.length - 1; i >= 0; i--) {
            const event = events[i];
            if (isActionEvent(event) && lastActions.length < threshold) {
                lastActions.push(event);
            }
            else if ((isObservationEvent(event) || isAgentErrorEvent(event)) &&
                lastObservations.length < threshold) {
                lastObservations.push(event);
            }
            if (lastActions.length === threshold && lastObservations.length === threshold) {
                break;
            }
        }
        if (lastActions.length < threshold || lastObservations.length < threshold) {
            return { isStuck: false };
        }
        // Check for alternating pattern: even indices match, odd indices match
        // This detects A-B-A-B-A-B patterns
        const actionsAlternate = this.checkAlternatingEquality(lastActions);
        const observationsAlternate = this.checkAlternatingEquality(lastObservations);
        if (actionsAlternate && observationsAlternate) {
            return {
                isStuck: true,
                pattern: 'alternating_pattern',
                repetitions: threshold,
                description: `Agent is stuck in an alternating action-observation pattern`,
            };
        }
        return { isStuck: false };
    }
    /**
     * Check if elements alternate (even indices match each other, odd indices match each other).
     */
    checkAlternatingEquality(items) {
        if (items.length < 4) {
            return false;
        }
        // Check that items[0] == items[2] == items[4] ... and items[1] == items[3] == items[5] ...
        for (let i = 0; i < items.length - 2; i++) {
            if (!this.eventsEqual(items[i], items[i + 2])) {
                return false;
            }
        }
        return true;
    }
    /**
     * Compare two action events for equality (ignoring IDs and timestamps).
     */
    actionsEqual(a, b) {
        return (a.source === b.source &&
            a.tool_name === b.tool_name &&
            a.thought === b.thought &&
            JSON.stringify(a.action) === JSON.stringify(b.action));
    }
    /**
     * Compare two observation events for equality (ignoring IDs and timestamps).
     */
    observationsEqual(a, b) {
        return (a.source === b.source &&
            a.tool_name === b.tool_name &&
            JSON.stringify(a.observation) === JSON.stringify(b.observation));
    }
    /**
     * Compare two events for equality based on their type.
     */
    eventsEqual(a, b) {
        if (a.kind !== b.kind) {
            return false;
        }
        if (isActionEvent(a) && isActionEvent(b)) {
            return this.actionsEqual(a, b);
        }
        if (isObservationEvent(a) && isObservationEvent(b)) {
            return this.observationsEqual(a, b);
        }
        if (isAgentErrorEvent(a) && isAgentErrorEvent(b)) {
            return a.source === b.source && a.error === b.error;
        }
        if (isMessageEvent(a) && isMessageEvent(b)) {
            return (a.source === b.source && JSON.stringify(a.llm_message) === JSON.stringify(b.llm_message));
        }
        // Fallback: compare JSON representation
        return JSON.stringify(a) === JSON.stringify(b);
    }
}
//# sourceMappingURL=stuck-detector.js.map