const canvas = document.createElement('canvas');
canvas.width = canvas.height = 1;
const context = canvas.getContext('2d', { willReadFrequently: true });

export function getTextColor(background: string) {
  if (!context) return '#222222';
  // 由浏览器解析颜色，兼容 HEX、RGB、HSL 及透明背景。
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, 1, 1);
  context.fillStyle = background;
  context.fillRect(0, 0, 1, 1);
  const [r = 255, g = 255, b = 255] = context.getImageData(0, 0, 1, 1).data;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.55
    ? '#ffffff'
    : '#222222';
}
