/** Remote Agent Server workspace factory. */

import { RemoteWorkspace, RemoteWorkspaceOptions } from './remote-workspace';

export type WorkspaceOptions = RemoteWorkspaceOptions;

export interface CreateWorkspaceOptions {
  options: RemoteWorkspaceOptions;
}

export class Workspace extends RemoteWorkspace {
  constructor(options: RemoteWorkspaceOptions) {
    super(options);
  }
}

export function createWorkspace(config: CreateWorkspaceOptions): RemoteWorkspace {
  return new RemoteWorkspace(config.options);
}

export function createWorkspaceAuto(options: RemoteWorkspaceOptions): RemoteWorkspace {
  return new RemoteWorkspace(options);
}
