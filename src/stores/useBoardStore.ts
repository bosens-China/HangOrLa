import { ref } from 'vue';
import { useStorage } from '@vueuse/core';

// --- 类型定义 ---

/** 画布上可自由拖拽的图片项 */
export type FreeItem = {
  id: string;
  src: string;
  x: number; // 相对于标签列的 x 坐标
  y: number;
  w?: number;
  h?: number;
};

/** 底部图库的图片项 */
export type GalleryItem = { id: string; src: string };

/** 等级行定义 */
export type Tier = {
  id: string;
  label: string;
  color: string;
};

/** 默认的等级行配置 */
const defaultTiers: Tier[] = [
  { id: 'hang', label: '夯', color: '#ef4444' },
  { id: 'top', label: '顶级', color: '#f59e0b' },
  { id: 'ren', label: '人上人', color: '#facc15' },
  { id: 'npc', label: 'NPC', color: '#fde68a' },
  { id: 'la', label: '拉', color: '#e5e7eb' },
];

// --- 初始值计算 ---
const initialRowCount = defaultTiers.length + 1;
const initialRowHeight = Math.round((window.innerHeight - 1) / initialRowCount);
const initialLabelWidth = 240;

// --- 单例状态 (Singleton State) ---
// 在函数外部定义，确保整个应用只创建一次

/** 画布容器的 DOM 引用 */
const canvasRef = ref<HTMLDivElement | null>(null);

// 持久化状态
const tiers = useStorage('boardTiers', defaultTiers);
const defaultRowHeightPx = useStorage('boardRowHeight', initialRowHeight);
const defaultLabelWidthPx = useStorage('boardLabelWidth', initialLabelWidth);

// 瞬时状态
const gallery = ref<GalleryItem[]>([]);
const freeItems = ref<FreeItem[]>([]);
const showSettings = ref(false);

// --- 核心函数 (Functions) ---
// 同样在函数外部定义，以便它们能访问到上面的单例状态

/** 更新所有画布上图片的大小时，保持其为正方形 */
function updateAllImageSize(h: number) {
  const imageSize = h - 24;
  freeItems.value.forEach((it) => {
    it.h = imageSize;
    it.w = imageSize;
  });
}

/** 应用设置中的行高，并更新所有图片尺寸 */
function applyDefaultHeight() {
  updateAllImageSize(defaultRowHeightPx.value);
}

/** 计算新图片默认生成的位置 (最底行的顶部) */
function calcBottomY() {
  return (
    tiers.value.length * defaultRowHeightPx.value - defaultRowHeightPx.value
  );
}

/** 从图库添加一个或多个图片到画布上 */
function addToCanvas(items: GalleryItem[]) {
  const imageSize = defaultRowHeightPx.value - 24;
  items.forEach((it, idx) => {
    freeItems.value.push({
      id: it.id,
      src: it.src,
      x: 10 + idx * 20, // 初始 x 坐标，相对于标签列
      y: calcBottomY() - 8,
      h: imageSize,
      w: imageSize,
    });
  });
}

/** 更新画布上某个图片的位置 */
function updatePos(id: string, x: number, y: number) {
  const t = freeItems.value.find((i) => i.id === id);
  if (t) {
    t.x = x;
    t.y = y;
  }
}

/** 处理从图库拖拽图片到画布的逻辑 */
function onCanvasDrop(e: DragEvent) {
  if (!canvasRef.value || !e.dataTransfer) return;
  const id = e.dataTransfer.getData('text/plain');
  if (!id) return;
  const item = gallery.value.find((g) => g.id === id);
  if (!item) return;

  const rect = canvasRef.value.getBoundingClientRect();
  const imageSize = defaultRowHeightPx.value - 24;

  // 读取拖拽开始时记录的鼠标抓取位置
  const dragMeta = JSON.parse(
    e.dataTransfer.getData('application/json') || 'null',
  );
  const offsetX = dragMeta?.offsetX || imageSize / 2;
  const offsetY = dragMeta?.offsetY || imageSize / 2;

  // 计算光标在画布内的绝对坐标
  const absoluteX = e.clientX - rect.left + canvasRef.value.scrollLeft;
  const absoluteY = e.clientY - rect.top + canvasRef.value.scrollTop;

  // 根据抓取位置，反推出图片左上角的精确坐标
  const finalX = absoluteX - offsetX;
  const finalY = absoluteY - offsetY;

  // 将绝对X坐标转换为相对于标签列的坐标
  const relativeX = finalX - defaultLabelWidthPx.value;

  freeItems.value.push({
    id: item.id,
    src: item.src,
    x: Math.max(0, relativeX), // 确保相对x坐标不为负
    y: finalY,
    h: imageSize,
    w: imageSize,
  });
  // 从图库中移除已拖拽的图片
  gallery.value = gallery.value.filter((g) => g.id !== item.id);
}

/** 删除一个图片，无论它是在画布上还是在图库里 */
function deleteImage(id: string | number) {
  let idx = freeItems.value.findIndex((it) => it.id === id);
  if (idx !== -1) {
    freeItems.value.splice(idx, 1);
    return;
  }
  idx = gallery.value.findIndex((it) => it.id === id);
  if (idx !== -1) {
    gallery.value.splice(idx, 1);
  }
}

/** 恢复为默认设置 (不包括画布上的图片) */
function resetToDefaults() {
  tiers.value = JSON.parse(JSON.stringify(defaultTiers));
  defaultRowHeightPx.value = initialRowHeight;
  defaultLabelWidthPx.value = initialLabelWidth;
}

/** 新增一个默认等级行 */
function addTier() {
  tiers.value.push({
    id: String(Date.now()),
    label: '新等级',
    color: '#d1d5db',
  });
}

/** 根据 ID 删除一个等级行 */
function removeTier(id: string) {
  tiers.value = tiers.value.filter((t) => t.id !== id);
}

/**
 * 管理整个看板状态的核心 store
 * 这个函数现在只作为入口，返回已经创建好的单例对象
 */
export function useBoardStore() {
  return {
    canvasRef,
    tiers,
    defaultRowHeightPx,
    defaultLabelWidthPx,
    gallery,
    freeItems,
    showSettings,
    applyDefaultHeight,
    addToCanvas,
    updatePos,
    updateAllImageSize,
    onCanvasDrop,
    resetToDefaults,
    deleteImage,
    addTier,
    removeTier,
  };
}
