<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { message } from 'ant-design-vue';
import { DownloadOutlined, FileTextOutlined, LineChartOutlined } from '@ant-design/icons-vue';
import { createMockExportTask, downloadMockExportTask, queryMockExportTask } from '../../mock/mock-export-server';
import { useExportTask } from '../../composables/use-export-task';
import { useExportTaskCenter } from '../../stores/export-task-center';

type DemoViewKey = 'curve' | 'station';

interface CurveExportPayload extends Record<string, unknown> {
  title: string;
  businessType: string;
  rangeLabel: string;
  durationMs: number;
  fileName: string;
  shouldFail?: boolean;
}

interface StationExportPayload extends Record<string, unknown> {
  title: string;
  businessType: string;
  stationName: string;
  deviceCount: number;
  durationMs: number;
  fileName: string;
}

const currentView = ref<DemoViewKey>('curve');
const taskCenter = useExportTaskCenter();

const curveForm = reactive({
  startDate: '2025-09-01',
  endDate: '2026-03-01',
  durationMs: 95_000,
  shouldFail: false,
});

const stationForm = reactive({
  stationName: '虹桥综合能源站',
  deviceCount: 128,
  durationMs: 55_000,
});

const mockAdapter = {
  createTask: createMockExportTask,
  queryTask: queryMockExportTask,
  downloadTask: downloadMockExportTask,
};

const curveExport = useExportTask<CurveExportPayload>({
  title: '自定义曲线报表',
  businessType: 'curve-report',
  adapter: mockAdapter,
  buildSummary: (payload) => `时间范围：${payload.rangeLabel}，预计耗时 ${Math.round(payload.durationMs / 1000)} 秒`,
});

const stationExport = useExportTask<StationExportPayload>({
  title: '站点统计报表',
  businessType: 'station-report',
  adapter: mockAdapter,
  buildSummary: (payload) =>
    `站点：${payload.stationName}，设备数：${payload.deviceCount}，预计耗时 ${Math.round(payload.durationMs / 1000)} 秒`,
});

const rangeLabel = computed(() => `${curveForm.startDate} 至 ${curveForm.endDate}`);

async function handleCurveExport() {
  await curveExport.startExport({
    title: '自定义曲线报表',
    businessType: 'curve-report',
    rangeLabel: rangeLabel.value,
    durationMs: curveForm.durationMs,
    shouldFail: curveForm.shouldFail,
    fileName: `自定义曲线报表-${curveForm.startDate}-${curveForm.endDate}.xlsx`,
  });
}

async function handleStationExport() {
  await stationExport.startExport({
    title: '站点统计报表',
    businessType: 'station-report',
    stationName: stationForm.stationName,
    deviceCount: stationForm.deviceCount,
    durationMs: stationForm.durationMs,
    fileName: `${stationForm.stationName}-统计报表.xlsx`,
  });
}

function openProgressCenter() {
  taskCenter.setDrawerVisible(true);
}

function showUsageHint() {
  message.info('切换上方视图后，右下角导出中心仍会持续展示任务进度');
}
</script>

