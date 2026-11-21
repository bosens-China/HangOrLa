import { ref, watch, type Ref } from 'vue';

export function useHorizontalScroll(
  viewport: Ref<HTMLDivElement | null>,
  content: Ref<HTMLDivElement | null>,
) {
  const width = ref(0);
  const offset = ref(0);
  const limit = ref(0);

  function sync() {
    const element = viewport.value;
    if (!element) return;
    width.value = element.clientWidth;
    offset.value = element.scrollLeft;
    limit.value = Math.max(0, element.scrollWidth - element.clientWidth);
  }

  function scrollTo(left: number) {
    if (!viewport.value) return;
    viewport.value.scrollLeft = left;
    sync();
  }

  watch(
    [viewport, content],
    ([view, items], _, onCleanup) => {
      if (!view || !items) return;
      const observer = new ResizeObserver(sync);
      observer.observe(view);
      observer.observe(items);
      onCleanup(() => observer.disconnect());
      sync();
    },
    { flush: 'post' },
  );

  return { width, offset, limit, sync, scrollTo };
}
