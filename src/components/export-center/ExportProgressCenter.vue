<script setup lang="ts">
import { computed, h } from 'vue';
import {
  Badge,
  Button,
  Card,
  Drawer,
  Empty,
  List,
  Progress,
  Space,
  Tag,
  TypographyParagraph,
} from 'ant-design-vue';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloudDownloadOutlined,
  DeleteOutlined,
  InboxOutlined,
  LoadingOutlined,
} from '@ant-design/icons-vue';
import { useExportTaskCenter } from '../../stores/export-task-center';
import type { ExportTaskRecord } from '../../types/export-task';

const taskCenter = useExportTaskCenter();

const tasks = computed(() => taskCenter.state.tasks);

function formatTime(value?: number) {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN', {
    hour12: false,
  });
}

function statusColor(task: ExportTaskRecord) {
  if (task.status === 'success') return 'success';
  if (task.status === 'failed') return 'error';
  if (task.status === 'canceled') return 'default';
  return 'processing';
}

function statusIcon(task: ExportTaskRecord) {
  if (task.status === 'success') return h(CheckCircleOutlined);
  if (task.status === 'failed') return h(CloseCircleOutlined);
  return h(LoadingOutlined);
}

function progressStatus(task: ExportTaskRecord) {
  if (task.status === 'failed') return 'exception';
  if (task.status === 'success') return 'success';
  return 'active';
}
</script>

<template>
  <a-float-button @click="taskCenter.setDrawerVisible(true)">
    <template #icon>
      <Badge :count="taskCenter.runningCount" :offset="[2, -2]">
        <InboxOutlined />
      </Badge>
    </template>
  </a-float-button>

  <Drawer
    width="440"
    placement="right"
    :visible="taskCenter.state.drawerVisible"
    title="导出进度中心"
    @close="taskCenter.setDrawerVisible(false)"
  >
    <template #extra>
      <Button type="link" @click="taskCenter.clearFinished()">清空已结束</Button>
    </template>

    <Empty v-if="tasks.length === 0" description="暂无导出任务" />

    <List v-else :data-source="tasks" item-layout="vertical">
      <template #renderItem="{ item }">
        <List.Item>
          <Card size="small" class="export-task-card">
            <div class="task-header">
              <div>
                <div class="task-title">{{ item.title }}</div>
                <TypographyParagraph
                  v-if="item.paramsSummary"
                  :ellipsis="{ rows: 2 }"
                  class="task-summary"
                >
                  {{ item.paramsSummary }}
                </TypographyParagraph>
              </div>
              <Tag :color="statusColor(item)">
                <template #icon>
                  <component :is="statusIcon(item)" />
                </template>
                {{ taskCenter.statusText(item.status) }}
              </Tag>
            </div>

            <Progress
              :percent="item.progress"
              :status="progressStatus(item)"
              size="small"
              class="task-progress"
            />

            <div class="task-meta">
              <span>开始时间：{{ formatTime(item.createdAt) }}</span>
              <span>最近更新：{{ formatTime(item.updatedAt) }}</span>
            </div>

            <div v-if="item.errorMessage" class="task-error">
              {{ item.errorMessage }}
            </div>

            <Space class="task-actions">
              <Button
                v-if="item.status === 'success'"
                type="primary"
                size="small"
                @click="taskCenter.downloadTask(item.id)"
              >
                <template #icon>
                  <CloudDownloadOutlined />
                </template>
                下载文件
              </Button>

              <Button
                v-if="item.status === 'failed'"
                size="small"
                @click="taskCenter.retryTask(item.id)"
              >
                重试
              </Button>

              <Button
                danger
                type="text"
                size="small"
                @click="taskCenter.removeTask(item.id)"
              >
                <template #icon>
                  <DeleteOutlined />
                </template>
                删除记录
              </Button>
            </Space>
          </Card>
        </List.Item>
      </template>
    </List>
  </Drawer>
</template>

<style scoped>
.export-task-card {
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}

.task-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.task-title {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}

.task-summary {
  margin: 6px 0 0;
  color: #64748b;
}

.task-progress {
  margin: 12px 0 8px;
}

.task-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #64748b;
}

.task-error {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fff1f0;
  color: #cf1322;
  font-size: 12px;
}

.task-actions {
  margin-top: 12px;
}
</style>