<template>
  <div class="demo-shell">
    <header class="app-header">
      <div class="brand-block">
        <div class="brand-mark">EX</div>
        <div>
          <div class="brand-title">报表导出平台 Demo</div>
          <div class="brand-subtitle">全局导出中心只挂一次，任意页面统一查看任务</div>
        </div>
      </div>

      <div class="header-actions">
        <div class="header-status">
          <span class="status-dot" />
          <span>后台任务数 {{ taskCenter.runningCount }}</span>
        </div>
        <a-badge :count="taskCenter.runningCount" size="small">
          <a-button type="primary" @click="openProgressCenter">
            <template #icon>
              <DownloadOutlined />
            </template>
            导出中心
          </a-button>
        </a-badge>
      </div>
    </header>

    <section class="hero-panel">
      <div class="hero-copy">
        <span class="hero-tag">Vue 3 + Ant Design Vue 3.x</span>
        <h1>导出任务中心 Demo</h1>
        <p>
          演示异步导出任务、轮询进度、跨页面持续展示、任务完成下载，以及后续接真实后端时的通用接入方式。
        </p>
      </div>
      <div class="hero-actions">
        <a-button type="primary" size="large" @click="openProgressCenter">打开导出中心</a-button>
        <a-button size="large" @click="showUsageHint">查看交互说明</a-button>
      </div>
    </section>

    <section class="workspace-panel">
      <aside class="workspace-nav">
        <div class="nav-title">业务导航</div>
        <button
          class="nav-item"
          :class="{ active: currentView === 'curve' }"
          @click="currentView = 'curve'"
        >
          <LineChartOutlined />
          自定义曲线页面
        </button>
        <button
          class="nav-item"
          :class="{ active: currentView === 'station' }"
          @click="currentView = 'station'"
        >
          <FileTextOutlined />
          站点统计页面
        </button>
        <div class="nav-footnote">
          无论切到哪个页面，都可以从顶部“导出中心”或右下角入口查看任务。
        </div>
      </aside>

      <main class="workspace-content">
        <section v-if="currentView === 'curve'" class="page-card">
          <div class="page-header">
            <div>
              <div class="page-eyebrow">页面 A</div>
              <h2>自定义曲线报表导出</h2>
              <p>模拟 6 个月时间范围的大数据量导出场景，支持失败重试。</p>
            </div>
            <div class="page-tip">切换到其它页面后任务不会丢失</div>
          </div>

          <div class="form-grid">
            <label class="field">
              <span>开始日期</span>
              <input v-model="curveForm.startDate" type="date" />
            </label>
            <label class="field">
              <span>结束日期</span>
              <input v-model="curveForm.endDate" type="date" />
            </label>
            <label class="field">
              <span>模拟耗时（秒）</span>
              <input v-model.number="curveForm.durationMs" type="number" min="10000" step="5000" />
            </label>
            <label class="field checkbox-field">
              <input v-model="curveForm.shouldFail" type="checkbox" />
              <span>模拟失败任务</span>
            </label>
          </div>

          <div class="summary-panel">
            <div>当前时间范围：{{ rangeLabel }}</div>
            <div>预估执行时长：{{ Math.round(curveForm.durationMs / 1000) }} 秒</div>
          </div>

          <div class="action-row">
            <a-button type="primary" size="large" @click="handleCurveExport">发起导出任务</a-button>
            <a-button size="large" @click="openProgressCenter">查看进度</a-button>
          </div>
        </section>

        <section v-else class="page-card">
          <div class="page-header">
            <div>
              <div class="page-eyebrow">页面 B</div>
              <h2>站点统计报表导出</h2>
              <p>模拟另一个业务页面发起的导出任务，验证组件通用性。</p>
            </div>
            <div class="page-tip">同一个导出中心统一管理所有任务</div>
          </div>

          <div class="form-grid">
            <label class="field">
              <span>站点名称</span>
              <input v-model="stationForm.stationName" type="text" />
            </label>
            <label class="field">
              <span>设备数量</span>
              <input v-model.number="stationForm.deviceCount" type="number" min="1" />
            </label>
            <label class="field">
              <span>模拟耗时（秒）</span>
              <input v-model.number="stationForm.durationMs" type="number" min="10000" step="5000" />
            </label>
          </div>

          <div class="summary-panel">
            <div>站点：{{ stationForm.stationName }}</div>
            <div>设备数：{{ stationForm.deviceCount }}</div>
          </div>

          <div class="action-row">
            <a-button type="primary" size="large" @click="handleStationExport">发起导出任务</a-button>
            <a-button size="large" @click="openProgressCenter">查看进度</a-button>
          </div>
        </section>

        <section class="notes-card">
          <h3>当前实现包含的关键点</h3>
          <ul>
            <li>导出任务在全局 store 中维护，不依赖具体页面组件是否还在。</li>
            <li>任务列表和抽屉显隐状态持久化到 localStorage，刷新后仍可恢复记录。</li>
            <li>业务页面只需要通过 useExportTask 传入 create/query/download 三个接口。</li>
            <li>后续接真实后端时，只需要替换 mock adapter，不需要重写导出中心组件。</li>
          </ul>
        </section>
      </main>
    </section>
  </div>
</template>

<style scoped>
.demo-shell {
  min-height: 100vh;
  padding: 24px 32px 32px;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
  padding: 16px 20px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(12px);
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: linear-gradient(135deg, #1677ff, #13c2c2);
  color: #fff;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.brand-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.brand-subtitle {
  margin-top: 2px;
  font-size: 13px;
  color: #64748b;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 999px;
  background: #f8fafc;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #13c2c2;
}

.hero-panel {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 32px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(240, 249, 255, 0.96));
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
}

.hero-copy h1 {
  margin: 12px 0 8px;
  font-size: 38px;
  line-height: 1.1;
  color: #0f172a;
}

.hero-copy p {
  max-width: 680px;
  margin: 0;
  color: #475569;
  font-size: 15px;
}

.hero-tag {
  display: inline-flex;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(22, 119, 255, 0.12);
  color: #1677ff;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.workspace-panel {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 20px;
  margin-top: 24px;
}

.workspace-nav,
.page-card,
.notes-card {
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
}

.workspace-nav {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
  align-self: start;
}

.nav-title {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 18px;
  border: 0;
  border-radius: 16px;
  background: #eef2f7;
  color: #334155;
  font-size: 15px;
  font-weight: 600;
  text-align: left;
}

.nav-item.active {
  background: linear-gradient(135deg, #1677ff, #13c2c2);
  color: #fff;
}

.nav-footnote {
  margin-top: 8px;
  padding: 12px 14px;
  border-radius: 16px;
  background: #f8fafc;
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

.workspace-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-card,
.notes-card {
  padding: 28px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 6px 0;
  font-size: 28px;
  color: #0f172a;
}

.page-header p {
  margin: 0;
  color: #64748b;
}

.page-eyebrow {
  font-size: 12px;
  font-weight: 700;
  color: #1677ff;
  letter-spacing: 0.08em;
}

.page-tip {
  padding: 10px 14px;
  height: fit-content;
  border-radius: 999px;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #334155;
  font-size: 14px;
  font-weight: 600;
}

.field input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #dbe2ea;
  border-radius: 14px;
  background: #fff;
  color: #0f172a;
}

.checkbox-field {
  flex-direction: row;
  align-items: center;
  gap: 10px;
  align-self: end;
  min-height: 48px;
}

.checkbox-field input {
  width: 18px;
  height: 18px;
}

.summary-panel {
  display: flex;
  gap: 20px;
  margin-top: 18px;
  padding: 14px 16px;
  border-radius: 16px;
  background: #f8fafc;
  color: #475569;
  font-size: 14px;
}

.action-row {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.notes-card h3 {
  margin: 0 0 12px;
  color: #0f172a;
}

.notes-card ul {
  margin: 0;
  padding-left: 18px;
  color: #475569;
}

.notes-card li + li {
  margin-top: 8px;
}
</style>
