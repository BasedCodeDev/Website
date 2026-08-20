const GLYPHS = "~+#%*?:/@[]|$^";
const activeAnimations = new Set<{ cancelled: boolean }>();

function ensureStyles() {
  if (document.getElementById("basedcode-ripple-styles")) return;

  const style = document.createElement("style");
  style.id = "basedcode-ripple-styles";
  style.textContent = ".ripple-char{display:inline-block;white-space:pre;vertical-align:baseline;}";
  document.head.appendChild(style);
}

function buildSlots(element: Element) {
  ensureStyles();
  const slots: HTMLSpanElement[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!node.nodeValue?.trim() || parent?.classList.contains("ripple-char")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  nodes.forEach((node) => {
    const fragment = document.createDocumentFragment();
    Array.from(node.nodeValue ?? "").forEach((character) => {
      const slot = document.createElement("span");
      slot.className = "ripple-char";
      slot.dataset.original = character;
      slot.textContent = character;
      fragment.appendChild(slot);
      slots.push(slot);
    });
    node.parentNode?.replaceChild(fragment, node);
  });

  return slots;
}

export function scrambleReveal(element: Element, options: { duration?: number; delay?: number; preserveText?: boolean } = {}) {
  const slots = buildSlots(element);
  if (!slots.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return Promise.resolve();

  const animation = { cancelled: false };
  activeAnimations.add(animation);
  const duration = options.duration ?? 900;
  const delay = options.delay ?? 0;
  const startedAt = performance.now() + delay;

  return new Promise<void>((resolve) => {
    const tick = (now: number) => {
      if (animation.cancelled) {
        activeAnimations.delete(animation);
        resolve();
        return;
      }

      const progress = Math.min(1, Math.max(0, (now - startedAt) / duration));
      const head = progress * (slots.length + 8) - 8;
      slots.forEach((slot, index) => {
        if (index <= head - 1 || progress >= 1) {
          slot.textContent = slot.dataset.original ?? "";
        } else if (index <= head + 7) {
          slot.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
      });

      if (progress < 1) requestAnimationFrame(tick);
      else {
        activeAnimations.delete(animation);
        resolve();
      }
    };

    requestAnimationFrame(tick);
  });
}

export function cancelAnimations() {
  activeAnimations.forEach((animation) => { animation.cancelled = true; });
  activeAnimations.clear();
}
