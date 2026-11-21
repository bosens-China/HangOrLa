<script setup lang="ts">
import { ref } from 'vue';
import BaseImage from './BaseImage.vue';
import HorizontalScrollbar from './HorizontalScrollbar.vue';
import ImageImportDialog from './ImageImportDialog.vue';
import { useHorizontalScroll } from '../composables/useHorizontalScroll';
import {
  galleryDragType,
  useBoardStore,
  type GalleryItem,
} from '../stores/useBoardStore';
import { NIcon } from 'naive-ui';
import { AddOutline, TrashOutline } from '@vicons/ionicons5';

defineOptions({ name: 'ImageGallery' });

const items = defineModel<GalleryItem[]>({ required: true });
const emit = defineEmits<{ spawn: [item: GalleryItem] }>();
const props = defineProps<{ heightPx: number; targetLabel?: string }>();

const { deleteGalleryImage, startGalleryDrag, endGalleryDrag } =
  useBoardStore();
const importing = ref(false);
const pendingRemoval = ref<string>();
const galleryViewport = ref<HTMLDivElement | null>(null);
const galleryContent = ref<HTMLDivElement | null>(null);
const horizontal = useHorizontalScroll(galleryViewport, galleryContent);

function addImages(images: GalleryItem[]) {
  items.value = [...items.value, ...images];
  importing.value = false;
}

function confirmDeletion() {
  if (pendingRemoval.value !== undefined)
    deleteGalleryImage(pendingRemoval.value);
  pendingRemoval.value = undefined;
}

function onDragStart(it: GalleryItem, e: DragEvent) {
  if (!e.dataTransfer || !(e.currentTarget instanceof HTMLElement)) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const offsetX = e.clientX - rect.left;
  const offsetY = e.clientY - rect.top;
  e.dataTransfer.setData(
    galleryDragType,
    [it.id, offsetX, offsetY].join(','),
  );
  startGalleryDrag(it.id, offsetX, offsetY);
}
</script>

<template>
  <div class="gallery bg-gray-50 shrink-0 flex items-start gap-2">
    <div v-if="items.length" class="gallery-strip relative min-w-0">
      <div
        ref="galleryViewport"
        class="hide-native-scrollbar overflow-x-auto overflow-y-hidden"
        @scroll.passive="horizontal.sync"
      >
        <div ref="galleryContent" class="flex w-max items-center gap-2">
          <div
            v-for="it in items"
            :key="it.id"
            class="image-actions relative shrink-0"
          >
            <button
              type="button"
              class="block cursor-grab border-0 bg-transparent p-0"
              :aria-label="
                targetLabel ? '自动摆放到' + targetLabel : '自动摆放'
              "
              :title="
                targetLabel
                  ? '点击自动摆放到「' + targetLabel + '」，或拖入榜单'
                  : '点击自动摆放，或拖入榜单'
              "
              draggable="true"
              @dragstart="(e) => onDragStart(it, e)"
              @dragend="endGalleryDrag"
              @click="emit('spawn', it)"
            >
              <BaseImage :src="it.src" :size="props.heightPx" />
            </button>
            <button
              type="button"
              class="image-action"
              aria-label="删除图库图片"
              title="删除图片"
              @click="pendingRemoval = it.id"
            >
              <n-icon :component="TrashOutline" />
            </button>
          </div>
        </div>
      </div>
      <HorizontalScrollbar
        v-if="horizontal.limit.value > 0 && horizontal.width.value > 16"
        class="gallery-scrollbar absolute bottom-1 left-2 z-10"
        :width="horizontal.width.value - 16"
        :offset="horizontal.offset.value"
        :limit="horizontal.limit.value"
        label="图库横向滚动"
        @scroll="horizontal.scrollTo"
      />
    </div>
    <button
      type="button"
      class="add-image-tile"
      :style="{ width: heightPx + 'px', height: heightPx + 'px' }"
      aria-label="添加图片"
      title="添加图片"
      @click="importing = true"
    >
      <n-icon size="28" :component="AddOutline" />
    </button>

    <ImageImportDialog
      v-if="importing"
      @close="importing = false"
      @confirm="addImages"
    />
    <n-modal
      :show="pendingRemoval !== undefined"
      preset="dialog"
      type="warning"
      title="删除图库图片？"
      content="这张图片将从图库移除。"
      positive-text="删除"
      negative-text="取消"
      @positive-click="confirmDeletion"
      @update:show="(show) => !show && (pendingRemoval = undefined)"
    />
  </div>
</template>

<style scoped>
.gallery {
  border-top: 1px solid #e4e4e7;
}

.gallery-strip:hover .gallery-scrollbar {
  opacity: 1;
  pointer-events: auto;
}

.add-image-tile {
  display: grid;
  flex-shrink: 0;
  box-sizing: border-box;
  place-items: center;
  padding: 0;
  border: 1px dashed #a1a1aa;
  border-radius: 6px;
  background: white;
  color: #52525b;
  cursor: pointer;
  transition: all 150ms ease;
}

.add-image-tile:hover,
.add-image-tile:focus-visible {
  border-color: #18181b;
  background: #f4f4f5;
  color: #09090b;
}
</style>
