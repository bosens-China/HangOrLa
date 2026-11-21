<script setup lang="ts">
import { computed, h, nextTick, ref, watch, type Component } from 'vue';
import { useEventListener } from '@vueuse/core';
import TierRow from './TierRow.vue';
import Gallery from './Gallery.vue';
import FreeImage from './FreeImage.vue';
import HorizontalScrollbar from './HorizontalScrollbar.vue';
import { useHorizontalScroll } from '../composables/useHorizontalScroll';
import { getTextColor } from '../utils/colors';
import {
  defaultBorderColor,
  useBoardStore,
  type GalleryItem,
} from '../stores/useBoardStore';
import { NIcon } from 'naive-ui';
import {
  OptionsOutline,
  InformationCircleOutline,
  LogoGithub,
  TrashOutline,
  AddOutline,
  ReloadOutline,
  ArrowUpOutline,
  ArrowDownOutline,
} from '@vicons/ionicons5';

const {
  canvasRef,
  tiers,
  defaultRowHeightPx,
  defaultLabelWidthPx,
  imageFitMode,
  gallery,
  freeItems,
  showingDemo,
  showSettings,
  minBoardWidth,
  placementMessage,
  automaticTier,
  dropPreview,
  addToCanvas,
  fitRowHeight,
  onCanvasDragOver,
  onCanvasDrop,
  resetToDefaults,
  selectTier,
  addTier,
  removeTier,
  moveTier,
  clearBoard,
} = useBoardStore();

useEventListener(window, 'beforeunload', (event: BeforeUnloadEvent) => {
  if (gallery.value.length > 0 || freeItems.value.length > 0) {
    event.preventDefault();
    event.returnValue = '';
  }
});

const frame = ref<HTMLDivElement | null>(null);
const boardViewport = ref<HTMLDivElement | null>(null);
const boardPan = ref<HTMLDivElement | null>(null);
const horizontal = useHorizontalScroll(boardPan, canvasRef);
const pinnedLabelWidth = computed(() =>
  horizontal.width.value - defaultLabelWidthPx.value > 48
    ? defaultLabelWidthPx.value
    : 0,
);
const trackWidth = computed(
  () => horizontal.width.value - pinnedLabelWidth.value - 16,
);
const hoveredRow = ref(-1);
let pointerY: number | undefined;

watch(frame, (element, _, onCleanup) => {
  if (!element) return;
  const observer = new ResizeObserver(() => fitRowHeight(element.clientHeight));
  observer.observe(element);
  onCleanup(() => observer.disconnect());
  fitRowHeight(element.clientHeight);
});

watch(
  () => tiers.value.length,
  () => {
    if (frame.value) fitRowHeight(frame.value.clientHeight);
  },
);

function updateHoveredRow() {
  const top = canvasRef.value?.getBoundingClientRect().top;
  hoveredRow.value =
    top === undefined || pointerY === undefined
      ? -1
      : Math.floor((pointerY - top) / defaultRowHeightPx.value);
}

function trackPointer(event: PointerEvent) {
  pointerY = event.clientY;
  updateHoveredRow();
}

function clearPointer() {
  pointerY = undefined;
  hoveredRow.value = -1;
}

async function placeGalleryImage(item: GalleryItem) {
  const position = addToCanvas(item);
  if (!position) return;
  await nextTick();
  const pan = boardPan.value;
  const viewport = boardViewport.value;
  if (!pan || !viewport) return;
  const imageSize = defaultRowHeightPx.value;
  const left = defaultLabelWidthPx.value + position.x;
  horizontal.scrollTo(
    Math.min(
      left - pinnedLabelWidth.value,
      Math.max(pan.scrollLeft, left + imageSize - pan.clientWidth),
    ),
  );
  viewport.scrollTop = Math.min(
    position.y,
    Math.max(
      viewport.scrollTop,
      position.y + imageSize - viewport.clientHeight,
    ),
  );
}

const showAbout = ref(false);
const showClear = ref(false);

function renderMenuIcon(icon: Component) {
  return () => h(NIcon, { size: 15 }, { default: () => h(icon) });
}

const menuOptions = [
  {
    label: '用法与设置',
    key: 'settings',
    icon: renderMenuIcon(OptionsOutline),
  },
  {
    label: '关于项目',
    key: 'about',
    icon: renderMenuIcon(InformationCircleOutline),
  },
  {
    type: 'divider',
    key: 'd1',
  },
  {
    label: 'GitHub 仓库',
    key: 'github',
    icon: renderMenuIcon(LogoGithub),
  },
];

