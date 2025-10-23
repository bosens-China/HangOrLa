<script setup lang="ts">
import { useEventListener } from '@vueuse/core';

const props = defineProps<{
  label: string;
  color: string;
  heightPx: number;
  labelWidthPx: number;
}>();

const emit = defineEmits<{
  (e: 'update:heightPx', value: number): void;
  (e: 'update:labelWidthPx', value: number): void;
}>();

function onResizeStart(e: MouseEvent) {
  const startY = e.clientY;
  const start = props.heightPx;
  const onMove = (ev: MouseEvent) => {
    const delta = ev.clientY - startY;
    const next = Math.max(
      60,
      Math.min(260, Math.round((start + delta) / 10) * 10),
    );
    emit('update:heightPx', next);
  };
  const stopMove = useEventListener(window, 'mousemove', onMove);
  const stopUp = useEventListener(window, 'mouseup', () => {
    stopMove();
    stopUp();
  });
}

function onHResizeStart(e: MouseEvent) {
  const startX = e.clientX;
  const start = props.labelWidthPx;
  const onMove = (ev: MouseEvent) => {
    const delta = ev.clientX - startX;
    const next = Math.max(60, Math.round((start + delta) / 10) * 10);
    emit('update:labelWidthPx', next);
  };
  const stopMove = useEventListener(window, 'mousemove', onMove);
  const stopUp = useEventListener(window, 'mouseup', () => {
    stopMove();
    stopUp();
  });
}
</script>

<template>
  <div
    class="relative flex overflow-hidden"
    :style="{ height: props.heightPx + 'px', borderBottom: '1px solid #000' }"
  >
    <div
      class="flex items-center justify-center font-700 text-dark relative select-none"
      :style="{ background: props.color, width: props.labelWidthPx + 'px' }"
    >
      {{ label }}
      <div
        class="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize"
        @mousedown.prevent="onHResizeStart"
      />
    </div>

    <div
      class="absolute left-0 right-0 bottom-0 h-1 cursor-ns-resize z-10"
      @mousedown.prevent="onResizeStart"
    />
  </div>
</template>
