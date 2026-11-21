import { computed, ref } from 'vue';
import { useStorage } from '@vueuse/core';
import { createFoodDemo } from './foodDemo.ts';

// --- 类型定义 ---

type Position = {
  x: number; // 相对于标签列的 x 坐标
  y: number;
};

/** 底部图库的图片项 */
export type GalleryItem = { id: string; src: string };
type FreeItem = GalleryItem & Position;

export const galleryDragType = 'application/x-hangorla-image';

/** 等级行定义 */
export type Tier = {
  id: string;
  label: string;
  color: string;
  showBorder?: boolean;
  borderColor?: string;
};

export const defaultBorderColor = '#000000';

/** 默认的等级行配置 */
const defaultTiers: Tier[] = [
  { id: 'hang', label: '夯', color: '#ef4444' },
  { id: 'top', label: '顶级', color: '#f59e0b' },
  { id: 'ren', label: '人上人', color: '#facc15' },
  { id: 'npc', label: 'NPC', color: '#fde68a' },
  { id: 'la', label: '拉', color: '#e5e7eb' },
];

const initialLabelWidth = 240;

function fittedRowHeight(viewportHeight: number, rowCount: number) {
  // 留出图库顶部的 1px 边框，并向下取整以免最后一行被裁切。
  return Math.max(
    60,
    Math.floor(((viewportHeight - 1) / (rowCount + 1)) * 64) / 64,
  );
}

// --- 单例状态 (Singleton State) ---
// 在函数外部定义，确保整个应用只创建一次

/** 画布容器的 DOM 引用 */
const canvasRef = ref<HTMLDivElement | null>(null);

// 持久化状态
const tiers = useStorage(
  'boardTiers',
  defaultTiers.map((tier) => ({ ...tier })),
);
const defaultRowHeightPx = ref(
  fittedRowHeight(window.innerHeight, tiers.value.length),
);
const defaultLabelWidthPx = useStorage('boardLabelWidth', initialLabelWidth);
const imageFitMode = useStorage<'cover' | 'contain'>('boardImageFit', 'cover');

// 瞬时状态
const gallery = ref<GalleryItem[]>([]);
const freeItems = ref<FreeItem[]>([]);
const demoSeen = useStorage('boardFoodDemoSeen', false);
const showingDemo = ref(!demoSeen.value);
if (showingDemo.value) {
  const demo = createFoodDemo(tiers.value.length, defaultRowHeightPx.value);
  gallery.value = demo.gallery;
  freeItems.value = demo.freeItems;
  demoSeen.value = true;
}
const showSettings = ref(false);
const placementMessage = ref('');
const selectedTierId = ref<string>();
const galleryHovered = ref(false);
const draggingGalleryOffset = ref<{ id: string; offsetX: number; offsetY: number }>();
const dropPreview = ref<(Position & { valid: boolean }) | undefined>();
let messageTimer: ReturnType<typeof setTimeout> | undefined;

function setPlacementMessage(msg: string) {
  if (messageTimer !== undefined) {
    clearTimeout(messageTimer);
    messageTimer = undefined;
  }
  placementMessage.value = msg;
  if (msg) {
    messageTimer = setTimeout(() => {
      placementMessage.value = '';
      messageTimer = undefined;
    }, 3000);
  }
}

const automaticTier = computed(
  () =>
    tiers.value.find((tier) => tier.id === selectedTierId.value) ??
    tiers.value[tiers.value.length - 1],
);

const imageGap = 8;
const snapDistance = 8;
const pixelTolerance = 0.0001;
const boardHeight = computed(
  () => tiers.value.length * defaultRowHeightPx.value,
);
const minBoardWidth = computed(() => {
  const rightEdge = freeItems.value.reduce(
    (right, item) => Math.max(right, item.x + defaultRowHeightPx.value),
    defaultRowHeightPx.value + imageGap * 2,
  );
  return defaultLabelWidthPx.value + rightEdge;
});

// --- 核心函数 (Functions) ---
// 同样在函数外部定义，以便它们能访问到上面的单例状态

