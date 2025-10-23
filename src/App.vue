<script setup lang="ts">
import TierBoard from './components/TierBoard.vue';
import { zhCN, dateZhCN } from 'naive-ui';
</script>

<template>
  <n-config-provider :locale="zhCN" :date-locale="dateZhCN">
    <TierBoard />
  </n-config-provider>
</template>
