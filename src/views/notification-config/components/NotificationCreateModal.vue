<script setup lang="ts">
import { computed, ref } from 'vue';
import { message } from 'ant-design-vue';

type ConditionLabel =
  | '单体电压'
  | '单体温度'
  | '日充电量'
  | '日放电量'
  | '日充放电量效率'
  | '用户侧负荷率'
  | '关键数据未上送';
type ConditionOperator = '大于' | '大于或等于' | '小于' | '小于或等于' | '等于';
type ConditionUnit = 'V' | '℃' | 'kWh' | 'kw' | '%';
type DurationUnit = '秒' | '分钟' | '小时';
type NotifyFrequency = '6小时1次' | '12小时1次' | 'custom';
type ChannelLabel = '云平台' | '储能云APP' | '桩所APP' | '短信';

interface NotifyChannelConfig {
  label: ChannelLabel;
  enabled: boolean;
}

export interface CreateRulePayload {
  pushEnabled: boolean;
  name: string;
  conditionLabel: ConditionLabel;
  conditionOperator: ConditionOperator;
  conditionThreshold: string;
  conditionUnit: ConditionUnit;
  durationValue: string;
  durationUnit: DurationUnit;
  channels: NotifyChannelConfig[];
  frequency: NotifyFrequency;
  customFrequencyHours: string;
}

interface CreateRuleForm {
  pushEnabled: boolean;
  name: string;
  conditionLabel: ConditionLabel;
  conditionOperator?: ConditionOperator;
  conditionThreshold: string;
  conditionUnit?: ConditionUnit;
  durationValue: string;
  durationUnit?: DurationUnit;
  channels: NotifyChannelConfig[];
  frequency: NotifyFrequency;
  customFrequencyHours: string;
}

const props = defineProps<{
  existingNames: string[];
}>();

const emit = defineEmits<{
  (e: 'save', payload: CreateRulePayload): void;
}>();

const conditionLabelOptions: ConditionLabel[] = [
  '单体电压',
  '单体温度',
  '日充电量',
  '日放电量',
  '日充放电量效率',
  '用户侧负荷率',
  '关键数据未上送',
];
const conditionOperatorOptions: ConditionOperator[] = ['大于', '大于或等于', '小于', '小于或等于', '等于'];
const conditionUnitOptions: ConditionUnit[] = ['V', '℃', 'kWh', 'kw', '%'];
const durationUnitOptions: DurationUnit[] = ['秒', '分钟', '小时'];
const labelUnitMap: Record<ConditionLabel, ConditionUnit[]> = {
  单体电压: ['V'],
  单体温度: ['℃'],
  日充电量: ['kWh'],
  日放电量: ['kWh'],
  日充放电量效率: ['%'],
  用户侧负荷率: ['%'],
  关键数据未上送: ['kw'],
};

const visible = ref(false);
const form = ref<CreateRuleForm>(createDefaultForm());
const currentConditionUnitOptions = computed(() => {
  return labelUnitMap[form.value.conditionLabel] ?? conditionUnitOptions;
});

function createDefaultChannels(): NotifyChannelConfig[] {
  return [
    { label: '云平台', enabled: true },
    { label: '储能云APP', enabled: true },
    { label: '桩所APP', enabled: true },
    { label: '短信', enabled: true },
  ];
}

function createDefaultForm(): CreateRuleForm {
  return {
    pushEnabled: true,
    name: '',
    conditionLabel: '单体电压',
    conditionOperator: undefined,
    conditionThreshold: '',
    conditionUnit: 'V',
    durationValue: '',
    durationUnit: undefined,
    channels: createDefaultChannels(),
    frequency: '6小时1次',
    customFrequencyHours: '',
  };
}

function handleConditionLabelChange(label: ConditionLabel) {
  const units = labelUnitMap[label] ?? conditionUnitOptions;
  if (!form.value.conditionUnit || !units.includes(form.value.conditionUnit)) {
    form.value.conditionUnit = units[0];
  }
}

function open() {
  form.value = createDefaultForm();
  visible.value = true;
}

function handleCancel() {
  visible.value = false;
  form.value = createDefaultForm();
}