function fitRowHeight(viewportHeight: number) {
  const next = fittedRowHeight(viewportHeight, tiers.value.length);
  const scale = next / defaultRowHeightPx.value;
  if (scale === 1) return;
  // 图片和坐标使用同一比例，分隔线上的位置和图片间距都能保留。
  for (const item of freeItems.value) {
    item.x *= scale;
    item.y *= scale;
  }
  defaultRowHeightPx.value = next;
}

function getBoardWidth() {
  const width = canvasRef.value?.getBoundingClientRect().width ?? 0;
  const maxItemRight = freeItems.value.reduce(
    (right, item) => Math.max(right, item.x + defaultRowHeightPx.value),
    0,
  );
  const dynamicMax = maxItemRight + defaultRowHeightPx.value + imageGap * 2;
  return Math.max(width - defaultLabelWidthPx.value, dynamicMax);
}

function positionAt(clientX: number, clientY: number): Position {
  const rect = canvasRef.value?.getBoundingClientRect();
  return {
    x: clientX - (rect?.left ?? 0) - defaultLabelWidthPx.value,
    y: clientY - (rect?.top ?? 0),
  };
}

function limitPosition(x: number, y: number): Position {
  const size = defaultRowHeightPx.value;
  return {
    x: Math.max(0, Math.min(getBoardWidth() - size, x)),
    y: Math.max(0, Math.min(boardHeight.value - size, y)),
  };
}

function getAlignment(position: Position) {
  const height = defaultRowHeightPx.value;
  const halfHeight = height / 2;
  const centerY = position.y + halfHeight;
  const boundaryY = Math.round(centerY / height) * height;
  const row = { x: position.x, y: Math.floor(centerY / height) * height };
  const divider =
    boundaryY > 0 &&
    boundaryY < boardHeight.value &&
    Math.abs(boundaryY - centerY) <= snapDistance
      ? { x: position.x, y: boundaryY - halfHeight }
      : undefined;
  return { row, divider };
}

function positionForMove(
  x: number,
  y: number,
  startY?: number,
  precise = false,
) {
  const position = limitPosition(x, y);
  if (precise) return position;
  const height = defaultRowHeightPx.value;
  const halfHeight = height / 2;
  const rowY = Math.round(position.y / height) * height;
  if (Math.abs(position.y - rowY) <= snapDistance) {
    return { x: position.x, y: rowY };
  }
  const centerY = position.y + halfHeight;
  const boundaryY = Math.round(centerY / height) * height;
  if (
    boundaryY > 0 &&
    boundaryY < boardHeight.value &&
    Math.abs(boundaryY - centerY) <= snapDistance
  ) {
    return { x: position.x, y: boundaryY - halfHeight };
  }
  if (startY !== undefined && Math.abs(position.y - startY) < halfHeight) {
    return position;
  }
  return getAlignment(position).row;
}

function overlaps(a: Position, b: Position) {
  const size = defaultRowHeightPx.value - pixelTolerance;
  return Math.abs(a.x - b.x) < size && Math.abs(a.y - b.y) < size;
}

function placeFromGallery(item: GalleryItem, position: Position) {
  freeItems.value.push({ ...item, ...position });
  gallery.value = gallery.value.filter((g) => g.id !== item.id);
  setPlacementMessage('');
}

function addToCanvas(item: GalleryItem) {
  if (!gallery.value.some((other) => other.id === item.id)) return;
  const tier = automaticTier.value;
  if (!tier) {
    setPlacementMessage('请先在设置里添加一个等级。');
    return;
  }

  const size = defaultRowHeightPx.value;
  const row = tiers.value.indexOf(tier);
  const y = row * size;
  const occupied = freeItems.value
    .filter((other) => Math.abs(other.y - y) < size - pixelTolerance)
    .sort((a, b) => a.x - b.x);
  let x = imageGap;
  for (const other of occupied) {
    if (x + size <= other.x + pixelTolerance) break;
    x = Math.max(x, other.x + size + imageGap);
  }

  const position = { x, y };
  placeFromGallery(item, position);
  return position;
}

function selectTier(id: string) {
  selectedTierId.value = id;
  setPlacementMessage('');
}

