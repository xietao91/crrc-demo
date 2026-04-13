import type { RouteRecordRaw } from 'vue-router';

import ExportDemoPage from '../views/demo/ExportDemoPage.vue';
import ExportProgressCenter from '../views/export-center/ExportProgressCenter.vue';
import Scheduler from '../views/ChargingStrategyScheduler/Scheduler.vue';
import NotificationConfigPage from '../views/notification-config/NotificationConfigPage.vue';

export const appRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/demo',
  },
  {
    path: '/demo',
    name: 'demo',
    component: ExportDemoPage,
    meta: {
      title: '导出 Demo',
      showInMenu: true,
    },
  },
  {
    path: '/export-center',
    name: 'export-center',
    component: ExportProgressCenter,
    meta: {
      title: '导出中心',
      showInMenu: true,
    },
  },
  {
    path: '/charging-strategy-scheduler',
    name: 'charging-strategy-scheduler',
    component: Scheduler,
    meta: {
      title: '充放电策略调度',
      showInMenu: true,
    },
  },
  {
    path: '/notification-config',
    name: 'notification-config',
    component: NotificationConfigPage,
    meta: {
      title: '通知配置',
      showInMenu: true,
    },
  },
];

export const menuRoutes = appRoutes.filter((route) => Boolean(route.meta?.showInMenu));