function validate(currentForm: CreateRuleForm): string | null {
  if (!currentForm.name) return '请输入告警名称';
  if (props.existingNames.some((name) => name === currentForm.name)) return '告警名称已存在';
  if (!currentForm.conditionOperator) return '请选择判断条件';
  if (!currentForm.conditionThreshold) return '请输入数值';
  if (!currentForm.conditionUnit) return '请选择单位';

  const allowedUnits = labelUnitMap[currentForm.conditionLabel] ?? conditionUnitOptions;
  if (!allowedUnits.includes(currentForm.conditionUnit)) return '单位与条件项不匹配';

  if (!currentForm.durationValue) return '请输入持续时长';
  if (!currentForm.durationUnit) return '请选择持续时长单位';

  if (currentForm.frequency === 'custom') {
    if (!currentForm.customFrequencyHours) return '请输入推送频率';
    const hours = Number(currentForm.customFrequencyHours);
    if (!Number.isFinite(hours) || hours <= 0) return '请输入大于 0 的小时数';
  }

  return null;
}

function handleSave() {
  const currentForm = form.value;
  const error = validate(currentForm);

  if (error) {
    message.warning(error);
    return;
  }

  emit('save', {
    pushEnabled: currentForm.pushEnabled,
    name: currentForm.name,
    conditionLabel: currentForm.conditionLabel,
    conditionOperator: currentForm.conditionOperator as ConditionOperator,
    conditionThreshold: currentForm.conditionThreshold,
    conditionUnit: currentForm.conditionUnit as ConditionUnit,
    durationValue: currentForm.durationValue,
    durationUnit: currentForm.durationUnit as DurationUnit,
    channels: currentForm.channels.map((channel) => ({ ...channel })),
    frequency: currentForm.frequency,
    customFrequencyHours: currentForm.frequency === 'custom' ? currentForm.customFrequencyHours : '',
  });

  visible.value = false;
  form.value = createDefaultForm();
}

defineExpose({
  open,
});
</script>

<template>
  <a-modal
    v-model:visible="visible"
    title="新增"
    width="980px"
    :footer="null"
    @cancel="handleCancel"
    destroyOnClose
  >
    <section class="create-form">
      <div class="create-row">
        <a-switch v-model:checked="form.pushEnabled" />
        <a-input v-model:value="form.name" placeholder="请输入告警名称" style="width: 220px" />
      </div>

      <div class="create-row">
        <a-select v-model:value="form.conditionLabel" style="width: 150px" @change="handleConditionLabelChange">
          <a-select-option v-for="option in conditionLabelOptions" :key="option" :value="option">
            {{ option }}
          </a-select-option>
        </a-select>

        <a-select v-model:value="form.conditionOperator" placeholder="判断条件" style="width: 130px">
          <a-select-option v-for="option in conditionOperatorOptions" :key="option" :value="option">
            {{ option }}
          </a-select-option>
        </a-select>

        <a-input v-model:value="form.conditionThreshold" placeholder="数值" style="width: 90px" />

        <a-select v-model:value="form.conditionUnit" placeholder="单位" style="width: 100px">
          <a-select-option v-for="unit in currentConditionUnitOptions" :key="unit" :value="unit">
            {{ unit }}
          </a-select-option>
        </a-select>

        <span>持续</span>

        <a-input v-model:value="form.durationValue" placeholder="数值" style="width: 90px" />

        <a-select v-model:value="form.durationUnit" placeholder="单位" style="width: 100px">
          <a-select-option v-for="unit in durationUnitOptions" :key="unit" :value="unit">
            {{ unit }}
          </a-select-option>
        </a-select>

        <span>则告警</span>
      </div>

      <div class="create-row channel-row">
        <span>是否告警推送</span>
        <div v-for="channel in form.channels" :key="channel.label" class="channel-toggle-item">
          <a-switch v-model:checked="channel.enabled" size="small" />
          <span>{{ channel.label }}</span>
        </div>
      </div>

      <div class="create-row frequency-row">
        <span>推送频率</span>
        <a-radio-group v-model:value="form.frequency">
          <a-radio value="6小时1次">6小时1次</a-radio>
          <a-radio value="12小时1次">12小时1次</a-radio>
          <a-radio value="custom">请输入</a-radio>
        </a-radio-group>
        <a-input
          v-model:value="form.customFrequencyHours"
          placeholder="请输入"
          style="width: 90px"
          :disabled="form.frequency !== 'custom'"
          @focus="form.frequency = 'custom'"
        />
        <span>小时1次</span>
      </div>
    </section>

    <div class="create-footer">
      <a-space>
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" @click="handleSave">保存</a-button>
      </a-space>
    </div>
  </a-modal>
</template>

<style scoped>
.create-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 220px;
}

.create-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.channel-row {
  gap: 18px;
}

.channel-toggle-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.frequency-row {
  gap: 12px;
}

.create-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 26px;
}

@media (max-width: 1200px) {
  .create-row {
    gap: 8px;
  }
}
</style>