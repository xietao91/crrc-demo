<template>
  <div class="strategy-container">
    <div class="header-actions">
      <a-space>
        <a-button @click="clearAll">一键清除</a-button>
        <a-button type="primary" @click="handleSave">保存配置</a-button>
      </a-space>
    </div>

    <div class="scheduler-wrapper" ref="wrapperRef">
      <div class="time-axis">
        <div v-for="h in 25" :key="h" class="time-label">
          {{ String(h - 1).padStart(2, '0') }}:00
        </div>
      </div>

      <div class="grid-body">
        <div v-for="row in ROWS" :key="row.key" class="grid-row">
          <div class="row-label">{{ row.label }}</div>
          <div 
            class="row-cells" 
            @mousedown="handleRowMouseDown($event, row.key)"
          >
            <div v-for="n in TOTAL_STEPS" :key="n" class="cell-unit" :class="{ 'disabled': isCellOccupied(n-1, row.key) }"></div>

            <div
              v-for="item in segments.filter(s => s.rowKey === row.key)"
              :key="item.id"
              class="segment-block"
              :style="getSegmentStyle(item)"
              @click.stop="openSettings(item)"
            >
              <div class="resize-handle left" @mousedown.stop="startResize($event, item, 'left')"></div>
              <div class="segment-content">
                {{ formatTime(item.start) }}-{{ formatTime(item.end) }}
                <br/>
                {{ item.power }}kW
              </div>
              <div class="resize-handle right" @mousedown.stop="startResize($event, item, 'right')"></div>
              <close-circle-filled class="delete-btn" @click.stop="removeSegment(item.id)" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <a-modal v-model:visible="modalVisible" title="设置" @ok="saveSettings" destroyOnClose>
      <a-form layout="vertical">
        <a-form-item label="充放电类型">
          <a-select v-model:value="editingSegment.type">
            <a-select-option value="charge">充电</a-select-option>
            <a-select-option value="discharge">放电</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="功率 (kW)">
          <a-input-number v-model:value="editingSegment.power" :min="0" :max="1875" style="width: 100%" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { message } from 'ant-design-vue';
import { CloseCircleFilled } from '@ant-design/icons-vue';
import { ROWS, TOTAL_STEPS, STEP_MINUTES } from './rowsConfig.ts';

// --- 状态定义 ---
const segments = ref([]); // { id, rowKey, start(idx), end(idx), type, power }
const wrapperRef = ref(null);
const modalVisible = ref(false);
const editingSegment = ref({});

// --- 逻辑处理 ---

// 1. 检查某个时间格是否被【非当前行】占用
const isCellOccupied = (idx, currentRowKey) => {
  return segments.value.some(s => s.rowKey !== currentRowKey && idx >= s.start && idx < s.end);
};

// 2. 检查某段范围是否完全空闲（跨行校验）
const isRangeAvailable = (start, end, excludeId = null) => {
  if (start < 0 || end > TOTAL_STEPS) return false;
  return !segments.value.some(s => {
    if (s.id === excludeId) return false;
    // 逻辑：只要这个时间段在任何一行被占用，就返回 false
    return (start < s.end && end > s.start);
  });
};

// 3. 格式化索引为时间 01:30
const formatTime = (idx) => {
  const totalMin = idx * STEP_MINUTES;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const getSegmentStyle = (s) => {
  const row = ROWS.find(r => r.key === s.rowKey);
  return {
    left: `${(s.start / TOTAL_STEPS) * 100}%`,
    width: `${((s.end - s.start) / TOTAL_STEPS) * 100}%`,
    backgroundColor: row.color
  };
};

// --- 鼠标交互：创建 ---
const handleRowMouseDown = (e, rowKey) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const startIdx = Math.floor(((e.clientX - rect.left) / rect.width) * TOTAL_STEPS);

  if (!isRangeAvailable(startIdx, startIdx + 1)) {
    message.warning('该时段已被占用');
    return;
  }

  const newId = Date.now();
  const newSegment = {
    id: newId,
    rowKey,
    start: startIdx,
    end: startIdx + 1,
    type: 'charge',
    power: 0
  };
  segments.value.push(newSegment);
  
  // 立即进入右侧拉伸模式
  startResize(e, newSegment, 'right');
};