function rowOf(item: Position) {
  const height = defaultRowHeightPx.value;
  const row = Math.floor((item.y + pixelTolerance) / height);
  return item.y + height <= (row + 1) * height + pixelTolerance ? row : -1;
}

function hasBottomBorder(position: Position) {
  const tier = tiers.value[rowOf(position)];
  return !!tier && tier.showBorder !== false;
}

function canPlaceOrSwap(id: string, position: Position) {
  const item = freeItems.value.find((other) => other.id === id);
  if (!item) return false;

  const collisions = freeItems.value.filter(
    (other) => other.id !== id && overlaps(position, other),
  );
  if (!collisions.length) return true;

  const row = rowOf(item);
  if (row === -1) return false;
  const halfSize = defaultRowHeightPx.value / 2;
  const target = collisions.find(
    (other) =>
      rowOf(other) === row &&
      Math.abs(position.x - other.x) < halfSize &&
      Math.abs(position.y - other.y) < halfSize,
  );
  return !!target;
}

function updatePos(id: string, position: Position) {
  const item = freeItems.value.find((other) => other.id === id);
  if (!item) return;

  setPlacementMessage('');
  const collisions = freeItems.value.filter(
    (other) => other.id !== id && overlaps(position, other),
  );
  if (!collisions.length) {
    Object.assign(item, position);
    return;
  }

  const row = rowOf(item);
  if (row === -1) {
    setPlacementMessage('位置重叠，跨行图片无法与其它图片交换。');
    return;
  }
  const halfSize = defaultRowHeightPx.value / 2;
  const target = collisions.find(
    (other) =>
      rowOf(other) === row &&
      Math.abs(position.x - other.x) < halfSize &&
      Math.abs(position.y - other.y) < halfSize,
  );
  if (!target) {
    setPlacementMessage('这个位置已有图片，仅同一等级行内的图片可对调交换。');
    return;
  }

  // 两张图片尺寸相同，交换坐标后仍占用原来的两个区域。
  const { x, y } = item;
  Object.assign(item, { x: target.x, y: target.y });
  Object.assign(target, { x, y });
}

function startGalleryDrag(id: string, offsetX: number, offsetY: number) {
  draggingGalleryOffset.value = { id, offsetX, offsetY };
}

function endGalleryDrag() {
  draggingGalleryOffset.value = undefined;
  dropPreview.value = undefined;
}

function onCanvasDragOver(event: DragEvent) {
  const drag = draggingGalleryOffset.value;
  if (!drag || !tiers.value.length) {
    dropPreview.value = undefined;
    return;
  }
  const pointer = positionAt(event.clientX, event.clientY);
  const position = limitPosition(
    pointer.x - drag.offsetX,
    pointer.y - drag.offsetY,
  );
  const { row, divider } = getAlignment(position);
  if (divider && !freeItems.value.some((other) => overlaps(divider, other))) {
    dropPreview.value = { ...divider, valid: true };
    return;
  }
  const valid = !freeItems.value.some((other) => overlaps(row, other));
  dropPreview.value = { ...row, valid };
}

function onCanvasDrop(event: DragEvent) {
  endGalleryDrag();
  const data = event.dataTransfer?.getData(galleryDragType);
  if (!data || !tiers.value.length) return;
  const [id, rawOffsetX, rawOffsetY] = data.split(',');
  const item = gallery.value.find((other) => other.id === id);
  const offsetX = Number(rawOffsetX);
  const offsetY = Number(rawOffsetY);
  if (!item || !Number.isFinite(offsetX) || !Number.isFinite(offsetY)) return;

  const pointer = positionAt(event.clientX, event.clientY);
  const position = limitPosition(pointer.x - offsetX, pointer.y - offsetY);
  const { row, divider } = getAlignment(position);
  if (divider && !freeItems.value.some((other) => overlaps(divider, other))) {
    placeFromGallery(item, divider);
    return;
  }

  if (freeItems.value.some((other) => overlaps(row, other))) {
    setPlacementMessage('这个位置已有图片，请找一处空位。');
    return;
  }
  placeFromGallery(item, row);
}

