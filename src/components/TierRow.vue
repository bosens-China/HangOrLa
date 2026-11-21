<script setup lang="ts">
import { computed } from 'vue';
import { useEventListener } from '@vueuse/core';
import { defaultBorderColor } from '../stores/useBoardStore';

const props = defineProps<{
  label: string;
  color: string;
  heightPx: number;
  labelWidthPx: number;
  pinLabel: boolean;
  selected: boolean;
  showBorder?: boolean;
  borderColor?: string;
}>();

const emit = defineEmits<{
  (e: 'update:labelWidthPx', value: number): void;
  (e: 'select'): void;
}>();

const isDarkBg = computed(() => {
  const hex = props.color.trim().replace(/^#/, '');
  let r = 255;
  let g = 255;
  let b = 255;
  if (hex.length === 3) {
    r = parseInt(hex[0]! + hex[0]!, 16);
    g = parseInt(hex[1]! + hex[1]!, 16);
    b = parseInt(hex[2]! + hex[2]!, 16);
  } else if (hex.length >= 6) {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  }
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return false;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.55;
});

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
    class="relative flex box-border"
    :style="{
      height: props.heightPx + 'px',
      borderBottom:
        props.showBorder === false
          ? undefined
          : '1px solid ' + (props.borderColor ?? defaultBorderColor),
    }"
  >
    <div
      class="flex shrink-0 items-center justify-center font-700 select-none"
      :class="[
        pinLabel ? 'sticky left-0 z-40' : 'relative',
        isDarkBg ? 'text-white' : 'text-dark',
      ]"
      :style="{ background: props.color, width: props.labelWidthPx + 'px' }"
    >
      <button
        type="button"
        class="h-full w-full cursor-pointer border-0 bg-transparent text-base text-inherit font-700"
        :aria-pressed="selected"
        :title="
          selected
            ? '当前自动摆放目标行（点击图库图片将摆放到此行）'
            : '点击设为自动摆放的目标行'
        "
        @click="emit('select')"
      >
        {{ label }}
      </button>
      <div
        class="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-black/15 transition-colors"
        title="拖动调整标签列宽度"
        @mousedown.prevent="onHResizeStart"
      />
    </div>

    <slot />
  </div>
</template>
