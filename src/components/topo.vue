<template>
  <div class="topology-wrapper">
    <div class="header-actions">
      <a-space>
        <a-button type="primary" @click="handleFit">自适应视图</a-button>
        <a-badge status="processing" text="实时数据监测中" />
      </a-space>
    </div>
    <div id="graph-container" ref="containerRef"></div>
  </div>
</template>

<script setup>
import { onMounted, ref, inject, computed } from 'vue';
import { Graph } from '@antv/x6';
import { register } from '@antv/x6-vue-shape';
import { DagreLayout } from '@antv/layout';

/**
 * 1. 定义 Vue 节点组件 (兼容 Ant Design Vue 3)
 */
const EnergyCard = {
  template: `
    <div class="node-card">
      <div class="node-header">
        <span class="node-title">{{ data.name }}</span>
        <div class="status-tag">运行中</div>
      </div>
      <div class="node-content">
        <div class="data-row">
          <span class="label">有功功率</span>
          <span class="value">{{ data.power }} kW</span>
        </div>
        <div class="data-row">
          <span class="label">SOC</span>
          <span class="value">{{ data.soc }}%</span>
        </div>
        <div class="soc-progress">
          <div class="progress-inner" :style="{ width: data.soc + '%', backgroundColor: data.soc < 20 ? '#ff4d4f' : '#1890ff' }"></div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const getNode = inject('getNode');
    const node = getNode();
    const data = computed(() => node.getData());
    return { data };
  }
};

// 注册节点
register({
  shape: 'energy-node',
  width: 170,
  height: 110,
  component: EnergyCard,
  ports: {
    groups: {
      top: { position: 'top', attrs: { circle: { r: 0, magnet: true } } },
      bottom: { position: 'bottom', attrs: { circle: { r: 0, magnet: true } } }
    },
    items: [{ id: 'in', group: 'top' }, { id: 'out', group: 'bottom' }]
  }
});

/**
 * 2. 画布与布局逻辑
 */
const containerRef = ref(null);
let graph = null;

// 模拟层级数据
const initialData = {
  nodes: [
    { id: 'root', shape: 'energy-node', data: { name: 'DTSD1352(总)', power: 797, soc: 69 } },
    { id: 'c1', shape: 'energy-node', data: { name: '200CS-101', power: 45.6, soc: 71 } },
    { id: 'c2', shape: 'energy-node', data: { name: '200CS-102', power: 46.5, soc: 73 } },
    { id: 'c3', shape: 'energy-node', data: { name: '200CS-103', power: 55.1, soc: 67 } },
  ],
  edges: [
    { source: { cell: 'root', port: 'out' }, target: { cell: 'c1', port: 'in' } },
    { source: { cell: 'root', port: 'out' }, target: { cell: 'c2', port: 'in' } },
    { source: { cell: 'root', port: 'out' }, target: { cell: 'c3', port: 'in' } },
  ]
};

onMounted(async () => {
  // A. 初始化画布
  graph = new Graph({
    container: containerRef.value,
    autoResize: true,
    panning: true,
    mousewheel: { enabled: true, modifiers: ['ctrl'] },
    connecting: {
      router: { name: 'er', args: { offset: 32, direction: 'V' } }, // 垂直直角路由
      connector: { name: 'rounded', args: { radius: 4 } },
      style: { stroke: '#8c8c8c', strokeWidth: 1.5 }
    }
  });

  // B. 处理布局 (重点修复：使用 execute + await)
  try {
    const dagre = new DagreLayout({
      type: 'dagre',
      rankdir: 'TB',
      nodesep: 50,
      ranksep: 80,
      controlPoints: true
    });

    // 1.x-beta 版本中 execute 返回一个 Promise，解析后包含坐标信息
    const layoutModel = await dagre.execute(initialData);
    
    // C. 渲染数据
    graph.fromJSON(layoutModel);
    graph.centerContent();
  } catch (err) {
    console.error('Dagre layout failed:', err);
    // 降级处理：直接显示
    graph.fromJSON(initialData);
  }

  // D. 启动实时数据模拟
  startRealtimeSimulation();
});

const startRealtimeSimulation = () => {
  setInterval(() => {
    graph.getNodes().forEach(node => {
      const current = node.getData();
      node.setData({
        power: (Math.random() * 60 + 20).toFixed(1),
        soc: Math.max(0, Math.min(100, current.soc + (Math.random() > 0.5 ? 1 : -1)))
      });
    });
  }, 3000);
};

const handleFit = () => graph.zoomToFit({ padding: 40 });
</script>

<style scoped>
.topology-wrapper {
  width: 1000px;
  height: 700px;
  background-color: #f5f7fa;
  position: relative;
}
.header-actions {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 100;
  background: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}
#graph-container {
  width: 100%;
  height: 100%;
}

/* 节点内部 UI 样式 */
:deep(.node-card) {
  width: 100%;
  height: 100%;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 6px rgba(0,0,0,0.04);
}
:deep(.node-header) {
  padding: 4px 8px;
  background: #fafafa;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
:deep(.node-title) {
  font-size: 11px;
  font-weight: 600;
  color: #303133;
}
:deep(.status-tag) {
  font-size: 9px;
  color: #67c23a;
  background: #f0f9eb;
  padding: 0 4px;
  border-radius: 2px;
}
:deep(.node-content) {
  padding: 8px;
  flex: 1;
}
:deep(.data-row) {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  margin-bottom: 4px;
}
:deep(.label) { color: #909399; }
:deep(.value) { color: #303133; font-weight: 500; }
:deep(.soc-progress) {
  margin-top: 8px;
  height: 4px;
  background: #ebeef5;
  border-radius: 2px;
  overflow: hidden;
}
:deep(.progress-inner) {
  height: 100%;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>