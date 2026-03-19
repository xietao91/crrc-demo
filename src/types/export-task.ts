export type ExportTaskStatus =
  | 'waiting'
  | 'running'
  | 'success'
  | 'failed'
  | 'canceled';

export interface ExportTaskRecord<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  title: string;
  businessType: string;
  status: ExportTaskStatus;
  progress: number;
  paramsSummary?: string;
  fileName?: string;
  downloadUrl?: string;
  errorMessage?: string;
  payload?: TPayload;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface ExportTaskCreateResult {
  taskId: string;
  taskName?: string;
}

export interface ExportTaskQueryResult {
  taskId: string;
  status: ExportTaskStatus;
  progress: number;
  fileName?: string;
  downloadUrl?: string;
  errorMessage?: string;
}

export interface ExportTaskAdapter<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  createTask: (payload: TPayload) => Promise<ExportTaskCreateResult>;
  queryTask: (taskId: string) => Promise<ExportTaskQueryResult>;
  downloadTask: (taskId: string) => Promise<Blob>;
}
