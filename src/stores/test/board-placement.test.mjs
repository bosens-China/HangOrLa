import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.window = { innerHeight: 601 };
const { galleryDragType, useBoardStore } = await import('../useBoardStore.ts');

test('starts with an editable food demo and does not restore it after clearing', () => {
  const board = useBoardStore();
  assert.equal(board.showingDemo.value, true);
  assert.equal(board.freeItems.value.length, 11);
  assert.equal(board.gallery.value.length, 3);
  assert.equal(
    new Set(
      [...board.freeItems.value, ...board.gallery.value].map((item) => item.id),
    ).size,
    14,
  );
  assert.ok(
    board.freeItems.value.every((item) =>
      item.src.startsWith('data:image/svg+xml'),
    ),
  );
  assert.ok(board.freeItems.value.some((item) => item.y === 150));
  board.clearBoard();
  assert.equal(board.showingDemo.value, false);
  assert.deepEqual(useBoardStore().freeItems.value, []);
  assert.deepEqual(useBoardStore().gallery.value, []);
});

test('aligns new drops to rows or dividers without disturbing swaps and collision checks', () => {
  const board = useBoardStore();
  board.clearBoard();
  board.canvasRef.value = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 560 }),
  };
  const [tea, hotpot, barbecue, noodles, soup, cake] = [
    'tea',
    'hotpot',
    'barbecue',
    'noodles',
    'soup',
    'cake',
  ].map((id) => ({ id, src: id }));
  board.gallery.value = [tea, hotpot, barbecue, noodles, soup, cake];

  function drop(id, x, y) {
    board.onCanvasDrop({
      clientX: x + board.defaultLabelWidthPx.value,
      clientY: y,
      dataTransfer: {
        getData: (type) => (type === galleryDragType ? `${id},0,0` : ''),
      },
    });
  }
  function position(id) {
    const { x, y } = board.freeItems.value.find((item) => item.id === id);
    return { x, y };
  }

  drop('cake', 23, 132);
  assert.deepEqual(position('cake'), { x: 23, y: 100 });
  assert.ok(board.hasBottomBorder(position('cake')));
  board.updatePos('cake', board.positionForMove(23, 147, 100));
  assert.deepEqual(position('cake'), { x: 23, y: 150 });
  assert.equal(board.hasBottomBorder(position('cake')), false);
  board.updatePos('cake', board.positionForMove(23, 206, 150));
  assert.deepEqual(position('cake'), { x: 23, y: 200 });
  board.updatePos('cake', board.positionForMove(23, 218, 200));
  assert.deepEqual(position('cake'), { x: 23, y: 218 });
  assert.deepEqual(board.positionForMove(23, 204, 218, true), {
    x: 23,
    y: 204,
  });
  board.updatePos('cake', board.positionForMove(23, 105, 218));
  assert.deepEqual(position('cake'), { x: 23, y: 100 });
  drop('tea', 0, 345);
  assert.deepEqual(position('tea'), { x: 0, y: 350 });
  board.addToCanvas(hotpot);
  board.addToCanvas(barbecue);
  assert.deepEqual(position('hotpot'), { x: 108, y: 400 });
  assert.deepEqual(position('barbecue'), { x: 216, y: 400 });
  board.selectTier('npc');
  board.addToCanvas(soup);
  assert.deepEqual(position('soup'), { x: 108, y: 300 });
  board.updatePos('soup', position('hotpot'));
  assert.deepEqual(position('soup'), { x: 108, y: 300 });
  board.selectTier('la');

  drop('noodles', 0, 350);
  assert.deepEqual(board.gallery.value, [noodles]);
  assert.deepEqual(board.addToCanvas(noodles), { x: 324, y: 400 });
  assert.deepEqual(board.gallery.value, []);
  assert.equal(board.minBoardWidth.value, 664);
  board.updatePos('hotpot', position('barbecue'));
  assert.deepEqual(position('hotpot'), { x: 216, y: 400 });
  assert.deepEqual(position('barbecue'), { x: 108, y: 400 });

  board.updatePos('tea', { x: 0, y: 347 });
  board.updatePos('tea', position('hotpot'));
  assert.deepEqual(position('tea'), { x: 0, y: 347 });
  assert.deepEqual(position('hotpot'), { x: 216, y: 400 });

  board.fitRowHeight(901);
  assert.equal(board.defaultRowHeightPx.value, 150);
  assert.deepEqual(position('tea'), { x: 0, y: 520.5 });
  assert.deepEqual(position('hotpot'), { x: 324, y: 600 });
  board.removeTier('la');
  assert.deepEqual(
    board.freeItems.value.map((item) => item.id),
    ['cake', 'soup'],
  );
  assert.equal(board.gallery.value.length, 4);
  board.resetToDefaults();
  board.fitRowHeight(601);
  assert.equal(board.automaticTier.value.id, 'la');
});

