import { watchEffect } from 'vue';
import { useExportTaskCenter } from '../stores/export-task-center';
import type { ExportTaskAdapter } from '../types/export-task';

interface UseExportTaskOptions<TPayload extends Record<string, unknown>> {
  title: string;
  businessType: string;
  buildSummary?: (payload: TPayload) => string;
  adapter: ExportTaskAdapter<TPayload>;
}

export function useExportTask<TPayload extends Record<string, unknown>>(options: UseExportTaskOptions<TPayload>) {
  const taskCenter = useExportTaskCenter();

  watchEffect(() => {
    taskCenter.registerBusinessAdapter(options.businessType, options.adapter);
  });

  async function startExport(payload: TPayload) {
    return taskCenter.startTask({
      title: options.title,
      businessType: options.businessType,
      paramsSummary: options.buildSummary?.(payload),
      payload,
      adapter: options.adapter,
    });
  }

  return {
    startExport,
  };
}
