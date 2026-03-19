<template>
    <div class="main">
        <div id="meta2d"></div>
    </div>
</template>
<script setup lang="ts">
import { Meta2d } from '@meta2d/core';
import { flowPens } from '@meta2d/flow-diagram';
import { activityDiagram } from '@meta2d/activity-diagram';
import { classPens } from '@meta2d/class-diagram';
import { sequencePens, sequencePensbyCtx } from '@meta2d/sequence-diagram';
import { onMounted, onUnmounted, ref } from 'vue';
import { formPens } from '@meta2d/form-diagram';

declare const window: any;
declare const meta2d: Meta2d;

const contextMenuVisible = ref(false);

const contextmenu = () => {
    contextMenuVisible.value = true;
};

const click = () => {
    contextMenuVisible.value = false;
};

onMounted(() => {
    const meta2dOptions = {};
    new Meta2d('meta2d', meta2dOptions);
    meta2d.register(flowPens());
    meta2d.register(activityDiagram());
    meta2d.register(classPens());
    meta2d.register(sequencePens());
    meta2d.registerCanvasDraw(sequencePensbyCtx());
    meta2d.registerCanvasDraw(formPens());
    // 监听消息事件
    meta2d.on('contextmenu', contextmenu);
    meta2d.on('click', click);
    // 打开文件
    // meta2d.open();
});

onUnmounted(() => {
    if (meta2d) {
        meta2d.off('contextmenu', contextmenu);
        meta2d.off('click', click);
        meta2d.destroy();
    }
});
</script>

<style lang="less">
    .main {
        width: 100vw;
        height: 100vh;
        #meta2d {
            width: 100%;
            height: 100%;
        }
    }
</style>