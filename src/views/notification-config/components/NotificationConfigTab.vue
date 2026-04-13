<script setup lang="ts">
import { computed, ref } from 'vue';
import { message } from 'ant-design-vue';
import NotificationCreateModal from './NotificationCreateModal.vue';
import type { CreateRulePayload } from './NotificationCreateModal.vue';

type ConditionOperator = '大于' | '大于或等于' | '小于' | '小于或等于' | '等于';
type NotifyFrequency = '6小时1次' | '12小时1次' | 'custom';
type ChannelLabel = '云平台' | '储能云APP' | '桩所APP' | '短信';

interface NotifyChannelConfig {
  label: ChannelLabel;
  enabled: boolean;
}

interface NotifyRuleConfig {
  id: string;
  name: string;
  enabled: boolean;
  conditionLabel: string;
  conditionOperator: ConditionOperator;
  conditionValue: string;
  frequency: NotifyFrequency;
  customFrequencyHours: string;
  channels: NotifyChannelConfig[];
  notifyUsers: number;
}

const conditionOperatorOptions: ConditionOperator[] = ['大于', '大于或等于', '小于', '小于或等于', '等于'];

const ruleConfigs = ref<NotifyRuleConfig[]>([
  {
    id: 'rule-1',
    name: '单体电压异常',
    enabled: true,
    conditionLabel: '单体电压',
    conditionOperator: '小于或等于',
    conditionValue: '2.7 V，持续 1 分钟',
    frequency: '6小时1次',
    customFrequencyHours: '',
    channels: [
      { label: '云平台', enabled: true },
      { label: '储能云APP', enabled: true },
      { label: '桩所APP', enabled: true },
      { label: '短信', enabled: true },
    ],
    notifyUsers: 17,
  },
  {
    id: 'rule-2',
    name: '单体温度异常',
    enabled: true,
    conditionLabel: '单体温度',
    conditionOperator: '大于或等于',
    conditionValue: '45 C，持续 3 秒',
    frequency: '6小时1次',
    customFrequencyHours: '',
    channels: [
      { label: '云平台', enabled: true },
      { label: '储能云APP', enabled: true },
      { label: '桩所APP', enabled: true },
      { label: '短信', enabled: true },
    ],
    notifyUsers: 17,
  },
  {
    id: 'rule-3',
    name: '设备掉线',
    enabled: true,
    conditionLabel: '检测心跳（bms/pcs/冷机/消防/ems/电表等）',
    conditionOperator: '等于',
    conditionValue: '20 分钟无数据传输',
    frequency: '6小时1次',
    customFrequencyHours: '',
    channels: [
      { label: '云平台', enabled: true },
      { label: '储能云APP', enabled: true },
      { label: '桩所APP', enabled: true },
      { label: '短信', enabled: true },
    ],
    notifyUsers: 17,
  },
]);

const selectedRuleIds = ref<string[]>([]);
const createModalRef = ref<InstanceType<typeof NotificationCreateModal> | null>(null);
const deleteConfirmVisible = ref(false);

const allSelected = computed({
  get: () => ruleConfigs.value.length > 0 && selectedRuleIds.value.length === ruleConfigs.value.length,
  set: (value: boolean) => {
    selectedRuleIds.value = value ? ruleConfigs.value.map((item) => item.id) : [];
  },
});

const indeterminate = computed(() => {
  return selectedRuleIds.value.length > 0 && selectedRuleIds.value.length < ruleConfigs.value.length;
});

function toggleRule(id: string, checked: boolean) {
  if (checked) {
    if (!selectedRuleIds.value.includes(id)) {
      selectedRuleIds.value.push(id);
    }
    return;
  }

  selectedRuleIds.value = selectedRuleIds.value.filter((item) => item !== id);
}

function openCreateModal() {
  createModalRef.value?.open();
}

function requestDeleteSelectedRules() {
  if (selectedRuleIds.value.length === 0) {
    message.warning('请先选择要删除的配置项');
    return;
  }

  const selectedRules = ruleConfigs.value.filter((item) => selectedRuleIds.value.includes(item.id));
  const hasEnabledRule = selectedRules.some((item) => item.enabled);

  if (hasEnabledRule) {
    message.warning('选择的配置存在打开的，不能删除');
    return;
  }

  deleteConfirmVisible.value = true;
}

function handleDeleteConfirm() {
  const selectedIdSet = new Set(selectedRuleIds.value);
  ruleConfigs.value = ruleConfigs.value.filter((item) => !selectedIdSet.has(item.id));
  selectedRuleIds.value = [];
  deleteConfirmVisible.value = false;
  message.success('删除成功');
}

function handleDeleteCancel() {
  deleteConfirmVisible.value = false;
}

function getConditionText(form: CreateRulePayload): string {
  return `${form.conditionThreshold} ${form.conditionUnit}，持续 ${form.durationValue} ${form.durationUnit}`;
}

