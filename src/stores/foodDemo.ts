import type { GalleryItem } from './useBoardStore.ts';

const foods: [string, string, string, number | undefined, number][] = [
  ['火锅', '🥘', '#fff1e6', 0, 0],
  ['饺子', '🥟', '#fff8e5', 0, 1],
  ['寿司', '🍣', '#ffedf0', 0, 2],
  ['烤肉', '🍖', '#ffefdf', 1, 0],
  ['拉面', '🍜', '#fff5df', 1, 1],
  ['披萨', '🍕', '#fff0da', 2, 0],
  ['汉堡', '🍔', '#f5f1df', 2, 1],
  ['白米饭', '🍚', '#eef4f7', 3, 0],
  ['沙拉', '🥗', '#eef6e9', 3, 1],
  ['水煮西兰花', '🥦', '#edf4ed', 4, 0],
  ['蛋糕', '🍰', '#fff0f5', 1.5, 3],
  ['薯条', '🍟', '#fff4d9', undefined, 0],
  ['冰淇淋', '🍦', '#f7efff', undefined, 0],
  ['奶茶', '🧋', '#f6ecdf', undefined, 0],
];

export function createFoodDemo(rowCount: number, size: number) {
  const gallery: GalleryItem[] = [];
  const freeItems: (GalleryItem & { x: number; y: number })[] = [];
  foods.forEach(([name, emoji, color, row, column], index) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
      <rect width="240" height="240" rx="16" fill="${color}"/>
      <circle cx="120" cy="100" r="72" fill="white" fill-opacity=".65"/>
      <text x="120" y="132" text-anchor="middle" font-size="90" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${emoji}</text>
      <text x="120" y="204" text-anchor="middle" font-size="25" font-weight="600" fill="#3f3f46" font-family="system-ui,sans-serif">${name}</text>
    </svg>`;
    const item = {
      id: `food-demo-${index}`,
      src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
    };
    if (row === undefined || row + 1 > rowCount) gallery.push(item);
    else freeItems.push({ ...item, x: 8 + column * (size + 8), y: row * size });
  });
  return { gallery, freeItems };
}
