/** Decorative SVGs use currentColor so phones never substitute colored emoji. */
export const arrowUpRightIcon =
  '<svg class="ui-icon icon-arrow-up-right" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10"/></svg>';
export function heartIcon(saved = false): string {
  return `<svg class="ui-icon icon-heart" viewBox="0 0 24 24" width="24" height="24" fill="${saved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"/></svg>`;
}
/** Run after translation, including content added by filters and guest previews. */
export function decorateIcons(root: HTMLElement): void {
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, 4 /* SHOW_TEXT */);
  const nodes: Node[] = [];
  let current: Node | null;
  while ((current = walker.nextNode())) {
    if (current.parentElement?.closest('svg, script, style, [data-no-translate], textarea, option'))
      continue;
    if (/[↗♡♥]/.test(current.textContent ?? '')) nodes.push(current);
  }
  for (const node of nodes) {
    const fragment = doc.createDocumentFragment();
    for (const part of (node.textContent ?? '').split(/(↗\uFE0F?|♡|♥)/u)) {
      if (!part) continue;
      const markup = part.startsWith('↗')
        ? arrowUpRightIcon
        : part === '♡' || part === '♥'
          ? heartIcon(part === '♥')
          : null;
      if (markup) {
        const template = doc.createElement('template');
        template.innerHTML = markup;
        fragment.append(template.content);
      } else fragment.append(doc.createTextNode(part));
    }
    node.parentNode?.replaceChild(fragment, node);
  }
}