test('aligns large moves while preserving small moves and Shift precision', () => {
  const board = useBoardStore();
  board.clearBoard();
  board.resetToDefaults();
  board.fitRowHeight(601);
  assert.deepEqual(board.positionForMove(8, 132, 0), { x: 8, y: 100 });
  assert.deepEqual(board.positionForMove(8, 132, 0, true), { x: 8, y: 132 });
  assert.deepEqual(board.positionForMove(8, 218, 200), { x: 8, y: 218 });
  assert.deepEqual(board.positionForMove(8, 249, 0), { x: 8, y: 250 });
});

test('returns affected cross-row images before reordering without touching unrelated images', () => {
  const board = useBoardStore();
  for (const [from, to] of [
    [2, 1],
    [1, 2],
    [0, 3],
    [3, 0],
  ]) {
    board.clearBoard();
    board.resetToDefaults();
    board.freeItems.value = [
      { id: 'divider', src: 'a', x: 8, y: 50 },
      { id: 'aligned', src: 'b', x: 8, y: 200 },
      { id: 'unrelated', src: 'c', x: 200, y: 350 },
    ];
    const originalId = board.tiers.value[from].id;
    board.moveTier(from, to);
    assert.equal(board.tiers.value[to].id, originalId);
    assert.ok(board.gallery.value.some((item) => item.id === 'divider'));
    if (from < 3 && to < 3) {
      assert.equal(
        board.freeItems.value.find((item) => item.id === 'unrelated').y,
        350,
      );
    }
    for (const a of board.freeItems.value) {
      for (const b of board.freeItems.value) {
        if (a.id !== b.id)
          assert.ok(Math.abs(a.x - b.x) >= 100 || Math.abs(a.y - b.y) >= 100);
      }
    }
  }
  board.clearBoard();
  board.resetToDefaults();
});

test('returns a placed local image to the gallery and releases it only after gallery deletion', async () => {
  const board = useBoardStore();
  board.clearBoard();
  board.canvasRef.value = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 510 }),
  };
  const src = URL.createObjectURL(new Blob(['local image']));
  const item = { id: 'local-image', src };
  try {
    board.gallery.value = [item];
    board.addToCanvas(item);
    assert.ok(board.freeItems.value.some((entry) => entry.id === item.id));
    assert.equal(await (await fetch(src)).text(), 'local image');
    board.returnImageToGallery(item.id);
    assert.ok(!board.freeItems.value.some((entry) => entry.id === item.id));
    assert.deepEqual(board.gallery.value, [item]);
    assert.equal(await (await fetch(src)).text(), 'local image');
    board.deleteGalleryImage(item.id);
    assert.equal(board.gallery.value.length, 0);
    await assert.rejects(fetch(src));
  } finally {
    URL.revokeObjectURL(src);
  }
});

test('clearing releases images from both areas and keeps tier settings', async () => {
  const board = useBoardStore();
  const gallerySrc = URL.createObjectURL(new Blob(['gallery']));
  const placedSrc = URL.createObjectURL(new Blob(['placed']));
  board.gallery.value = [{ id: 'gallery', src: gallerySrc }];
  board.freeItems.value = [{ id: 'placed', src: placedSrc, x: 8, y: 0 }];
  board.tiers.value[0].label = '我的最爱';
  board.defaultLabelWidthPx.value = 180;
  board.imageFitMode.value = 'contain';
  board.startGalleryDrag('gallery', 0, 0);
  board.dropPreview.value = { x: 0, y: 0, valid: true };
  board.clearBoard();
  assert.deepEqual(board.gallery.value, []);
  assert.deepEqual(board.freeItems.value, []);
  assert.equal(board.dropPreview.value, undefined);
  assert.equal(board.tiers.value[0].label, '我的最爱');
  assert.equal(board.defaultLabelWidthPx.value, 180);
  assert.equal(board.imageFitMode.value, 'contain');
  await assert.rejects(fetch(gallerySrc));
  await assert.rejects(fetch(placedSrc));
  board.resetToDefaults();
});