function selectMenu(key: string) {
  if (key === 'about') showAbout.value = true;
  if (key === 'settings') showSettings.value = true;
  if (key === 'github') {
    window.open(
      'https://github.com/bosens-China/HangOrLa',
      '_blank',
      'noopener,noreferrer',
    );
  }
}

function updateLabelWidth(v: number) {
  defaultLabelWidthPx.value = v;
}
</script>

<template>
  <div ref="frame" class="board-frame relative isolate flex flex-col">
    <div
      class="absolute right-3 top-3 z-45 flex items-center gap-2"
    >
      <span
        v-if="showingDemo"
        class="rounded-md border border-solid border-zinc-200 bg-white/95 px-2.5 py-1.5 text-xs text-zinc-500"
      >
        美食排行 · 示例
      </span>
      <n-button
        class="clear-all-button"
        size="small"
        secondary
        style="padding: 0 8px"
        aria-label="清空全部"
        title="清空全部"
        :disabled="!gallery.length && !freeItems.length"
        @click="showClear = true"
      >
        <n-icon :size="18" :component="TrashOutline" />
        <span class="clear-all-label" aria-hidden="true">清空全部</span>
      </n-button>
    </div>
    <n-modal
      v-model:show="showClear"
      preset="dialog"
      type="warning"
      title="清空全部图片？"
      content="榜单和图库中的图片都会被移除，无法撤销。等级和样式设置会保留。"
      positive-text="清空全部"
      negative-text="取消"
      @positive-click="clearBoard(); showClear = false"
    />
    <div
      ref="boardViewport"
      class="board-viewport flex-1 min-h-0 overflow-x-hidden overflow-y-auto"
      role="region"
      aria-label="等级榜单"
      tabindex="0"
      @scroll.passive="updateHoveredRow"
    >
      <div
        ref="boardPan"
        class="hide-native-scrollbar overflow-x-auto overflow-y-hidden"
        @scroll.passive="horizontal.sync"
        @pointermove="trackPointer"
        @pointerleave="clearPointer"
      >
        <div
          ref="canvasRef"
          class="relative"
          :style="{ minWidth: minBoardWidth + 'px' }"
          @dragover.prevent="onCanvasDragOver"
          @dragleave="dropPreview = undefined"
          @drop.prevent="onCanvasDrop"
        >
          <TierRow
            v-for="(t, index) in tiers"
            :key="t.id"
            :label="t.label"
            :color="t.color"
            :text-color="t.textColor"
            :heightPx="defaultRowHeightPx"
            :labelWidthPx="defaultLabelWidthPx"
            :pin-label="pinnedLabelWidth > 0"
            :selected="automaticTier?.id === t.id"
            :show-border="t.showBorder !== false"
            :border-color="t.borderColor"
            @update:labelWidthPx="updateLabelWidth"
            @select="selectTier(t.id)"
          >
            <HorizontalScrollbar
              v-if="horizontal.limit.value > 0 && trackWidth > 0"
              class="absolute bottom-1 z-35"
              :style="{
                left: horizontal.offset.value + pinnedLabelWidth + 8 + 'px',
              }"
              :width="trackWidth"
              :offset="horizontal.offset.value"
              :limit="horizontal.limit.value"
              :label="t.label + '横向滚动'"
              :visible="hoveredRow === index"
              @scroll="horizontal.scrollTo"
            />
          </TierRow>
          <div
            v-if="dropPreview"
            class="pointer-events-none absolute z-25 box-border rounded border-2 border-dashed transition-all duration-75"
            :class="
              dropPreview.valid
                ? 'border-green-600 bg-green-500/15'
                : 'border-red-500 bg-red-500/15'
            "
            :style="{
              left: dropPreview.x + defaultLabelWidthPx + 'px',
              top: dropPreview.y + 'px',
              width: defaultRowHeightPx + 'px',
              height: defaultRowHeightPx + 'px',
            }"
          />
          <FreeImage v-for="it in freeItems" :key="it.id" v-bind="it" />
        </div>
      </div>
    </div>

    <p
      v-if="placementMessage"
      role="status"
      class="pointer-events-none absolute right-3 z-45 m-0 rounded-md border border-solid border-zinc-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-sm"
      :style="{ bottom: defaultRowHeightPx + 8 + 'px' }"
    >
      {{ placementMessage }}
    </p>
    <Gallery
      :height-px="defaultRowHeightPx"
      :target-label="automaticTier?.label"
      v-model="gallery"
      @spawn="placeGalleryImage"
    />

    <n-dropdown
      trigger="click"
      placement="left"
      :options="menuOptions"
      @select="selectMenu"
    >
      <button
        type="button"
        class="board-menu-trigger"
        aria-label="打开看板菜单"
        aria-haspopup="menu"
        title="菜单与设置"
      >
        <n-icon size="16" :component="OptionsOutline" />
      </button>
    </n-dropdown>

    <n-modal
      v-model:show="showAbout"
      preset="card"
      title="关于「从夯到拉」"
      closable
      class="max-w-440px"
    >
      <div
        class="overflow-y-auto space-y-3 text-sm text-zinc-600 leading-relaxed"
        style="max-height: calc(100dvh - 160px)"
      >
        <p class="m-0">
          “从夯到拉”是一个网络流行语，表示一种新的评价体系，通常将事物分为夯、顶级、人上人、NPC、拉完了等五个等级，夯代表最优秀的状态。
        </p>
        <p class="m-0">
          该梗起源于网络，通过视频等形式在中国网络上迅速传播。其分级体系为：
        </p>
        <ul class="m-0 pl-5 space-y-1.5">
          <li><strong>夯</strong>：代表事物的极致优秀状态，超越常规评价标准。</li>
          <li><strong>顶级</strong>：非常优秀，但略逊于“夯”。</li>
          <li><strong>人上人</strong>：比普通人更优秀的存在。</li>
          <li><strong>NPC</strong>：指中规中矩的人，表现平平。</li>
          <li><strong>拉完了</strong>：表示最低级别，通常指表现极差的状态。</li>
        </ul>
        <p class="m-0">
          这一评价体系被广泛应用于多个领域，包括游戏角色强度分析、武器排名、时尚品牌评价等。它反映了网络文化中对事物评价的多样性和个性化，成为一种新的表达方式。
        </p>
      </div>
    </n-modal>

    <n-drawer
      v-model:show="showSettings"
      placement="right"
      :width="380"
      style="max-width: 100vw"
      :show-mask="'transparent'"
    >
      <n-drawer-content title="用法与设置" closable>
        <div class="space-y-6">
          <p
            class="m-0 rounded-md border border-solid border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600"
          >
            点击等级标签，再点图库缩略图即可自动摆放。拖动会吸附到等级行或分隔线，按住
            <kbd
              class="rounded border border-solid border-zinc-200 bg-white px-1 py-0.5 text-11px text-zinc-800"
              >Shift</kbd
            >
            可自由微调，拖回底部可移回图库。
          </p>

          <!-- 全局画布设置 -->
          <div class="space-y-3">
            <div class="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
              画布与显示
            </div>
            <div
              class="rounded-lg border border-solid border-zinc-200 bg-white p-3 space-y-3"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <span class="text-xs font-medium text-zinc-700">标签列宽 (px)</span>
                <n-input-number
                  v-model:value="defaultLabelWidthPx"
                  :min="60"
                  :step="10"
                  size="small"
                  class="w-28"
                />
              </div>
              <div class="h-1px bg-zinc-100" />
              <div class="flex flex-wrap items-center justify-between gap-3">
                <span class="text-xs font-medium text-zinc-700">图片裁剪方式</span>
                <n-radio-group v-model:value="imageFitMode" size="small">
                  <n-radio-button value="cover">填满裁切</n-radio-button>
                  <n-radio-button value="contain">完整留白</n-radio-button>
                </n-radio-group>
              </div>
            </div>
          </div>

          <!-- 等级样式列表 -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                等级行配置 ({{ tiers.length }})
              </span>
              <n-button size="tiny" secondary @click="addTier">
                <template #icon>
                  <n-icon :component="AddOutline" />
                </template>
                新增等级
              </n-button>
            </div>

            <div class="space-y-2.5">
              <div
                v-for="(t, index) in tiers"
                :key="t.id"
                class="rounded-lg border border-solid border-zinc-200 bg-white p-3 space-y-3 transition-colors hover:border-zinc-300"
              >
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <span
                      class="h-3.5 w-3.5 shrink-0 rounded-sm border border-solid border-black/10"
                      :style="{ background: t.color }"
                    />
                    <n-input
                      v-model:value="t.label"
                      size="small"
                      placeholder="等级名称"
                    />
                  </div>
                  <div class="flex items-center gap-0.5 shrink-0">
                    <n-button
                      size="tiny"
                      quaternary
                      :disabled="index === 0"
                      title="上移等级"
                      aria-label="上移等级"
                      @click="moveTier(index, index - 1)"
                    >
                      <template #icon>
                        <n-icon :component="ArrowUpOutline" />
                      </template>
                    </n-button>
                    <n-button
                      size="tiny"
                      quaternary
                      :disabled="index === tiers.length - 1"
                      title="下移等级"
                      aria-label="下移等级"
                      @click="moveTier(index, index + 1)"
                    >
                      <template #icon>
                        <n-icon :component="ArrowDownOutline" />
                      </template>
                    </n-button>
                    <n-popconfirm
                      positive-text="删除"
                      negative-text="取消"
                      @positive-click="removeTier(t.id)"
                    >
                      <template #trigger>
                        <n-button
                          size="tiny"
                          quaternary
                          type="error"
                          title="删除该等级"
                          aria-label="删除该等级"
                        >
                          <template #icon>
                            <n-icon :component="TrashOutline" />
                          </template>
                        </n-button>
                      </template>
                      删除「{{ t.label }}」后，该行上的图片将移回图库。确定删除？
                    </n-popconfirm>
                  </div>
                </div>

                <div class="space-y-2 border-0 border-t border-solid border-zinc-100 pt-3 text-xs">
                  <div class="flex items-center justify-between gap-3">
                    <span class="text-zinc-600">标签背景</span>
                    <n-color-picker
                      v-model:value="t.color"
                      size="small"
                      class="w-28"
                      :aria-label="t.label + '标签背景'"
                      :show-alpha="false"
                    />
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2">
                      <span class="text-zinc-600">底部分隔线</span>
                      <n-switch
                        size="small"
                        :value="t.showBorder !== false"
                        :aria-label="t.label + '显示边框'"
                        @update:value="t.showBorder = $event"
                      />
                    </div>
                    <n-color-picker
                      :value="t.borderColor ?? defaultBorderColor"
                      size="small"
                      class="w-28"
                      :aria-label="t.label + '分隔线颜色'"
                      :show-alpha="false"
                      :disabled="t.showBorder === false"
                      @update:value="t.borderColor = $event"
                    />
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <span class="text-zinc-600">文字颜色</span>
                    <n-color-picker
                      :value="t.textColor ?? getTextColor(t.color)"
                      size="small"
                      class="w-28"
                      :aria-label="t.label + '文字颜色'"
                      :show-alpha="false"
                      @update:value="t.textColor = $event"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 底部重置区 -->
          <div class="pt-3 border-0 border-t border-solid border-zinc-200 flex flex-wrap items-center justify-between gap-3">
            <span class="text-xs text-zinc-500">还原初始等级与列宽</span>
            <n-popconfirm
              positive-text="恢复默认"
              negative-text="取消"
              @positive-click="resetToDefaults"
            >
              <template #trigger>
                <n-button size="small" secondary>
                  <template #icon>
                    <n-icon :component="ReloadOutline" />
                  </template>
                  恢复默认设置
                </n-button>
              </template>
              确定恢复默认等级、颜色与列宽设置吗？
            </n-popconfirm>
          </div>
        </div>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<style scoped>
