import { computed, reactive } from 'vue';
import { message } from 'ant-design-vue';
import type {
  ExportTaskAdapter,
  ExportTaskRecord,
  ExportTaskStatus,
} from '../types/export-task';

interface StartTaskOptions<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  title: string;
  businessType: string;
  paramsSummary?: string;
  payload: TPayload;
  adapter: ExportTaskAdapter<TPayload>;
}

interface ExportTaskCenterState {
  drawerVisible: boolean;
  tasks: ExportTaskRecord[];
}

const STORAGE_KEY = 'export-task-center-state';
const POLLING_INTERVAL = 1500;
const pollingTimers = new Map<string, number>();
const taskAdapters = new Map<string, ExportTaskAdapter<any>>();
const businessAdapters = new Map<string, ExportTaskAdapter<any>>();

const state = reactive<ExportTaskCenterState>({
  drawerVisible: false,
  tasks: [],
});

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<ExportTaskCenterState>;
    state.drawerVisible = Boolean(parsed.drawerVisible);
    state.tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
  } catch {
    state.drawerVisible = false;
    state.tasks = [];
  }
}

function persistState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      drawerVisible: state.drawerVisible,
      tasks: state.tasks,
    }),
  );
}

function sortTasks() {
  state.tasks.sort((a, b) => b.updatedAt - a.updatedAt);
}

function upsertTask(task: ExportTaskRecord) {
  const index = state.tasks.findIndex((item) => item.id === task.id);
  if (index >= 0) {
    state.tasks.splice(index, 1, task);
  } else {
    state.tasks.unshift(task);
  }
  sortTasks();
  persistState();
}

function patchTask(taskId: string, patch: Partial<ExportTaskRecord>) {
  const target = state.tasks.find((item) => item.id === taskId);
  if (!target) return;
  Object.assign(target, patch, {
    updatedAt: Date.now(),
  });
  if (patch.status === 'success' || patch.status === 'failed' || patch.status === 'canceled') {
    target.completedAt = patch.completedAt ?? Date.now();
  }
  sortTasks();
  persistState();
}

function stopPolling(taskId: string) {
  const timer = pollingTimers.get(taskId);
  if (timer) {
    window.clearTimeout(timer);
    pollingTimers.delete(taskId);
  }
}

async function pollTask(taskId: string) {
  const current = state.tasks.find((item) => item.id === taskId);
  const adapter = taskAdapters.get(taskId) || (current ? businessAdapters.get(current.businessType) : undefined);
  if (!adapter || !current) return;
  taskAdapters.set(taskId, adapter);

  try {
    const result = await adapter.queryTask(taskId);
    patchTask(taskId, {
      status: result.status,
      progress: result.progress,
      fileName: result.fileName,
      downloadUrl: result.downloadUrl,
      errorMessage: result.errorMessage,
    });

    if (result.status === 'success') {
      stopPolling(taskId);
      message.success(`${current.title} 已生成完成，可直接下载`);
      return;
    }

    if (result.status === 'failed' || result.status === 'canceled') {
      stopPolling(taskId);
      message.error(result.errorMessage || `${current.title} 导出失败`);
      return;
    }
  } catch (error) {
    patchTask(taskId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : '查询导出进度失败',
    });
    stopPolling(taskId);
    message.error(`${current.title} 进度查询失败`);
    return;
  }

  const timer = window.setTimeout(() => pollTask(taskId), POLLING_INTERVAL);
  pollingTimers.set(taskId, timer);
}

function ensurePolling(taskId: string) {
  stopPolling(taskId);
  const timer = window.setTimeout(() => pollTask(taskId), 10);
  pollingTimers.set(taskId, timer);
}

async function startTask<TPayload extends Record<string, unknown>>(options: StartTaskOptions<TPayload>) {
  const createdAt = Date.now();

  const placeholder: ExportTaskRecord<TPayload> = {
    id: `local-${createdAt}-${Math.random().toString(36).slice(2, 6)}`,
    title: options.title,
    businessType: options.businessType,
    paramsSummary: options.paramsSummary,
    payload: options.payload,
    status: 'waiting',
    progress: 0,
    createdAt,
    updatedAt: createdAt,
  };

  upsertTask(placeholder);
  state.drawerVisible = true;
  persistState();

  try {
    const created = await options.adapter.createTask(options.payload);
    const actualTask: ExportTaskRecord<TPayload> = {
      ...placeholder,
      id: created.taskId,
      title: created.taskName || options.title,
      status: 'running',
      updatedAt: Date.now(),
    };

    state.tasks = state.tasks.filter((item) => item.id !== placeholder.id);
    upsertTask(actualTask);
    taskAdapters.set(created.taskId, options.adapter);
    ensurePolling(created.taskId);
    message.loading({
      content: `${actualTask.title} 已加入导出队列，任务在后台执行中`,
      key: created.taskId,
      duration: 2,
    });
    return actualTask;
  } catch (error) {
    patchTask(placeholder.id, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : '创建导出任务失败',
    });
    throw error;
  }
}

async function retryTask(taskId: string) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  const adapter = taskAdapters.get(taskId) || businessAdapters.get(task.businessType);
  if (!task || !adapter || !task.payload) return;

  state.tasks = state.tasks.filter((item) => item.id !== taskId);
  persistState();

  await startTask({
    title: task.title,
    businessType: task.businessType,
    paramsSummary: task.paramsSummary,
    payload: task.payload,
    adapter,
  });
}

async function downloadTask(taskId: string) {
  const task = state.tasks.find((item) => item.id === taskId);
  const adapter = taskAdapters.get(taskId) || (task ? businessAdapters.get(task.businessType) : undefined);
  if (!task || !adapter) return;

  try {
    const blob = await adapter.downloadTask(taskId);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = task.fileName || `${task.title}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    message.success(`${task.title} 开始下载`);
  } catch (error) {
    message.error(error instanceof Error ? error.message : '下载失败');
  }
}

function removeTask(taskId: string) {
  stopPolling(taskId);
  taskAdapters.delete(taskId);
  state.tasks = state.tasks.filter((item) => item.id !== taskId);
  persistState();
}

function clearFinished() {
  const removable = state.tasks.filter((item) =>
    ['success', 'failed', 'canceled'].includes(item.status),
  );
  removable.forEach((item) => {
    stopPolling(item.id);
    taskAdapters.delete(item.id);
  });
  state.tasks = state.tasks.filter((item) => !removable.includes(item));
  persistState();
}

function setDrawerVisible(visible: boolean) {
  state.drawerVisible = visible;
  persistState();
}

function statusText(status: ExportTaskStatus) {
  const map: Record<ExportTaskStatus, string> = {
    waiting: '排队中',
    running: '导出中',
    success: '已完成',
    failed: '失败',
    canceled: '已取消',
  };
  return map[status];
}

const runningCount = computed(
  () => state.tasks.filter((item) => item.status === 'waiting' || item.status === 'running').length,
);

readState();

export function useExportTaskCenter() {
  return {
    state,
    runningCount,
    startTask,
    retryTask,
    downloadTask,
    removeTask,
    clearFinished,
    setDrawerVisible,
    statusText,
    registerBusinessAdapter: (businessType: string, adapter: ExportTaskAdapter<any>) => {
      businessAdapters.set(businessType, adapter);
      state.tasks
        .filter(
          (item) =>
            item.businessType === businessType &&
            (item.status === 'waiting' || item.status === 'running'),
        )
        .forEach((item) => {
          taskAdapters.set(item.id, adapter);
          ensurePolling(item.id);
        });
    },
  };
}
