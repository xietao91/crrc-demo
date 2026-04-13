<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { TreeProps } from 'ant-design-vue';

interface ParkTreeNode {
  title: string;
  key: string;
  isLeaf?: boolean;
  children?: ParkTreeNode[];
  selectable?: boolean;
  disableCheckbox?: boolean;
}

const searchKeyword = ref('');
const selectedKeys = ref<string[]>([]);
const checkedNodeKeys = ref<string[]>([]);
const expandedKeys = ref<string[]>([]);

const emit = defineEmits<{
  (e: 'update:leafCheckedKeys', keys: string[]): void;
}>();

const treeData = ref<ParkTreeNode[]>([
  {
    title: '江苏园区集群',
    key: 'park-group-1',
    selectable: false,
    disableCheckbox: false,
  },
  {
    title: '广东储能园区',
    key: 'park-group-2',
    selectable: false,
    disableCheckbox: false,
  },
  {
    title: '内蒙古风光储项目',
    key: 'park-group-3',
    selectable: false,
    disableCheckbox: false,
  },
  {
    title: '四川工业园区',
    key: 'park-group-4',
    selectable: false,
    disableCheckbox: false,
  },
]);

const allLeafKeys = computed(() => {
  return treeData.value.flatMap((root) => (root.children ?? []).map((leaf) => leaf.key));
});

const allRootKeys = computed(() => treeData.value.map((root) => root.key));

const allNodeKeys = computed(() => [...allRootKeys.value, ...allLeafKeys.value]);

const checkedLeafKeys = computed(() => {
  const leafSet = new Set(allLeafKeys.value);
  return checkedNodeKeys.value.filter((key) => leafSet.has(key));
});

watch(
  checkedLeafKeys,
  (keys) => {
    emit('update:leafCheckedKeys', keys);
  },
  { immediate: true },
);

const checkAll = computed({
  get() {
    const keys = allNodeKeys.value;
    if (keys.length === 0) return false;
    return keys.every((key) => checkedNodeKeys.value.includes(key));
  },
  set(value: boolean) {
    if (value) {
      loadAllChildren().then(() => {
        checkedNodeKeys.value = [...allNodeKeys.value];
      });
      return;
    }

    checkedNodeKeys.value = [];
  },
});

const indeterminate = computed(() => {
  const total = allNodeKeys.value.length;
  if (total === 0) return false;
  return checkedNodeKeys.value.length > 0 && checkedNodeKeys.value.length < total;
});

const filteredTreeData = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  if (!keyword) {
    return treeData.value;
  }

  return treeData.value
    .map((root) => {
      const rootMatched = root.title.toLowerCase().includes(keyword);
      const children = (root.children ?? []).filter((leaf) =>
        leaf.title.toLowerCase().includes(keyword),
      );

      if (rootMatched) {
        return {
          ...root,
          children: root.children,
        };
      }

      if (children.length > 0) {
        return {
          ...root,
          children,
        };
      }

      return null;
    })
    .filter(Boolean) as ParkTreeNode[];
});

async function fetchChildren(rootNode: ParkTreeNode): Promise<ParkTreeNode[]> {
  await new Promise((resolve) => {
    setTimeout(resolve, 400);
  });

  const samples: Record<string, string[]> = {
    'park-group-1': ['江阴电化工园储能站1站', '江阴电化工园储能站2站'],
    'park-group-2': ['深圳坪山储能园区1站', '深圳坪山储能园区2站'],
    'park-group-3': ['乌兰察布风光储项目1站', '乌兰察布风光储项目2站'],
    'park-group-4': ['成都龙泉工业园区1站', '成都龙泉工业园区2站'],
  };

  return (samples[rootNode.key] ?? []).map((title, index) => ({
    title,
    key: `${rootNode.key}-site-${index + 1}`,
    isLeaf: true,
    selectable: true,
  }));
}

async function loadAllChildren() {
  await Promise.all(treeData.value.map((node) => loadChildrenByRootKey(node.key)));
}

onMounted(() => {
  void loadAllChildren();
});

async function loadChildrenByRootKey(key: string) {
  const rootNode = treeData.value.find((node) => node.key === key);
  if (!rootNode) return;

  if (rootNode.children && rootNode.children.length > 0) return;

  const children = await fetchChildren(rootNode);
  rootNode.children = children;
}

const loadData: NonNullable<TreeProps['loadData']> = async (treeNode) => {
  await loadChildrenByRootKey(String(treeNode.key));
};

function onSelect(keys: string[], info: { node: ParkTreeNode }) {
  if (!info.node.isLeaf) {
    return;
  }
  selectedKeys.value = keys;
}

function normalizeCheckedKeys(keys: string[] | { checked: string[] }) {
  if (Array.isArray(keys)) {
    return keys.map((key) => String(key));
  }

  return keys.checked.map((key) => String(key));
}

async function onCheck(
  keys: string[] | { checked: string[] },
  info?: { node: ParkTreeNode; checked?: boolean },
) {
  let nextKeys = normalizeCheckedKeys(keys);

  if (!info || info.node.isLeaf) {
    checkedNodeKeys.value = nextKeys;
    return;
  }

  const rootKey = info.node.key;
  await loadChildrenByRootKey(rootKey);

  const rootNode = treeData.value.find((node) => node.key === rootKey);
  const childKeys = (rootNode?.children ?? []).map((child) => child.key);

  if (info.checked) {
    nextKeys = Array.from(new Set([...nextKeys, ...childKeys]));
  } else {
    nextKeys = nextKeys.filter((key) => !childKeys.includes(key));
  }

  checkedNodeKeys.value = nextKeys;
}

function onExpand(keys: string[]) {
  expandedKeys.value = keys;
}
</script>

<template>
  <section class="tree-panel">
    <header class="tree-header">
      <a-checkbox v-model:checked="checkAll" :indeterminate="indeterminate">园区列表</a-checkbox>
    </header>

    <div class="tree-search">
      <a-input v-model:value="searchKeyword" placeholder="请输入关键词">
        <template #suffix>
          <span class="search-icon">🔍</span>
        </template>
      </a-input>
    </div>

    <a-tree
      :tree-data="filteredTreeData"
      :load-data="loadData"
      checkable
      :checked-keys="checkedNodeKeys"
      :selected-keys="selectedKeys"
      :expanded-keys="expandedKeys"
      @check="onCheck"
      @select="onSelect"
      @expand="onExpand"
    />
  </section>
</template>

<style scoped>
.tree-panel {
  height: 100%;
  padding: 12px;
  border-right: 1px solid #f0f0f0;
  background: #fff;
}

.tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px 12px;
  border-bottom: 1px solid #f0f0f0;
}

.tree-search {
  margin: 12px 0;
}

.search-icon {
  color: #8c8c8c;
  font-size: 12px;
}
</style>
