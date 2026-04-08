<script setup lang="ts">
import SideNav from './components/layout/SideNav.vue';
</script>

<template>
  <a-layout class="app-layout">
    <SideNav />

    <a-layout>
      <a-layout-header class="app-header">Vue3 业务路由示例</a-layout-header>
      <a-layout-content class="app-content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
}

.app-header {
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  font-size: 18px;
  font-weight: 600;
  color: #1f1f1f;
}

.app-content {
  margin: 0;
  background: #f5f7fa;
}
</style>
