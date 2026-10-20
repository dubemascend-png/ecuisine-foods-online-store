/* Applies eCuisine's dimensional styling to emoji in static and dynamic page text. */
(() => {
  const emojiPattern = /\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u{1F3FB}-\u{1F3FF})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F)?(?:\u{1F3FB}-\u{1F3FF})?)*(?:\u{1F1E6}-\u{1F1FF}){0,2}/gu;
  const skip = new Set(["SCRIPT","STYLE","TEXTAREA","INPUT","OPTION","CODE","PRE","NOSCRIPT"]);
  function hasEmoji(value) {
    emojiPattern.lastIndex = 0;
    return emojiPattern.test(value);
  }
  function decorate(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement;
        if (!p || skip.has(p.tagName) || p.closest(".emoji-3d,[contenteditable='true']")) return NodeFilter.FILTER_REJECT;
        return hasEmoji(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const value = node.nodeValue;
      const frag = document.createDocumentFragment();
      let last = 0;
      emojiPattern.lastIndex = 0;
      for (const match of value.matchAll(emojiPattern)) {
        frag.append(document.createTextNode(value.slice(last, match.index)));
        const span = document.createElement("span");
        span.className = "emoji-3d";
        span.setAttribute("aria-hidden", "true");
        span.textContent = match[0];
        frag.append(span);
        last = match.index + match[0].length;
      }
      frag.append(document.createTextNode(value.slice(last)));
      node.replaceWith(frag);
    }
  }
  function start() {
    decorate(document.body);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE) decorate(node.parentElement);
          else if (node.nodeType === Node.ELEMENT_NODE) decorate(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();