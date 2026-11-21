<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { useEventListener } from '@vueuse/core';
import type { GalleryItem } from '../stores/useBoardStore';
import { NIcon } from 'naive-ui';
import {
  CloudUploadOutline,
  CheckmarkOutline,
  ImagesOutline,
} from '@vicons/ionicons5';

const emit = defineEmits<{
  close: [];
  confirm: [images: GalleryItem[]];
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const staged = ref<(GalleryItem & { selected: boolean })[]>([]);
const selectedImages = computed(() =>
  staged.value.filter((item) => item.selected),
);
const allSelected = computed(
  () =>
    staged.value.length > 0 &&
    selectedImages.value.length === staged.value.length,
);
const url = ref('');
const busy = ref(false);
const error = ref('');
const dragOver = ref(false);
let active = true;

onBeforeUnmount(() => {
  active = false;
  for (const item of staged.value) {
    if (item.src.startsWith('blob:')) URL.revokeObjectURL(item.src);
  }
});

async function stageImage(src: string) {
  const image = new Image();
  image.referrerPolicy = 'no-referrer';
  image.src = src;
  const loaded = await image.decode().then(
    () => true,
    () => false,
  );
  if (loaded && active) {
    staged.value.push({ id: crypto.randomUUID(), src, selected: true });
    return true;
  }
  if (src.startsWith('blob:')) URL.revokeObjectURL(src);
  return false;
}

async function stageFiles(files: Blob[]) {
  let failures = 0;
  for (const file of files) {
    if (!active) return;
    if (file.type && !file.type.startsWith('image/')) {
      failures++;
      continue;
    }
    if (!(await stageImage(URL.createObjectURL(file)))) failures++;
  }
  if (failures) error.value = '有图片无法打开，请换一张。';
}

async function run(task: () => Promise<void>) {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    await task();
  } catch {
    error.value = '无法读取图片，请重试。';
  } finally {
    busy.value = false;
  }
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = '';
  if (files.length) void run(() => stageFiles(files));
}

function onDropFiles(event: DragEvent) {
  dragOver.value = false;
  const files = Array.from(event.dataTransfer?.files ?? []);
  if (files.length) void run(() => stageFiles(files));
}

function onPaste(event: ClipboardEvent) {
  const files = Array.from(event.clipboardData?.files ?? []);
  if (!files.length) return;
  event.preventDefault();
  void run(() => stageFiles(files));
}

useEventListener(window, 'paste', onPaste);

function loadUrl() {
  if (!url.value.trim()) return;
  void run(async () => {
    let imageUrl: URL | undefined;
    try {
      imageUrl = new URL(url.value.trim());
    } catch {
      error.value = '请输入有效的 HTTP 或 HTTPS 图片链接。';
      return;
    }
    if (
      !['http:', 'https:'].includes(imageUrl.protocol) ||
      imageUrl.username ||
      imageUrl.password
    ) {
      error.value = '请输入有效的 HTTP 或 HTTPS 图片链接。';
      return;
    }
    if (await stageImage(imageUrl.href)) url.value = '';
    else error.value = '图片链接无法加载，请检查链接或换一张图片。';
  });
}

function toggleAll() {
  const selected = !allSelected.value;
  for (const item of staged.value) item.selected = selected;
}

function confirm() {
  if (busy.value || !selectedImages.value.length) return;
  const images = selectedImages.value.map(({ id, src }) => ({ id, src }));
  staged.value = staged.value.filter((item) => !item.selected);
  emit('confirm', images);
}
</script>

