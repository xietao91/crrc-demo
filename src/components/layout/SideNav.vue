<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { menuRoutes } from '../../router/routes';

const route = useRoute();
const router = useRouter();

const selectedKeys = computed(() => [route.path]);

const menuItems = computed(() =>
  menuRoutes.map((item) => ({
    key: item.path,
    title: String(item.meta?.title ?? item.name ?? item.path),
  })),
);

function handleMenuClick({ key }: { key: string }) {
  if (key !== route.path) {
    router.push(key);
  }
}
</script>

<template>
  <a-layout-sider width="240" class="app-sider">
    <div class="sider-title">业务导航</div>
    <a-menu mode="inline" :selected-keys="selectedKeys" @click="handleMenuClick">
      <a-menu-item v-for="item in menuItems" :key="item.key">{{ item.title }}</a-menu-item>
    </a-menu>
  </a-layout-sider>
</template>

<style scoped>
.app-sider {
  background: #fff;
  border-right: 1px solid #f0f0f0;
}

.sider-title {
  padding: 16px;
  font-size: 16px;
  font-weight: 600;
  color: #1f1f1f;
}
</style>
