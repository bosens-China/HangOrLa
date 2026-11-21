<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  width: number;
  offset: number;
  limit: number;
  label: string;
  visible?: boolean;
}>();

const emit = defineEmits<{ scroll: [offset: number] }>();
const thumbWidth = computed(() =>
  Math.min(
    props.width,
    Math.max(20, props.width ** 2 / (props.width + props.limit)),
  ),
);
</script>

<template>
  <input
    class="horizontal-scrollbar"
    :class="{ 'horizontal-scrollbar--visible': visible }"
    type="range"
    min="0"
    :max="limit"
    :value="offset"
    :aria-label="label"
    :style="{ width: width + 'px', '--thumb-width': thumbWidth + 'px' }"
    @input="emit('scroll', Number(($event.target as HTMLInputElement).value))"
  />
</template>

<style scoped>
.horizontal-scrollbar {
  appearance: none;
  box-sizing: border-box;
  display: block;
  height: 12px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms ease;
  cursor: pointer;
}

.horizontal-scrollbar--visible,
.horizontal-scrollbar:focus-visible {
  opacity: 1;
  pointer-events: auto;
}

.horizontal-scrollbar::-webkit-slider-runnable-track {
  height: 6px;
  background: #e5e7eb;
  border-radius: 999px;
}

.horizontal-scrollbar::-webkit-slider-thumb {
  appearance: none;
  width: var(--thumb-width);
  height: 6px;
  border-radius: 999px;
  background: #64748b;
}

.horizontal-scrollbar::-moz-range-track {
  height: 6px;
  background: #e5e7eb;
  border-radius: 999px;
}

.horizontal-scrollbar::-moz-range-thumb {
  width: var(--thumb-width);
  height: 6px;
  border: 0;
  border-radius: 999px;
  background: #64748b;
}
</style>