function deleteGalleryImage(id: string) {
  setPlacementMessage('');
  const idx = gallery.value.findIndex((item) => item.id === id);
  if (idx !== -1) {
    const [item] = gallery.value.splice(idx, 1);
    if (item?.src.startsWith('blob:')) URL.revokeObjectURL(item.src);
  }
}

function returnImagesToGallery(shouldReturn: (item: FreeItem) => boolean) {
  freeItems.value = freeItems.value.filter((item) => {
    if (!shouldReturn(item)) return true;
    gallery.value.push({ id: item.id, src: item.src });
    return false;
  });
}

function returnImageToGallery(id: string) {
  returnImagesToGallery((item) => item.id === id);
  setPlacementMessage('');
}

function clearBoard() {
  for (const item of [...gallery.value, ...freeItems.value]) {
    if (item.src.startsWith('blob:')) URL.revokeObjectURL(item.src);
  }
  gallery.value = [];
  freeItems.value = [];
  showingDemo.value = false;
  endGalleryDrag();
  setPlacementMessage('');
}

function resetToDefaults() {
  tiers.value = defaultTiers.map((tier) => ({ ...tier }));
  selectedTierId.value = undefined;
  defaultLabelWidthPx.value = initialLabelWidth;
  imageFitMode.value = 'cover';
  returnImagesToGallery(
    (item) =>
      item.y + defaultRowHeightPx.value > boardHeight.value + pixelTolerance,
  );
  setPlacementMessage('');
}

/** 新增一个默认等级行 */
function addTier() {
  tiers.value.push({
    id: String(Date.now()),
    label: '新等级',
    color: '#d1d5db',
  });
  setPlacementMessage('');
}

/** 根据 ID 删除一个等级行 */
function removeTier(id: string) {
  const index = tiers.value.findIndex((tier) => tier.id === id);
  if (index === -1) return;
  const height = defaultRowHeightPx.value;
  const top = index * height;
  const bottom = top + height;
  returnImagesToGallery(
    (item) =>
      item.y < bottom - pixelTolerance &&
      item.y + height > top + pixelTolerance,
  );
  for (const item of freeItems.value) {
    if (item.y >= bottom - pixelTolerance) item.y -= height;
  }
  tiers.value.splice(index, 1);
  if (selectedTierId.value === id) selectedTierId.value = undefined;
  setPlacementMessage('');
}

/** 调整等级行顺序（从 fromIndex 移到 toIndex） */
function moveTier(fromIndex: number, toIndex: number) {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= tiers.value.length ||
    toIndex >= tiers.value.length
  ) {
    return;
  }
  const height = defaultRowHeightPx.value;
  const top = Math.min(fromIndex, toIndex) * height;
  const bottom = (Math.max(fromIndex, toIndex) + 1) * height;
  // 跨行图片无法跟随单个等级移动，先回图库以免重排后重叠。
  returnImagesToGallery(
    (item) =>
      rowOf(item) === -1 &&
      item.y < bottom - pixelTolerance &&
      item.y + height > top + pixelTolerance,
  );
  for (const item of freeItems.value) {
    const row = rowOf(item);
    if (row === fromIndex) {
      item.y = toIndex * height;
    } else if (fromIndex < toIndex && row > fromIndex && row <= toIndex) {
      item.y = (row - 1) * height;
    } else if (fromIndex > toIndex && row >= toIndex && row < fromIndex) {
      item.y = (row + 1) * height;
    }
  }
  const [moved] = tiers.value.splice(fromIndex, 1);
  if (moved) tiers.value.splice(toIndex, 0, moved);
  setPlacementMessage('');
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
    imageFitMode,
    gallery,
    freeItems,
    showingDemo,
    showSettings,
    minBoardWidth,
    placementMessage,
    automaticTier,
    galleryHovered,
    dropPreview,
    addToCanvas,
    updatePos,
    canPlaceOrSwap,
    fitRowHeight,
    positionAt,
    positionForMove,
    hasBottomBorder,
    startGalleryDrag,
    endGalleryDrag,
    onCanvasDragOver,
    onCanvasDrop,
    resetToDefaults,
    selectTier,
    deleteGalleryImage,
    returnImageToGallery,
    clearBoard,
    addTier,
    removeTier,
    moveTier,
  };
}
