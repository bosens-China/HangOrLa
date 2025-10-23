<script setup lang="ts">
import BaseImage from './BaseImage.vue';
import { useBoardStore } from '../stores/useBoardStore';
import { NIcon } from 'naive-ui';
import { CloudUploadOutline, AddCircleOutline } from '@vicons/ionicons5';

defineOptions({ name: 'ImageGallery' });

type ImageItem = { id: string; src: string };

const items = defineModel<ImageItem[]>();
const emit = defineEmits<{
  (e: 'added', list: ImageItem[]): void;
  (e: 'spawn', item: ImageItem): void;
}>();
const fileRef = ref<HTMLInputElement | null>(null);
function openFileDialog() {
  fileRef.value?.click();
}
const props = defineProps<{ heightPx: number }>();

const { deleteImage } = useBoardStore();

function onFileChange(ev: Event) {
  const input = ev.target as HTMLInputElement;
  if (!input.files || !items.value) return;
  const added: ImageItem[] = [];
  for (const f of Array.from(input.files)) {
    const url = URL.createObjectURL(f);
    const it = { id: crypto.randomUUID(), src: url };
    items.value.push(it);
    added.push(it);
  }
  input.value = '';
  emit('added', added);
}

function onPaste(e: ClipboardEvent) {
  if (!items.value) return;
  const files = Array.from(e.clipboardData?.files || []);
  if (!files.length) return;
  const added: ImageItem[] = [];
  files.forEach((f) => {
    const it = { id: crypto.randomUUID(), src: URL.createObjectURL(f) };
    items.value!.push(it);
    added.push(it);
  });
  emit('added', added);
}

function onThumbClick(it: ImageItem) {
  emit('spawn', it);
  if (!items.value) return;
  const idx = items.value.findIndex((x) => x.id === it.id);
  if (idx >= 0) items.value.splice(idx, 1);
}

function onDragStart(it: ImageItem, e: DragEvent) {
  if (!e.dataTransfer) return;
  e.dataTransfer.setData('text/plain', it.id);
  e.dataTransfer.setData(
    'application/json',
    JSON.stringify({ offsetX: e.offsetX, offsetY: e.offsetY }),
  );
}
</script>

<template>
  <div
    class="border-t border-gray-200 p-2 bg-gray-50"
    :style="{ height: props.heightPx + 'px' }"
    @paste="onPaste"
  >
    <div
      v-if="!items || items.length === 0"
      class="h-full flex flex-col items-center justify-center gap-2 text-gray-500"
    >
      <div class="flex items-center gap-2">
        <n-button size="small" type="primary" secondary @click="openFileDialog">
          <template #icon>
            <n-icon :component="CloudUploadOutline" />
          </template>
          上传图片</n-button
        >
        <input
          ref="fileRef"
          id="gallery-file"
          type="file"
          multiple
          accept="image/*"
          @change="onFileChange"
          hidden
        />
      </div>
      <span>点击/粘贴添加图片，添加后会出现在画布，可任意拖拽</span>
    </div>
    <div v-else class="h-full flex items-center gap-2 overflow-x-auto">
      <div
        v-for="it in items"
        :key="it.id"
        class="h-full cursor-grab"
        draggable="true"
        @dragstart="(e) => onDragStart(it, e)"
        @click="onThumbClick(it)"
      >
        <BaseImage
          :id="it.id"
          :src="it.src"
          :size="props.heightPx"
          @delete="deleteImage"
        />
      </div>

      <n-button size="small" type="primary" secondary @click="openFileDialog">
        <template #icon>
          <n-icon :component="CloudUploadOutline" />
        </template>
        上传图片</n-button
      >
      <input
        ref="fileRef"
        id="gallery-file"
        type="file"
        multiple
        accept="image/*"
        @change="onFileChange"
        hidden
      />
      <label for="gallery-file" class="cursor-pointer">
        <n-icon size="24" :component="AddCircleOutline" title="添加图片" />
      </label>
    </div>
  </div>
</template>

<style scoped></style>
