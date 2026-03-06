export enum AgentState {
  LOADING = 'loading',
  INIT = 'init',
  RUNNING = 'running',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  FINISHED = 'finished',
  ERROR = 'error',
  AWAITING_USER_CONFIRMATION = 'awaiting_user_confirmation',
  AWAITING_USER_INPUT = 'awaiting_user_input',
}

export function getAgentStateLabel(state: AgentState): string {
  switch (state) {
    case AgentState.LOADING:
      return 'Loading...';
    case AgentState.INIT:
      return 'Initializing...';
    case AgentState.RUNNING:
      return 'Running';
    case AgentState.PAUSED:
      return 'Paused';
    case AgentState.STOPPED:
      return 'Stopped';
    case AgentState.FINISHED:
      return 'Finished';
    case AgentState.ERROR:
      return 'Error';
    case AgentState.AWAITING_USER_CONFIRMATION:
      return 'Awaiting Confirmation';
    case AgentState.AWAITING_USER_INPUT:
      return 'Awaiting Input';
    default:
      return state;
  }
}