// --- 鼠标交互：拉伸 (Resize) ---
let currentDrag = null;

const startResize = (e, segment, direction) => {
  currentDrag = {
    segment,
    direction,
    initialStart: segment.start,
    initialEnd: segment.end,
    startX: e.clientX
  };
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
};

const handleMouseMove = (e) => {
  if (!currentDrag) return;
  const { segment, direction, startX } = currentDrag;
  const rect = wrapperRef.value.querySelector('.row-cells').getBoundingClientRect();
  const deltaIdx = Math.round(((e.clientX - startX) / rect.width) * TOTAL_STEPS);

  if (direction === 'right') {
    const newEnd = Math.max(segment.start + 1, currentDrag.initialEnd + deltaIdx);
    // 冲突检查：不能覆盖其他行
    if (isRangeAvailable(segment.start, newEnd, segment.id)) {
      segment.end = newEnd;
    }
  } else {
    const newStart = Math.min(segment.end - 1, currentDrag.initialStart + deltaIdx);
    if (isRangeAvailable(newStart, segment.end, segment.id)) {
      segment.start = newStart;
    }
  }
};

const handleMouseUp = () => {
  currentDrag = null;
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);
};

// --- 弹窗与设置 ---
const openSettings = (item) => {
  editingSegment.value = { ...item };
  modalVisible.value = true;
};

const saveSettings = () => {
  const idx = segments.value.findIndex(s => s.id === editingSegment.value.id);
  segments.value[idx] = { ...editingSegment.value };
  modalVisible.value = false;
};

const removeSegment = (id) => {
  segments.value = segments.value.filter(s => s.id !== id);
};

const clearAll = () => segments.value = [];

const handleSave = () => {
  console.log('Final Strategy:', segments.value);
  message.success('保存成功，查看控制台输出');
};
</script>

<style scoped lang="less">
.strategy-container {
  padding: 20px;
  background: #fff;
  user-select: none;
}

.header-actions {
  margin-bottom: 20px;
  text-align: right;
}

.scheduler-wrapper {
  position: relative;
  border: 1px solid #f0f0f0;
  margin-top: 40px;
}

.time-axis {
  display: flex;
  position: absolute;
  top: -30px;
  left: 80px; /* offset for label */
  right: 0;
  justify-content: space-between;
  .time-label {
    font-size: 12px;
    color: #999;
    transform: translateX(-50%);
  }
}

.grid-row {
  display: flex;
  height: 60px;
  border-bottom: 1px solid #f0f0f0;
  align-items: center;

  .row-label {
    width: 80px;
    text-align: center;
    background: #fafafa;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border-right: 1px solid #f0f0f0;
  }

  .row-cells {
    flex: 1;
    position: relative;
    height: 100%;
    display: flex;
    width: 2500px;

    .cell-unit {
      flex: 1;
      border-right: 1px dotted #eee;
      height: 100%;
      &.disabled {
        background: repeating-linear-gradient(45deg, #f5f5f5, #f5f5f5 5px, #eee 5px, #eee 10px);
        cursor: not-allowed;
      }
    }
  }
}

.segment-block {
  position: absolute;
  top: 5px;
  bottom: 5px;
  z-index: 10;
  border-radius: 4px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    .delete-btn { display: block; }
  }

  .segment-content {
    font-size: 11px;
    text-align: center;
    line-height: 1.2;
    pointer-events: none;
  }

  .resize-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 6px;
    cursor: col-resize;
    &:hover { background: rgba(0,0,0,0.1); }
    &.left { left: 0; }
    &.right { right: 0; }
  }

  .delete-btn {
    position: absolute;
    right: -8px;
    top: -8px;
    color: #ff4d4f;
    background: #fff;
    border-radius: 50%;
    display: none;
    font-size: 16px;
  }
}
</style>