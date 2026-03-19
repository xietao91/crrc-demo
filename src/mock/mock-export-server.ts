import type {
  ExportTaskCreateResult,
  ExportTaskQueryResult,
} from '../types/export-task';

interface MockServerTask {
  taskId: string;
  title: string;
  businessType: string;
  createdAt: number;
  duration: number;
  shouldFail: boolean;
  payload: Record<string, unknown>;
}

export interface MockCreateTaskPayload extends Record<string, unknown> {
  title: string;
  businessType: string;
  durationMs?: number;
  shouldFail?: boolean;
  fileName?: string;
  [key: string]: unknown;
}

const STORAGE_KEY = 'mock-export-server-tasks';

function readTasks(): MockServerTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeTasks(tasks: MockServerTask[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function wait(ms = 300) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getFileName(task: MockServerTask) {
  const payloadName = typeof task.payload.fileName === 'string' ? task.payload.fileName : '';
  return payloadName || `${task.title}-${task.taskId}.xlsx`;
}

function getTask(taskId: string) {
  return readTasks().find((item) => item.taskId === taskId);
}

export async function createMockExportTask<TPayload extends MockCreateTaskPayload>(
  payload: TPayload,
): Promise<ExportTaskCreateResult> {
  await wait(250);
  const taskId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tasks = readTasks();
  tasks.unshift({
    taskId,
    title: payload.title,
    businessType: payload.businessType,
    createdAt: Date.now(),
    duration: payload.durationMs ?? 60_000,
    shouldFail: Boolean(payload.shouldFail),
    payload,
  });
  writeTasks(tasks);
  return {
    taskId,
    taskName: payload.title,
  };
}

export async function queryMockExportTask(taskId: string): Promise<ExportTaskQueryResult> {
  await wait(220);
  const task = getTask(taskId);

  if (!task) {
    return {
      taskId,
      status: 'failed',
      progress: 0,
      errorMessage: '任务不存在或已过期',
    };
  }

  const elapsed = Date.now() - task.createdAt;
  const progress = Math.min(100, Math.floor((elapsed / task.duration) * 100));

  if (task.shouldFail && progress >= 72) {
    return {
      taskId,
      status: 'failed',
      progress: 72,
      errorMessage: '模拟导出失败：文件生成节点超时',
    };
  }

  if (progress >= 100) {
    return {
      taskId,
      status: 'success',
      progress: 100,
      fileName: getFileName(task),
      downloadUrl: `mock-download://${taskId}`,
    };
  }

  return {
    taskId,
    status: progress === 0 ? 'waiting' : 'running',
    progress,
  };
}

export async function downloadMockExportTask(taskId: string): Promise<Blob> {
  await wait(600);
  const task = getTask(taskId);

  if (!task) {
    throw new Error('下载失败，任务不存在');
  }

  const lines = [
    `报表名称: ${task.title}`,
    `任务ID: ${task.taskId}`,
    `业务类型: ${task.businessType}`,
    `创建时间: ${new Date(task.createdAt).toLocaleString('zh-CN')}`,
    '',
    '以下内容仅用于演示大文件导出下载逻辑。',
  ];

  const content = new Array(800)
    .fill(lines.join('\n'))
    .map((item, index) => `${item}\n模拟行 ${index + 1}`)
    .join('\n');

  return new Blob([content], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