function handleCreateSave(form: CreateRulePayload) {
  const newRule: NotifyRuleConfig = {
    id: `rule-${Date.now()}`,
    name: form.name,
    enabled: form.pushEnabled,
    conditionLabel: form.conditionLabel,
    conditionOperator: form.conditionOperator as ConditionOperator,
    conditionValue: getConditionText(form),
    frequency: form.frequency,
    customFrequencyHours: form.frequency === 'custom' ? form.customFrequencyHours : '',
    channels: form.channels.map((channel) => ({
      label: channel.label,
      enabled: channel.enabled,
    })),
    notifyUsers: 0,
  };

  ruleConfigs.value.push(newRule);
  message.success('新增成功');
}

defineExpose({
  openCreateModal,
  requestDeleteSelectedRules,
});
</script>

<template>
  <section class="notify-tab">
    <header class="notify-toolbar">
      <span class="toolbar-title">已新增通知</span>
      <div class="select-all-wrap">
        <span>全选</span>
        <a-checkbox v-model:checked="allSelected" :indeterminate="indeterminate" />
      </div>
    </header>

    <div class="rule-list">
      <article v-for="rule in ruleConfigs" :key="rule.id" class="rule-card">
        <a-checkbox
          class="rule-check"
          :checked="selectedRuleIds.includes(rule.id)"
          @update:checked="(checked: boolean) => toggleRule(rule.id, checked)"
        />

        <div class="rule-left">
          <a-switch v-model:checked="rule.enabled" />
          <span class="rule-name">{{ rule.name }}</span>
        </div>

        <div class="rule-main">
          <div class="rule-row first-row">
            <div class="rule-condition">
              <span class="label">触发条件</span>
              <span>{{ rule.conditionLabel }}</span>
              <a-select v-model:value="rule.conditionOperator" size="small" style="width: 120px">
                <a-select-option v-for="option in conditionOperatorOptions" :key="option" :value="option">
                  {{ option }}
                </a-select-option>
              </a-select>
              <a-input v-model:value="rule.conditionValue" size="small" style="width: 220px" />
            </div>
          </div>

          <div class="rule-row">
            <span class="label">告警推送渠道</span>
            <div class="channel-list">
              <div v-for="channel in rule.channels" :key="`${rule.id}-${channel.label}`" class="channel-item">
                <a-switch v-model:checked="channel.enabled" size="small" />
                <span class="channel-label">{{ channel.label }}</span>
              </div>
            </div>
          </div>

          <div class="rule-row">
            <span class="label">推送频率</span>
            <div class="frequency-group">
              <a-radio-group v-model:value="rule.frequency">
                <a-radio value="6小时1次">6小时1次</a-radio>
                <a-radio value="12小时1次">12小时1次</a-radio>
                <a-radio value="custom">请输入</a-radio>
              </a-radio-group>
              <a-input
                v-model:value="rule.customFrequencyHours"
                size="small"
                style="width: 88px"
                placeholder="请输入"
                :disabled="rule.frequency !== 'custom'"
                @focus="rule.frequency = 'custom'"
              />
              <span>小时1次</span>
            </div>
          </div>

          <footer class="rule-footer">
            <span>通知人（{{ rule.notifyUsers }}）</span>
            <a-space>
              <a-button type="link" size="small">添加</a-button>
              <a-button type="link" size="small">查看</a-button>
            </a-space>
          </footer>
        </div>
      </article>
    </div>

    <NotificationCreateModal
      ref="createModalRef"
      :existing-names="ruleConfigs.map((item) => item.name)"
      @save="handleCreateSave"
    />

    <a-modal
      v-model:visible="deleteConfirmVisible"
      title="删除配置"
      ok-text="确认"
      cancel-text="取消"
      @ok="handleDeleteConfirm"
      @cancel="handleDeleteCancel"
    >
      <p class="delete-confirm-text">确认删除所选告警配置项？</p>
    </a-modal>
  </section>
</template>

<style scoped>
.notify-tab {
  background: #fff;
}

.notify-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.toolbar-title {
  font-weight: 500;
  color: #303133;
}

.select-all-wrap {
  display: flex;
  gap: 8px;
  align-items: center;
}

.rule-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rule-card {
  position: relative;
  display: grid;
  grid-template-columns: 170px 1fr;
  gap: 20px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: #f7f9fc;
}

.rule-check {
  position: absolute;
  top: 12px;
  right: 12px;
}

.rule-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 100%;
}

.rule-name {
  color: #303133;
  font-weight: 500;
}

.rule-main {
  min-width: 0;
  padding-right: 28px;
}

.rule-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 10px;
}

.first-row {
  justify-content: flex-start;
}

.rule-condition {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  color: #595959;
}

.channel-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 18px;
}

.channel-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.channel-label {
  color: #595959;
}

.frequency-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rule-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
  color: #595959;
}

.delete-confirm-text {
  margin: 20px 0;
  text-align: center;
}

@media (max-width: 1200px) {
  .rule-card {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .rule-main {
    padding-right: 0;
  }
}
</style>
