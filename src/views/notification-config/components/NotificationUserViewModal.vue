
<template>
  <a-modal
    v-model:visible="visible"
    :title="`已选通知人（${users.length}）`"
    width="700px"
    ok-text="保存"
    cancel-text="取消"
    @ok="handleClose"
    @cancel="handleClose"
  >
    <div v-if="loading" style="text-align:center;padding:40px 0;">
      <a-spin />
    </div>
    <div v-else>
      <div class="view-users-list">
        <span v-for="user in users" :key="user" class="view-user-item">{{ user }}</span>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const visible = ref(false);
const users = ref<string[]>([]);
const loading = ref(false);

function open(userList: string[], isLoading = false) {
  users.value = userList;
  loading.value = isLoading;
  visible.value = true;
}

function handleClose() {
  visible.value = false;
}

defineExpose({ open });
</script>

<style scoped>
.view-users-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  max-height: 320px;
  overflow-y: auto;
}
.view-user-item {
  display: inline-block;
  background: #f0f2f5;
  border-radius: 2px;
  padding: 4px 12px;
  color: #303133;
  font-size: 14px;
  margin-bottom: 6px;
}
</style>
