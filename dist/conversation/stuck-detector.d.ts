/**
 * Stuck Detection for Conversations
 *
 * Detects when an agent is stuck in repetitive or unproductive patterns.
 * This mirrors the Python SDK's StuckDetector class.
 */
import { BaseEvent } from '../events/types';
/**
 * Thresholds for stuck detection patterns
 */
export interface StuckDetectionThresholds {
    /** Number of identical action-observation pairs before triggering (default: 4) */
    actionObservation: number;
    /** Number of identical action-error pairs before triggering (default: 4) */
    actionError: number;
    /** Number of consecutive agent messages without user input (default: 4) */
    monologue: number;
    /** Number of alternating patterns before triggering (default: 6) */
    alternatingPattern: number;
}
/**
 * Default thresholds for stuck detection
 */
export declare const DEFAULT_STUCK_THRESHOLDS: StuckDetectionThresholds;
/**
 * Result of stuck detection check
 */
export interface StuckDetectionResult {
    /** Whether the agent is stuck */
    isStuck: boolean;
    /** Type of stuck pattern detected (if any) */
    pattern?: 'action_observation_loop' | 'action_error_loop' | 'monologue' | 'alternating_pattern' | 'context_window_error';
    /** Number of repetitions detected */
    repetitions?: number;
    /** Human-readable description */
    description?: string;
}
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
export declare class StuckDetector {
    private thresholds;
    constructor(thresholds?: Partial<StuckDetectionThresholds>);
    /**
     * Check if the agent is stuck based on the event history.
     *
     * @param events - Array of conversation events to analyze
     * @returns StuckDetectionResult with stuck status and details
     */
    isStuck(events: BaseEvent[]): StuckDetectionResult;
    /**
     * Find the index of the last user message in the events.
     */
    private findLastUserMessageIndex;
    /**
     * Check for repeating action-observation pattern.
     */
    private checkRepeatingActionObservation;
    /**
     * Check for repeating action-error pattern.
     */
    private checkRepeatingActionError;
    /**
     * Check for agent monologue (repeated messages without user input).
     */
    private checkMonologue;
    /**
     * Check for alternating action-observation pattern (A-B-A-B-A-B).
     */
    private checkAlternatingPattern;
    /**
     * Check if elements alternate (even indices match each other, odd indices match each other).
     */
    private checkAlternatingEquality;
    /**
     * Compare two action events for equality (ignoring IDs and timestamps).
     */
    private actionsEqual;
    /**
     * Compare two observation events for equality (ignoring IDs and timestamps).
     */
    private observationsEqual;
    /**
     * Compare two events for equality based on their type.
     */
    private eventsEqual;
}
//# sourceMappingURL=stuck-detector.d.ts.map