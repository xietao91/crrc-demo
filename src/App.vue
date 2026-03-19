<script setup>
// import HelloWorld from './components/HelloWorld.vue'
// import Map from './components/Map.vue'
// import ChargingStrategyScheduler from './components/ChargingStrategyScheduler/Scheduler.vue'
// import Topo from './components/topo.vue'
import Topo from './components/le5le.vue';
</script>

<template>
  <div>
    <!-- <Map /> -->
     <!-- <ChargingStrategyScheduler /> -->
      <Topo />
  </div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}

.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
