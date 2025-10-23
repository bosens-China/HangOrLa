<script setup lang="ts">
import { computed, ref } from 'vue';
import { useBoardStore } from '../stores/useBoardStore';
import BaseImage from './BaseImage.vue';
import { useEventListener } from '@vueuse/core';

const props = defineProps<{
  id: string;
  src: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
}>();

const emit = defineEmits<{
  (e: 'update:pos', id: string, x: number, y: number): void;
}>();

const { tiers, defaultRowHeightPx, defaultLabelWidthPx, deleteImage } =
  useBoardStore();

const imageStyle = computed(() => ({
  left: props.x + defaultLabelWidthPx.value + 'px',
  top: props.y + 'px',
}));

const dragging = ref(false);
let startX = 0;
let startY = 0;
let baseX = 0;
let baseY = 0;

let stopMoveListener: (() => void) | null = null;
let stopUpListener: (() => void) | null = null;

function onDown(e: MouseEvent) {
  dragging.value = true;
  startX = e.clientX;
  startY = e.clientY;
  baseX = props.x;
  baseY = props.y;
  stopMoveListener = useEventListener(window, 'mousemove', onMove);
  stopUpListener = useEventListener(window, 'mouseup', onUp);
}
function onMove(e: MouseEvent) {
  if (!dragging.value) return;

  // X-axis boundaries (left)
  const nx = Math.max(0, baseX + (e.clientX - startX));

  // Y-axis boundaries (top and bottom)
  const topBoundary = 0;
  const totalRowHeight = tiers.value.length * defaultRowHeightPx.value;
  const bottomBoundary = totalRowHeight - (props.h || 0);
  let ny = baseY + (e.clientY - startY);
  ny = Math.max(topBoundary, ny);
  ny = Math.min(bottomBoundary, ny);

  emit('update:pos', props.id, nx, ny);
}
function onUp() {
  dragging.value = false;
  stopMoveListener?.();
  stopUpListener?.();
}
</script>

<template>
  <div
    class="absolute select-none cursor-move"
    :style="imageStyle"
    @mousedown.prevent="onDown"
  >
    <BaseImage
      :id="props.id"
      :src="props.src"
      :size="props.h || props.w || 0"
      @delete="deleteImage"
    />
  </div>
</template>
