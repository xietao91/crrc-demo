<script setup lang="ts">
import { ref } from 'vue';
import { BellOutlined, SettingOutlined } from '@ant-design/icons-vue';

import ParkTreePanel from './components/ParkTreePanel.vue';
import NotificationConfigTab from './components/NotificationConfigTab.vue';

const activeKey = ref('message');
const notificationTabRef = ref<InstanceType<typeof NotificationConfigTab> | null>(null);

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
            <a-button type="primary" size="small" @click="handleCreateRule">+ 新增</a-button>
            <a-button size="small" @click="handleDeleteRule">删除</a-button>
            <a-button size="small">添加通知人</a-button>
          </div>
        </template>

        <a-tab-pane key="message">
          <template #tab>
            <span class="tab-label">
              <BellOutlined style="margin-right: 6px ;" />
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
  gap: 12px;
  height: calc(100vh - 64px);
  padding: 12px;
}

.left-panel,
.right-panel {
  min-height: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
}

.right-panel {
  padding: 12px;
  overflow: auto;
}

.tab-actions {
  display: flex;
  gap: 8px;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>