<template>
  <n-modal
    :show="true"
    preset="card"
    title="添加图片"
    closable
    style="width: min(560px, calc(100vw - 32px))"
    @update:show="(value) => !value && emit('close')"
  >
    <div
      class="space-y-4"
      @dragover.prevent="dragOver = true"
      @dragleave="dragOver = false"
      @drop.prevent="onDropFiles"
    >
      <p class="m-0 -mt-2 text-xs text-zinc-500">
        支持选择多张本地图片、输入图片直链，或在弹窗内直接按
        <kbd
          class="rounded border border-solid border-zinc-200 bg-zinc-100 px-1 py-0.5 font-sans text-11px text-zinc-700"
          >Ctrl/⌘ + V</kbd
        >
        粘贴剪贴板图片。
      </p>

      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        hidden
        @change="onFileChange"
      />

      <!-- 顶部工具栏：多选上传按钮 + URL 直链输入框 -->
      <div class="flex items-center gap-2">
        <n-button
          type="primary"
          class="shrink-0"
          :disabled="busy"
          @click="fileInput?.click()"
        >
          <template #icon>
            <n-icon :component="CloudUploadOutline" />
          </template>
          选择本地图片
        </n-button>

        <div class="flex flex-1 items-center gap-1.5 min-w-0">
          <n-input
            v-model:value="url"
            aria-label="图片 URL"
            placeholder="粘贴 HTTP / HTTPS 图片链接..."
            :disabled="busy"
            clearable
            @keydown.enter.prevent="loadUrl"
          />
          <n-button
            secondary
            class="shrink-0"
            :disabled="busy || !url.trim()"
            @click="loadUrl"
          >
            添加链接
          </n-button>
        </div>
      </div>

      <p
        v-if="error"
        role="alert"
        class="m-0 rounded-md border border-solid border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600"
      >
        {{ error }}
      </p>
      <p
        v-else-if="busy"
        role="status"
        class="m-0 rounded-md border border-solid border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600"
      >
        正在读取图片…
      </p>

      <!-- 下方：多图片预览列表 / 拖放空状态 -->
      <div
        v-if="staged.length"
        role="group"
        aria-label="待添加图片"
        class="rounded-lg border border-solid border-zinc-200 bg-zinc-50/50 p-3 transition-colors"
        :class="{ '!border-zinc-900 bg-zinc-100/70': dragOver }"
      >
        <div class="mb-2.5 flex items-center justify-between text-xs">
          <span class="font-medium text-zinc-700">
            待添加图片（已选 {{ selectedImages.length }} / {{ staged.length }}）
          </span>
          <button
            v-if="staged.length > 1"
            type="button"
            class="cursor-pointer border-0 bg-transparent p-0 text-xs font-medium text-zinc-600 hover:text-zinc-900"
            @click="toggleAll"
          >
            {{ allSelected ? '取消全选' : '全选' }}
          </button>
        </div>

        <div
          class="grid grid-cols-4 gap-2.5 overflow-y-auto p-0.5"
          style="max-height: min(46vh, 320px)"
        >
          <label
            v-for="(item, index) in staged"
            :key="item.id"
            class="preview-card group"
            :class="{ 'preview-card--selected': item.selected }"
          >
            <img :src="item.src" alt="" referrerpolicy="no-referrer" />
            <input
              v-model="item.selected"
              type="checkbox"
              class="sr-only"
              :aria-label="'选择第 ' + (index + 1) + ' 张图片'"
            />
            <span
              class="preview-checkbox"
              :class="{ 'preview-checkbox--checked': item.selected }"
            >
              <n-icon
                v-if="item.selected"
                size="12"
                :component="CheckmarkOutline"
              />
            </span>
          </label>
        </div>
      </div>

      <div
        v-else
        class="flex flex-col cursor-pointer items-center justify-center rounded-lg border border-dashed py-10 px-4 text-center transition-colors"
        :class="
          dragOver
            ? 'border-zinc-900 bg-zinc-100/80 text-zinc-900'
            : 'border-zinc-300 bg-zinc-50/60 text-zinc-500 hover:border-zinc-400 hover:bg-zinc-50'
        "
        @click="fileInput?.click()"
      >
        <div
          class="mb-2.5 flex h-10 w-10 items-center justify-center rounded-full border border-solid border-zinc-200 bg-white text-zinc-600 shadow-sm"
        >
          <n-icon size="20" :component="ImagesOutline" />
        </div>
        <p class="m-0 text-sm font-medium text-zinc-800">
          点击选择多张图片，或将图片拖放到此处
        </p>
        <p class="m-0 mt-1 text-xs text-zinc-500">
          也可随时按 Ctrl+V / ⌘+V 直接从剪贴板粘贴图片
        </p>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <n-button @click="emit('close')">取消</n-button>
        <n-button
          type="primary"
          :disabled="busy || !selectedImages.length"
          @click="confirm"
        >
          确认添加<span v-if="selectedImages.length" class="ml-0.5"
            >({{ selectedImages.length }})</span
          >
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.preview-card {
  position: relative;
  display: block;
  aspect-ratio: 1;
  border-radius: 6px;
  border: 1px solid #e4e4e7;
  background: #ffffff;
  cursor: pointer;
  overflow: hidden;
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease,
    opacity 150ms ease;
}

.preview-card:not(.preview-card--selected) {
  opacity: 0.6;
}

.preview-card:hover {
  opacity: 1;
  border-color: #a1a1aa;
}

.preview-card--selected,
.preview-card:focus-within {
  border-color: #18181b;
  box-shadow: 0 0 0 1px #18181b;
}

.preview-card img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.preview-checkbox {
  position: absolute;
  top: 6px;
  right: 6px;
  display: grid;
  width: 18px;
  height: 18px;
  place-items: center;
  border-radius: 4px;
  border: 1px solid #d4d4d8;
  background: rgba(255, 255, 255, 0.9);
  color: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: all 120ms ease;
}

.preview-checkbox--checked {
  border-color: #18181b;
  background: #18181b;
}
</style>