.board-frame {
  height: 100vh;
  height: 100dvh;
}

.clear-all-label {
  overflow: hidden;
  max-width: 0;
  margin-left: 0;
  opacity: 0;
  white-space: nowrap;
  transition:
    max-width 180ms ease,
    margin-left 180ms ease,
    opacity 180ms ease;
}

.clear-all-button:not(:disabled):is(:hover, :focus-visible) .clear-all-label {
  max-width: 5em;
  margin-left: 6px;
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .clear-all-label {
    transition: none;
  }
}

.board-menu-trigger {
  position: fixed;
  z-index: 40;
  top: 50%;
  right: 8px;
  display: grid;
  width: 32px;
  height: 36px;
  place-items: center;
  transform: translateY(-50%);
  border: 1px solid #e4e4e7;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.06),
    0 1px 2px rgba(0, 0, 0, 0.04);
  color: #52525b;
  opacity: 0.85;
  cursor: pointer;
  transition:
    opacity 150ms ease,
    color 150ms ease,
    border-color 150ms ease,
    background-color 150ms ease,
    box-shadow 150ms ease;
}

.board-menu-trigger:hover,
.board-menu-trigger:focus-visible {
  opacity: 1;
  border-color: #d4d4d8;
  background: #ffffff;
  color: #09090b;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}
</style>
