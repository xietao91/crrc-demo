<script setup lang="ts">
import { ref } from 'vue';

import ParkTreePanel from './components/ParkTreePanel.vue';
import NotificationConfigTab from './components/NotificationConfigTab.vue';

const activeKey = ref('message');
const notificationTabRef = ref<InstanceType<typeof NotificationConfigTab> | null>(null);

function handleCreateRule() {
  notificationTabRef.value?.openCreateModal();
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
            <a-button size="small">删除</a-button>
            <a-button size="small">添加通知人</a-button>
          </div>
        </template>

        <a-tab-pane key="message" tab="消息通知配置">
          <NotificationConfigTab ref="notificationTabRef" />
        </a-tab-pane>

        <a-tab-pane key="other" tab="其它配置">
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
</style>
