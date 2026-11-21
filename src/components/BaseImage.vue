<script setup lang="ts">
import { useBoardStore } from '../stores/useBoardStore';

defineProps<{
  src: string;
  size: number;
}>();

const { imageFitMode } = useBoardStore();
</script>

<template>
  <img
    :src="src"
    alt=""
    draggable="false"
    referrerpolicy="no-referrer"
    :style="{ width: size + 'px', height: size + 'px' }"
    class="block rounded shadow-sm bg-white/70"
    :class="imageFitMode === 'contain' ? 'object-contain' : 'object-cover'"
  />
</template>
