<script setup lang="ts">
import { ref } from "vue";
import {
  BellOutlined,
  SettingOutlined,
  PlusOutlined,
  DeleteOutlined,
} from "@ant-design/icons-vue";

import ParkTreePanel from "./components/ParkTreePanel.vue";
import NotificationConfigTab from "./components/NotificationConfigTab.vue";

const activeKey = ref("message");
const notificationTabRef = ref<InstanceType<
  typeof NotificationConfigTab
> | null>(null);

function handleCreateRule() {
  notificationTabRef.value?.openCreateModal();
}

function handleDeleteRule() {
  notificationTabRef.value?.requestDeleteSelectedRules();
}
</script>

<template>
  <div class="notification-page">
    <aside class="left-panel">
      <ParkTreePanel />
    </aside>

    <section class="right-panel">
      <a-tabs v-model:activeKey="activeKey">
        <template #rightExtra>
          <div v-if="activeKey === 'message'" class="tab-actions">
            <a-button type="primary" @click="handleCreateRule">
              <template #icon>
                <PlusOutlined />
              </template>
              新增</a-button
            >
            <a-button @click="handleDeleteRule"> 
              <template #icon>
                <DeleteOutlined />
              </template>
              删除</a-button
            >
            <a-button>
              <template #icon>
                <PlusOutlined />
              </template>
              添加通知人</a-button
            >
          </div>
        </template>

        <a-tab-pane key="message">
          <template #tab>
            <span class="tab-label">
              <BellOutlined style="margin-right: 6px" />
              <span>消息通知配置</span>
            </span>
          </template>
          <NotificationConfigTab ref="notificationTabRef" />
        </a-tab-pane>

        <a-tab-pane key="other">
          <template #tab>
            <span class="tab-label">
              <SettingOutlined />
              <span>其它配置</span>
            </span>
          </template>
          <a-empty description="其它配置功能开发中" />
        </a-tab-pane>
      </a-tabs>
    </section>
  </div>
</template>

<style scoped>
.notification-page {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 0;
  height: calc(100vh - 64px);
  padding: 12px;
}

.left-panel,
.right-panel {
  min-height: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
}

.left-panel {
  border-right: none;
  border-radius: 4px 0 0 4px;
}

.right-panel {
  overflow: auto;
  border-radius: 0 4px 4px 0;
}

.tab-actions {
  display: flex;
  gap: 12px;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.right-panel :deep(.ant-tabs-nav) {
  height: 55px;
  margin-bottom: 0;
  padding: 0 16px;
  display: flex;
  align-items: stretch;
}

.right-panel :deep(.ant-tabs-nav::before) {
  border-bottom: 1px solid #f0f0f0;
}

.right-panel :deep(.ant-tabs-nav-wrap) {
  min-height: 100%;
}

.right-panel :deep(.ant-tabs-nav-wrap),
.right-panel :deep(.ant-tabs-extra-content) {
  display: flex;
  align-items: center;
}

.right-panel :deep(.ant-tabs-nav-list) {
  height: 100%;
}

.right-panel :deep(.ant-tabs-tab) {
  height: 100%;
  display: flex;
  align-items: center;
}

.right-panel :deep(.ant-tabs-content-holder) {
  padding: 16px;
}
</style>
