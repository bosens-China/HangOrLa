<script setup lang="ts">
import { nextTick, ref } from 'vue';

const props = defineProps<{
  id: string | number;
  src: string;
  size: number;
}>();

const emit = defineEmits<{
  (e: 'delete', id: typeof props.id): void;
}>();

const showDropdown = ref(false);
const x = ref(0);
const y = ref(0);

const dropdownOptions = [{ label: '删除', key: 'delete' }];

function handleContextMenu(e: MouseEvent) {
  e.preventDefault();
  showDropdown.value = false;
  nextTick().then(() => {
    showDropdown.value = true;
    x.value = e.clientX;
    y.value = e.clientY;
  });
}

function handleDropdownSelect(key: string) {
  if (key === 'delete') {
    emit('delete', props.id);
  }
  showDropdown.value = false;
}

function onClickoutside() {
  showDropdown.value = false;
}
</script>

<template>
  <img
    :src="src"
    :style="{ width: size + 'px', height: size + 'px' }"
    class="object-cover rounded shadow-sm bg-white/70"
    @contextmenu.prevent="handleContextMenu"
  />
  <n-dropdown
    placement="bottom-start"
    trigger="manual"
    :x="x"
    :y="y"
    :options="dropdownOptions"
    :show="showDropdown"
    :on-clickoutside="onClickoutside"
    @select="handleDropdownSelect"
  />
</template>
