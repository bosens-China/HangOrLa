<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { useBoardStore } from '../stores/useBoardStore';
import BaseImage from './BaseImage.vue';
import { useEventListener } from '@vueuse/core';
import { NIcon } from 'naive-ui';
import { CloseOutline } from '@vicons/ionicons5';

const props = defineProps<{
  id: string;
  src: string;
  x: number;
  y: number;
}>();

const {
  defaultLabelWidthPx,
  defaultRowHeightPx,
  positionAt,
  positionForMove,
  hasBottomBorder,
  canPlaceOrSwap,
  updatePos,
  returnImageToGallery,
} = useBoardStore();

const preview = ref<{ x: number; y: number }>();
const returningToGallery = ref(false);
const previewValid = computed(
  () =>
    !preview.value ||
    returningToGallery.value ||
    canPlaceOrSwap(props.id, preview.value),
);
const imageStyle = computed(() => ({
  left: (preview.value?.x ?? props.x) + defaultLabelWidthPx.value + 'px',
  top: (preview.value?.y ?? props.y) + 'px',
}));
const imageClass = computed(() =>
  hasBottomBorder(preview.value ?? props) ? 'leave-bottom-border' : '',
);

let stopDragging: (() => void) | undefined;
onBeforeUnmount(() => stopDragging?.());

function isOverGallery(clientY: number) {
  const galleryEl = document.querySelector('.gallery');
  if (!galleryEl) return false;
  const rect = galleryEl.getBoundingClientRect();
  return clientY >= rect.top;
}

function onDown(e: MouseEvent) {
  if (e.button !== 0) return;
  e.preventDefault();
  stopDragging?.();
  const start = positionAt(e.clientX, e.clientY);
  const offsetX = start.x - props.x;
  const offsetY = start.y - props.y;
  const startY = props.y;

  function getPosition(event: MouseEvent) {
    const point = positionAt(event.clientX, event.clientY);
    return positionForMove(
      point.x - offsetX,
      point.y - offsetY,
      startY,
      event.shiftKey,
    );
  }
  const stopMove = useEventListener(window, 'mousemove', (event) => {
    returningToGallery.value = isOverGallery(event.clientY);
    preview.value = getPosition(event);
  });
  const stopUp = useEventListener(window, 'mouseup', (event) => {
    if (event.button !== 0) return;
    if (isOverGallery(event.clientY)) {
      returnImageToGallery(props.id);
    } else {
      updatePos(props.id, getPosition(event));
    }
    stopDragging?.();
  });
  const stopBlur = useEventListener(window, 'blur', () => stopDragging?.());
  stopDragging = () => {
    stopMove();
    stopUp();
    stopBlur();
    preview.value = undefined;
    returningToGallery.value = false;
    stopDragging = undefined;
  };
}
</script>

<template>
  <div
    class="image-actions absolute select-none rounded"
    :class="[
      preview ? 'z-30 opacity-75' : 'z-20',
      preview && !previewValid
        ? 'ring-2 ring-red-500 cursor-not-allowed'
        : 'cursor-move',
      returningToGallery ? 'ring-2 ring-amber-500 scale-90 transition-transform' : '',
    ]"
    :style="imageStyle"
    @mousedown="onDown"
  >
    <BaseImage
      :src="props.src"
      :size="defaultRowHeightPx"
      :class="imageClass"
    />
    <span
      v-if="returningToGallery"
      class="pointer-events-none absolute inset-x-1 bottom-1 rounded bg-amber-600/90 px-1 py-0.5 text-center text-11px text-white"
    >
      松手移回图库
    </span>
    <button
      v-if="!preview"
      type="button"
      class="image-action"
      aria-label="移回图库"
      title="移回图库"
      @mousedown.stop
      @click="returnImageToGallery(props.id)"
    >
      <n-icon size="16" :component="CloseOutline" />
    </button>
  </div>
</template>

<style scoped>
.leave-bottom-border {
  clip-path: inset(0 0 1px);
}
</style>
