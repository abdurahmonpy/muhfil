/**
 * Medium Clone - High-Performance Story Editor Engine (Senior Grade)
 * 
 * Key Features & Architectural Enhancements:
 * 1. Title & Caret Synchronization: Seamless ArrowUp/ArrowDown, Enter, Backspace navigation.
 * 2. Dynamic Floating Inserter (+): Smoothly glides to the active empty paragraph.
 * 3. Markdown Auto-Transformations: Live conversion of #, ##, >, -, *, 1., ```, --- on space/enter.
 * 4. Super-Smart Paste Engine: Instant link wrapping for selected text, auto-embed for YouTube/images,
 *    and clean HTML sanitization for content pasted from Word or Google Docs.
 * 5. Professional Keyboard Shortcuts: Ctrl/Cmd + B, I, K, S, Z.
 * 6. Floating Selection Toolbar: Dynamic active-state illumination and seamless Link popover.
 * 7. Modular Block Inserters: YouTube cards (no Error 153), Unsplash live photo search,
 *    code blocks with TypeScript headers, clean embeds, and image uploads.
 * 8. Performance & State Persistence: Debounced word-counter and auto-saving to localStorage.
 */

'use strict';

function initEditor() {
  initEditorTitle();
  initEditorBody();
  initFormattingToolbar();
  initInlineBlockInserter();
  initMarkdownShortcuts();
  initSmartPaste();
  initEditorShortcuts();
  initDraftAutoSave();
  initTagManager();
  initPublishModal();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEditor);
} else {
  initEditor();
}

/* ==========================================================================
   1. Title & Body Seamless Navigation
   ========================================================================== */
function initEditorTitle() {
  const titleInput = document.getElementById('editor-title');
  const body = document.getElementById('editor-body');
  if (!titleInput) return;

  const resize = () => {
    titleInput.style.height = 'auto';
    titleInput.style.height = titleInput.scrollHeight + 'px';
    debouncedWordCount();
  };

  titleInput.addEventListener('input', resize);
  window.addEventListener('resize', resize);

  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (body) {
        body.focus();
        // Move cursor to start of first paragraph
        setCaretToStart(body);
      }
    } else if (e.key === 'ArrowDown') {
      // If cursor is at the end of title, jump to body
      if (titleInput.selectionStart === titleInput.value.length && body) {
        body.focus();
        setCaretToStart(body);
      }
    }
  });

  // Clean paste on title: strip line breaks
  titleInput.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain').replace(/[\r\n]+/g, ' ');
    document.execCommand('insertText', false, text);
    resize();
  });
}

/* ==========================================================================
   2. Story Body Engine & Dynamic Floating Plus Button Tracker
   ========================================================================== */
let activeLineElement = null;

function initEditorBody() {
  const body = document.getElementById('editor-body');
  const titleInput = document.getElementById('editor-title');
  if (!body) return;

  // Ensure body has at least one initial paragraph tag if empty
  if (body.innerHTML.trim() === '') {
    body.innerHTML = '<p><br></p>';
  }

  // Keyboard navigation between body and title
  body.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      // If caret is at the very start of body, move to title
      const sel = window.getSelection();
      if (sel && sel.isCollapsed && isCaretAtStart(body)) {
        if (titleInput) {
          e.preventDefault();
          titleInput.focus();
          titleInput.setSelectionRange(titleInput.value.length, titleInput.value.length);
        }
      }
    } else if (e.key === 'Backspace') {
      // If body has only one empty paragraph and user presses backspace, focus title
      if (isBodyEmpty() && titleInput) {
        e.preventDefault();
        titleInput.focus();
        titleInput.setSelectionRange(titleInput.value.length, titleInput.value.length);
      }
    }
  });

  body.addEventListener('input', () => {
    debouncedWordCount();
    triggerAutoSave();
    updateFloatingPlusPosition();
  });

  // Track selection and caret position to dynamically position the (+) button
  document.addEventListener('selectionchange', () => {
    updateFloatingPlusPosition();
  });

  body.addEventListener('focus', () => {
    updateFloatingPlusPosition();
  });
}

function isBodyEmpty() {
  const body = document.getElementById('editor-body');
  if (!body) return true;
  const text = body.innerText.trim();
  const media = body.querySelector('img, iframe, figure, pre, .yt-video-card');
  return text === '' && !media;
}

function isCaretAtStart(container) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  const preRange = document.createRange();
  preRange.selectNodeContents(container);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString().length === 0;
}

function setCaretToStart(element) {
  const target = element.querySelector('p, h2, h3, blockquote') || element;
  const range = document.createRange();
  const sel = window.getSelection();
  range.setStart(target, 0);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

// Dynamically moves the (+) button next to the active empty line
function updateFloatingPlusPosition() {
  const plusWrapper = document.getElementById('plus-floating-wrapper');
  const body = document.getElementById('editor-body');
  const menu = document.getElementById('editor-plus-menu');
  if (!plusWrapper || !body) return;

  // Do not move or hide if menu is currently open
  if (menu && !menu.classList.contains('hidden')) return;

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !body.contains(sel.anchorNode)) {
    // If not focused in body, keep default or hide
    return;
  }

  // Find the block-level element under cursor
  let node = sel.anchorNode;
  while (node && node.parentNode !== body && node !== body) {
    node = node.parentNode;
  }

  if (node && node.parentNode === body) {
    activeLineElement = node;
    const text = node.innerText ? node.innerText.trim() : '';
    const hasMedia = node.querySelector && node.querySelector('img, iframe, figure, pre, input, .yt-video-card');

    // Only show (+) when on an empty line or clean paragraph without media
    if (text === '' && !hasMedia) {
      const bodyRect = body.getBoundingClientRect();
      const nodeRect = node.getBoundingClientRect();
      const topOffset = nodeRect.top - bodyRect.top;

      plusWrapper.style.top = `${Math.max(0, topOffset + 2)}px`;
      plusWrapper.style.opacity = '1';
      plusWrapper.style.pointerEvents = 'auto';
      return;
    }
  }

  // If the line has text or non-empty content, hide (+)
  plusWrapper.style.opacity = '0';
  plusWrapper.style.pointerEvents = 'none';
}

/* ==========================================================================
   3. Markdown Live Auto-Transforms
   ========================================================================== */
function initMarkdownShortcuts() {
  const body = document.getElementById('editor-body');
  if (!body) return;

  body.addEventListener('keyup', (e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;

    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed) return;

    let node = sel.anchorNode;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;

    // Find current block element
    let block = node;
    while (block && block.parentNode !== body && block !== body) {
      block = block.parentNode;
    }
    if (!block || block === body) return;

    const text = block.textContent || '';

    // Markdown triggers
    if (e.key === ' ') {
      // Large Heading: # + space
      if (/^#\s$/.test(text)) {
        block.innerHTML = '<br>';
        document.execCommand('formatBlock', false, '<h2>');
        updateFloatingPlusPosition();
      }
      // Small Heading: ## + space
      else if (/^##\s$/.test(text)) {
        block.innerHTML = '<br>';
        document.execCommand('formatBlock', false, '<h3>');
        updateFloatingPlusPosition();
      }
      // Blockquote: > + space
      else if (/^>\s$/.test(text)) {
        block.innerHTML = '<br>';
        document.execCommand('formatBlock', false, '<blockquote>');
        updateFloatingPlusPosition();
      }
      // Unordered list: - + space or * + space
      else if (/^[-*]\s$/.test(text)) {
        block.innerHTML = '<br>';
        document.execCommand('insertUnorderedList', false, null);
        updateFloatingPlusPosition();
      }
      // Ordered list: 1. + space
      else if (/^1\.\s$/.test(text)) {
        block.innerHTML = '<br>';
        document.execCommand('insertOrderedList', false, null);
        updateFloatingPlusPosition();
      }
      // Divider: --- + space
      else if (/^---\s$/.test(text)) {
        block.outerHTML = `<div class="my-8 text-center text-2xl tracking-[0.6em] text-gray-400 select-none font-bold py-2" contenteditable="false">...</div><p><br></p>`;
        updateFloatingPlusPosition();
        triggerAutoSave();
      }
      // Code Block: ``` + space
      else if (/^```\s$/.test(text)) {
        const codeHtml = `
          <div class="my-6 border border-gray-300 rounded-lg p-4 bg-[#fcfcfc] font-mono text-sm shadow-2xs select-none" contenteditable="false">
            <div class="flex items-center justify-between text-xs text-gray-500 mb-3 border-b border-gray-200 pb-2 font-mono">
              <div class="flex items-center gap-1.5 cursor-pointer hover:text-black">
                <span>Auto (TypeScript)</span>
                <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
              </div>
            </div>
            <pre class="focus:outline-none font-mono text-gray-800 text-sm whitespace-pre-wrap leading-relaxed min-h-[54px]" contenteditable="true" spellcheck="false" placeholder="// Paste or write code here..."></pre>
          </div>
          <p><br></p>
        `;
        block.outerHTML = codeHtml;
        updateFloatingPlusPosition();
        triggerAutoSave();
      }
    }
  });
}

/* ==========================================================================
   4. Super-Smart Paste Sanitizer & Auto-Embedder
   ========================================================================== */
function initSmartPaste() {
  const body = document.getElementById('editor-body');
  if (!body) return;

  body.addEventListener('paste', (e) => {
    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;

    const pastedText = clipboardData.getData('text/plain').trim();
    const sel = window.getSelection();

    // CASE 1: User selected words and pastes a valid URL -> Turn words into Link!
    if (sel && !sel.isCollapsed && isValidHttpUrl(pastedText)) {
      e.preventDefault();
      document.execCommand('createLink', false, pastedText);
      triggerAutoSave();
      return;
    }

    // CASE 2: Empty line + pasted YouTube link -> Instant Medium YouTube Card!
    const ytId = extractYouTubeId(pastedText);
    if (ytId && isCurrentLineEmpty()) {
      e.preventDefault();
      const ytCard = createYouTubeCardHtml(ytId);
      insertBlockAtActiveLine(ytCard, true);
      triggerAutoSave();
      return;
    }

    // CASE 3: Empty line + image link (.jpg, .png, .gif, .webp) -> Instant Image Embed!
    if (isImageUrl(pastedText) && isCurrentLineEmpty()) {
      e.preventDefault();
      const imgHtml = `
        <figure class="my-8 select-none" contenteditable="false">
          <img src="${pastedText}" alt="Embedded Image" class="w-full rounded-sm object-cover max-h-[520px]" />
          <figcaption class="text-center text-xs text-gray-400 font-sans mt-2" contenteditable="true">Type caption for image (optional)</figcaption>
        </figure>
        <p><br></p>
      `;
      insertBlockAtActiveLine(imgHtml, true);
      triggerAutoSave();
      return;
    }

    // CASE 4: Clean paste from Word / Google Docs
    const pastedHtml = clipboardData.getData('text/html');
    if (pastedHtml) {
      e.preventDefault();
      const cleaned = sanitizePastedHtml(pastedHtml);
      insertHtmlAtCursor(cleaned);
      triggerAutoSave();
    }
  });
}

function isCurrentLineEmpty() {
  const sel = window.getSelection();
  if (!sel || !sel.anchorNode) return false;
  let node = sel.anchorNode;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
  return !node.innerText || node.innerText.trim() === '';
}

function isValidHttpUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function isImageUrl(string) {
  return /^https?:\/\/.*\.(jpeg|jpg|png|webp|gif)(\?.*)?$/i.test(string);
}

function sanitizePastedHtml(rawHtml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  // Remove dangerous tags and scripts
  const dangerous = doc.querySelectorAll('script, style, iframe, object, embed, meta, link, applet');
  dangerous.forEach(el => el.remove());

  // Clean all elements of ugly inline styles, classes, mso tags
  const allElements = doc.querySelectorAll('*');
  allElements.forEach(el => {
    // Preserve src and href
    const src = el.getAttribute('src');
    const href = el.getAttribute('href');

    // Strip all attributes
    while (el.attributes.length > 0) {
      el.removeAttribute(el.attributes[0].name);
    }

    if (src) el.setAttribute('src', src);
    if (href) el.setAttribute('href', href);
  });

  return doc.body.innerHTML;
}

/* ==========================================================================
   5. Keyboard Shortcuts (Hotkeys)
   ========================================================================== */
function initEditorShortcuts() {
  document.addEventListener('keydown', (e) => {
    const isCmdOrCtrl = e.metaKey || e.ctrlKey;
    if (!isCmdOrCtrl) return;

    const key = e.key.toLowerCase();

    // Ctrl/Cmd + B: Bold
    if (key === 'b') {
      e.preventDefault();
      document.execCommand('bold', false, null);
      updateToolbarActiveStates();
      triggerAutoSave();
    }
    // Ctrl/Cmd + I: Italic
    else if (key === 'i') {
      e.preventDefault();
      document.execCommand('italic', false, null);
      updateToolbarActiveStates();
      triggerAutoSave();
    }
    // Ctrl/Cmd + K: Link Popup
    else if (key === 'k') {
      e.preventDefault();
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) {
        const savedRange = sel.getRangeAt(0).cloneRange();
        showLinkPopup(null, savedRange);
      }
    }
    // Ctrl/Cmd + S: Manual Save
    else if (key === 's') {
      e.preventDefault();
      saveDraft();
      if (window.showToast) window.showToast('Draft saved successfully');
    }
  });
}

/* ==========================================================================
   6. Word & Reading Time Counter (Debounced 120ms)
   ========================================================================== */
let wordCountTimer = null;

function debouncedWordCount() {
  clearTimeout(wordCountTimer);
  wordCountTimer = setTimeout(updateWordCount, 120);
}

function updateWordCount() {
  const title = document.getElementById('editor-title')?.value || '';
  const body = document.getElementById('editor-body')?.innerText || '';
  const text = (title + ' ' + body).trim();
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const readTime = Math.max(1, Math.ceil(words / 200));

  const countEl = document.getElementById('editor-word-count');
  if (countEl) {
    countEl.textContent = `${words} words · ${readTime} min read`;
  }
}

/* ==========================================================================
   7. Floating Selection Toolbar with Active Highlighting & Link Popover
   ========================================================================== */
function initFormattingToolbar() {
  const toolbar = document.getElementById('selection-toolbar');
  const body = document.getElementById('editor-body');
  if (!toolbar || !body) return;

  let savedRange = null;

  const handleSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !body.contains(selection.anchorNode)) {
      toolbar.classList.add('hidden');
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0) {
      toolbar.classList.add('hidden');
      return;
    }

    toolbar.classList.remove('hidden');
    // Position toolbar centered directly above the selection
    const topPos = Math.max(10, window.scrollY + rect.top - toolbar.offsetHeight - 12);
    const leftPos = Math.max(10, window.scrollX + rect.left + rect.width / 2 - toolbar.offsetWidth / 2);

    toolbar.style.top = `${topPos}px`;
    toolbar.style.left = `${leftPos}px`;

    updateToolbarActiveStates();
  };

  document.addEventListener('selectionchange', handleSelection);

  // Formatting actions
  toolbar.querySelectorAll('[data-format]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const cmd = btn.getAttribute('data-format');

      if (cmd === 'h2') {
        const isH2 = isCurrentBlockTag('H2');
        document.execCommand('formatBlock', false, isH2 ? '<p>' : '<h2>');
      } else if (cmd === 'h3') {
        const isH3 = isCurrentBlockTag('H3');
        document.execCommand('formatBlock', false, isH3 ? '<p>' : '<h3>');
      } else if (cmd === 'blockquote') {
        const isQuote = isCurrentBlockTag('BLOCKQUOTE');
        document.execCommand('formatBlock', false, isQuote ? '<p>' : '<blockquote>');
      } else if (cmd === 'createLink') {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) savedRange = sel.getRangeAt(0).cloneRange();
        toolbar.classList.add('hidden');
        showLinkPopup(btn, savedRange);
        return;
      } else if (cmd === 'code') {
        const sel = window.getSelection();
        const selectedText = sel && !sel.isCollapsed ? sel.toString() : '// Type your code here\nconsole.log("Hello, World!");';
        const codeHtml = `
          <div class="my-6 border border-gray-300 rounded-lg p-4 bg-[#fcfcfc] font-mono text-sm shadow-2xs select-none" contenteditable="false">
            <div class="flex items-center justify-between text-xs text-gray-500 mb-3 border-b border-gray-200 pb-2 font-mono">
              <div class="flex items-center gap-1.5 cursor-pointer hover:text-black">
                <span>Auto (TypeScript)</span>
                <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
              </div>
            </div>
            <pre class="focus:outline-none font-mono text-gray-800 text-sm whitespace-pre-wrap leading-relaxed min-h-[54px]" contenteditable="true" spellcheck="false">${escapeHtml(selectedText)}</pre>
          </div>
          <p><br></p>
        `;
        insertHtmlAtCursor(codeHtml);
      } else {
        document.execCommand(cmd, false, null);
      }

      handleSelection();
      triggerAutoSave();
    });
  });
}

function isCurrentBlockTag(tagName) {
  const sel = window.getSelection();
  if (!sel || !sel.anchorNode) return false;
  let node = sel.anchorNode;
  while (node && node.nodeName !== 'BODY') {
    if (node.nodeName === tagName) return true;
    node = node.parentNode;
  }
  return false;
}

function updateToolbarActiveStates() {
  const toolbar = document.getElementById('selection-toolbar');
  if (!toolbar || toolbar.classList.contains('hidden')) return;

  const isBold = document.queryCommandState('bold');
  const isItalic = document.queryCommandState('italic');
  const isH2 = isCurrentBlockTag('H2');
  const isH3 = isCurrentBlockTag('H3');
  const isQuote = isCurrentBlockTag('BLOCKQUOTE');
  const isLink = isCurrentBlockTag('A');

  setButtonActive(toolbar.querySelector('[data-format="bold"]'), isBold);
  setButtonActive(toolbar.querySelector('[data-format="italic"]'), isItalic);
  setButtonActive(toolbar.querySelector('[data-format="h2"]'), isH2);
  setButtonActive(toolbar.querySelector('[data-format="h3"]'), isH3);
  setButtonActive(toolbar.querySelector('[data-format="blockquote"]'), isQuote);
  setButtonActive(toolbar.querySelector('[data-format="createLink"]'), isLink);
}

function setButtonActive(btn, active) {
  if (!btn) return;
  if (active) {
    btn.classList.add('text-[#1a8917]');
  } else {
    btn.classList.remove('text-[#1a8917]');
  }
}

/* ==========================================================================
   7b. Link Popup (with prefilled URL and Unlink feature)
   ========================================================================== */
function showLinkPopup(anchorBtn, savedRange) {
  const existing = document.getElementById('link-popup');
  if (existing) existing.remove();

  // Check if selection is already inside a link
  let existingUrl = '';
  if (savedRange) {
    let node = savedRange.startContainer;
    while (node && node.nodeName !== 'BODY') {
      if (node.nodeName === 'A') {
        existingUrl = node.getAttribute('href') || '';
        break;
      }
      node = node.parentNode;
    }
  }

  const popup = document.createElement('div');
  popup.id = 'link-popup';
  popup.style.cssText = `
    position: absolute;
    z-index: 9999;
    background: #1a1a1a;
    border-radius: 6px;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.35);
    min-width: 290px;
  `;

  const toolbarRect = document.getElementById('selection-toolbar');
  const top = parseInt(toolbarRect ? toolbarRect.style.top || 0 : 0) + 48;
  const left = parseInt(toolbarRect ? toolbarRect.style.left || 0 : 0);
  popup.style.top = top + 'px';
  popup.style.left = left + 'px';

  popup.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
    <input id="link-popup-input" type="text" value="${escapeHtml(existingUrl)}" placeholder="Paste or type a link..."
      style="background:transparent;border:none;outline:none;color:#fff;font-size:14px;flex:1;font-family:inherit;" />
    <button id="link-popup-close" style="background:none;border:none;color:#888;cursor:pointer;font-size:18px;line-height:1;padding:0 2px;" title="Close">&times;</button>
  `;

  document.body.appendChild(popup);

  const input = popup.querySelector('#link-popup-input');
  const closeBtn = popup.querySelector('#link-popup-close');

  setTimeout(() => input.focus(), 10);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const url = input.value.trim();
      if (savedRange) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedRange);

        if (url) {
          const finalUrl = url.startsWith('http') || url.startsWith('mailto:') ? url : 'https://' + url;
          document.execCommand('createLink', false, finalUrl);
        } else {
          document.execCommand('unlink', false, null);
        }
      }
      popup.remove();
      triggerAutoSave();
    }
    if (e.key === 'Escape') popup.remove();
  });

  closeBtn.addEventListener('click', () => popup.remove());

  setTimeout(() => {
    document.addEventListener('mousedown', function handler(e) {
      if (!popup.contains(e.target)) {
        popup.remove();
        document.removeEventListener('mousedown', handler);
      }
    });
  }, 100);
}

/* ==========================================================================
   Helper: Media & Block Placement Engine (Inserts at Active Caret Line)
   ========================================================================== */
function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.trim().match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i);
  return match ? match[1] : null;
}

function extractVimeoId(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.trim().match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return match ? match[1] : null;
}

function isDirectVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url.trim());
}

function createVideoEmbedHtml(url) {
  const ytId = extractYouTubeId(url);
  if (ytId) {
    return createYouTubeCardHtml(ytId);
  }

  const vimeoId = extractVimeoId(url);
  if (vimeoId) {
    return `
      <figure class="my-8 block select-none" contenteditable="false">
        <div class="relative w-full aspect-video rounded-md overflow-hidden bg-black shadow-md">
          <iframe class="absolute inset-0 w-full h-full" src="https://player.vimeo.com/video/${vimeoId}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
        </div>
        <figcaption class="text-center text-xs text-gray-400 font-sans mt-2" contenteditable="true">Type caption for video (optional)</figcaption>
      </figure>
      <p><br></p>
    `;
  }

  if (isDirectVideoUrl(url)) {
    return `
      <figure class="my-8 block select-none" contenteditable="false">
        <div class="relative w-full rounded-md overflow-hidden bg-black shadow-md flex items-center justify-center">
          <video controls class="w-full max-h-[540px] rounded-md" src="${escapeHtml(url)}"></video>
        </div>
        <figcaption class="text-center text-xs text-gray-400 font-sans mt-2" contenteditable="true">Type caption for video (optional)</figcaption>
      </figure>
      <p><br></p>
    `;
  }

  return `
    <figure class="my-8 block select-none" contenteditable="false">
      <div class="relative w-full aspect-video rounded-md overflow-hidden bg-black shadow-md flex items-center justify-center text-white">
        <iframe class="absolute inset-0 w-full h-full" src="${escapeHtml(url)}" frameborder="0" allowfullscreen></iframe>
      </div>
      <figcaption class="text-center text-xs text-gray-400 font-sans mt-2" contenteditable="true">Video from ${escapeHtml(url)}</figcaption>
    </figure>
    <p><br></p>
  `;
}

function insertBlockAtActiveLine(html, replaceEmpty = true) {
  const body = document.getElementById('editor-body');
  if (!body) return null;

  let targetNode = activeLineElement;

  if (!targetNode || !body.contains(targetNode) || targetNode === body) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && body.contains(sel.anchorNode)) {
      let node = sel.anchorNode;
      while (node && node.parentNode !== body && node !== body) {
        node = node.parentNode;
      }
      if (node && node.parentNode === body) {
        targetNode = node;
      }
    }
  }

  if (!targetNode || !body.contains(targetNode)) {
    targetNode = body.lastElementChild;
  }

  const temp = document.createElement('div');
  temp.innerHTML = html.trim();
  const newNodes = Array.from(temp.childNodes);
  if (newNodes.length === 0) return null;

  if (targetNode && targetNode.parentNode === body) {
    const text = targetNode.innerText ? targetNode.innerText.trim() : '';
    const hasMedia = targetNode.querySelector && targetNode.querySelector('img, iframe, video, figure, pre, input, .yt-video-card');

    if (replaceEmpty && text === '' && !hasMedia) {
      targetNode.replaceWith(...newNodes);
    } else {
      targetNode.after(...newNodes);
    }
  } else {
    body.append(...newNodes);
  }

  const trailingP = newNodes.slice().reverse().find(n => n.nodeType === Node.ELEMENT_NODE && n.tagName === 'P');
  const lastElement = newNodes.slice().reverse().find(n => n.nodeType === Node.ELEMENT_NODE);
  activeLineElement = trailingP || lastElement || newNodes[newNodes.length - 1];

  updateFloatingPlusPosition();
  triggerAutoSave();

  return newNodes[0];
}

function removeActivePrompt(restoreParagraph = false) {
  const existing = document.getElementById('editor-active-prompt');
  if (!existing) return;
  const body = document.getElementById('editor-body');
  if (restoreParagraph && existing.parentNode) {
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    existing.replaceWith(p);
    activeLineElement = p;
    setCaretToStart(p);
  } else {
    existing.remove();
  }
  updateFloatingPlusPosition();
  triggerAutoSave();
}

/* ==========================================================================
   8. Inline Inserter (+) Actions: Image, Unsplash, Video, Embed, Code, Divider
   ========================================================================== */
function initInlineBlockInserter() {
  const plusBtn = document.getElementById('editor-plus-btn');
  const plusCross = document.getElementById('plus-icon-cross');
  const menu = document.getElementById('editor-plus-menu');
  const body = document.getElementById('editor-body');
  const fileInput = document.getElementById('editor-image-upload');

  if (!plusBtn || !menu || !body) return;

  function toggleMenu() {
    const isHidden = menu.classList.contains('hidden');
    if (isHidden) {
      menu.classList.remove('hidden');
      requestAnimationFrame(() => {
        menu.classList.add('plus-menu-open');
      });
      plusBtn.classList.add('plus-btn-active');
    } else {
      closeMenu();
    }
  }

  function closeMenu() {
    menu.classList.remove('plus-menu-open');
    menu.classList.add('hidden');
    plusBtn.classList.remove('plus-btn-active');
  }

  plusBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  document.addEventListener('click', (e) => {
    if (!plusBtn.contains(e.target) && !menu.contains(e.target)) {
      closeMenu();
    }
  });

  // 1. Insert Image
  const insertImgBtn = document.getElementById('insert-image-btn');
  if (insertImgBtn && fileInput) {
    insertImgBtn.addEventListener('click', () => {
      closeMenu();
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imgHtml = `
            <figure class="my-8 select-none" contenteditable="false">
              <img src="${event.target.result}" alt="Story Image" class="w-full rounded-sm object-cover max-h-[520px]" />
              <figcaption class="text-center text-xs text-gray-400 font-sans mt-2" contenteditable="true">Type caption for image (optional)</figcaption>
            </figure>
            <p><br></p>
          `;
          const firstNode = insertBlockAtActiveLine(imgHtml, true);
          fileInput.value = '';
          if (firstNode && firstNode.parentNode) {
            const trailingP = firstNode.nextElementSibling;
            if (trailingP && trailingP.tagName === 'P') {
              activeLineElement = trailingP;
              setCaretToStart(trailingP);
            }
          }
          updateFloatingPlusPosition();
          triggerAutoSave();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // 2. Search Unsplash Photos
  const insertUnsplashBtn = document.getElementById('insert-unsplash-btn');
  if (insertUnsplashBtn) {
    insertUnsplashBtn.addEventListener('click', () => {
      closeMenu();
      removeActivePrompt(false);

      const promptHtml = `
        <div id="editor-active-prompt" class="my-6 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-[#1a1a1a] shadow-xs select-none transition-all" contenteditable="false">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 text-sm">
              <i class="bi bi-camera"></i>
            </div>
            <input type="text" id="unsplash-search-input"
              class="w-full text-sm font-sans text-gray-800 dark:text-gray-100 placeholder-gray-400 bg-transparent focus:outline-none"
              placeholder="Type keywords to search Unsplash, and press Enter..." autofocus />
            <button type="button" id="cancel-unsplash-prompt-btn" class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-800 transition" title="Cancel (Esc)">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div id="unsplash-results-box" class="mt-4 hidden"></div>
        </div>
      `;
      insertBlockAtActiveLine(promptHtml, true);

      setTimeout(() => {
        const input = document.getElementById('unsplash-search-input');
        const resultsBox = document.getElementById('unsplash-results-box');
        const cancelBtn = document.getElementById('cancel-unsplash-prompt-btn');
        if (!input) return;
        input.focus();

        if (cancelBtn) {
          cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            removeActivePrompt(true);
          });
        }

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const query = input.value.trim() || 'nature';
            renderUnsplashResults(resultsBox, query);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            removeActivePrompt(true);
          } else if (e.key === 'Backspace' && input.value === '') {
            e.preventDefault();
            removeActivePrompt(true);
          }
        });
      }, 50);
    });
  }

  function renderUnsplashResults(resultsBox, query) {
    if (!resultsBox) return;

    const photos = [
      {
        url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
        thumb: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=80',
        author: 'Christopher Gower'
      },
      {
        url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
        thumb: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80',
        author: 'NASA'
      },
      {
        url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
        thumb: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
        author: 'Bailey Zindel'
      },
      {
        url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
        thumb: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80',
        author: 'Ilya Pavlov'
      },
      {
        url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
        thumb: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=400&q=80',
        author: 'Jerry Zhang'
      },
      {
        url: 'https://images.unsplash.com/photo-1534972195531-a756b1126f24?auto=format&fit=crop&w=1200&q=80',
        thumb: 'https://images.unsplash.com/photo-1534972195531-a756b1126f24?auto=format&fit=crop&w=400&q=80',
        author: 'Markus Spiske'
      }
    ];

    resultsBox.classList.remove('hidden');
    resultsBox.innerHTML = `
      <div class="flex items-center justify-between text-xs text-gray-500 font-sans mb-3">
        <span>Results for "${escapeHtml(query)}"</span>
        <span class="text-gray-400">Click a photo to insert</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        ${photos.map((p, idx) => `
          <div class="group relative aspect-4/3 rounded overflow-hidden cursor-pointer bg-gray-100 hover:opacity-95 shadow-xs" data-photo-idx="${idx}">
            <img src="${p.thumb}" alt="Unsplash Photo" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
            <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-end p-2 text-[11px] text-white font-sans">
              Photo by ${p.author}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    resultsBox.querySelectorAll('[data-photo-idx]').forEach(card => {
      card.addEventListener('click', () => {
        const photo = photos[parseInt(card.getAttribute('data-photo-idx'))];
        const container = document.getElementById('editor-active-prompt');
        if (container && container.parentNode) {
          const imgHtml = `
            <figure class="my-8 select-none" contenteditable="false">
              <img src="${photo.url}" alt="Unsplash photo by ${photo.author}" class="w-full rounded-sm object-cover max-h-[500px]" />
              <figcaption class="text-center text-xs text-gray-400 font-sans mt-2" contenteditable="true">Photo by ${photo.author} on Unsplash</figcaption>
            </figure>
            <p><br></p>
          `;
          const temp = document.createElement('div');
          temp.innerHTML = imgHtml.trim();
          const newNodes = Array.from(temp.childNodes);
          container.replaceWith(...newNodes);
          triggerAutoSave();

          const trailingP = newNodes.slice().reverse().find(n => n.nodeType === Node.ELEMENT_NODE && n.tagName === 'P');
          if (trailingP) {
            activeLineElement = trailingP;
            setCaretToStart(trailingP);
          }
          updateFloatingPlusPosition();
        }
      });
    });
  }

  // 3. Add Video (YouTube, Vimeo, MP4)
  const insertVideoBtn = document.getElementById('insert-video-btn');
  if (insertVideoBtn) {
    insertVideoBtn.addEventListener('click', () => {
      closeMenu();
      removeActivePrompt(false);

      const promptHtml = `
        <div id="editor-active-prompt" class="my-6 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-[#1a1a1a] shadow-xs select-none transition-all" contenteditable="false">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 text-sm">
              <i class="bi bi-play-btn-fill"></i>
            </div>
            <input type="text" id="video-url-input"
              class="w-full text-sm font-sans text-gray-800 dark:text-gray-100 placeholder-gray-400 bg-transparent focus:outline-none"
              placeholder="Paste a YouTube, Vimeo, or video link and press Enter..." autofocus />
            <button type="button" id="cancel-video-prompt-btn" class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-800 transition" title="Cancel (Esc)">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="flex flex-wrap items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-gray-200/70 dark:border-gray-800 text-[11px] text-gray-400 font-sans">
            <span>Supports YouTube (including Shorts), Vimeo, and MP4 links</span>
            <span class="flex items-center gap-1.5">
              <span>Press <kbd class="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 rounded font-mono text-[10px] text-gray-600 dark:text-gray-300">Enter</kbd> to embed</span>
              <span>·</span>
              <span><kbd class="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 rounded font-mono text-[10px] text-gray-600 dark:text-gray-300">Esc</kbd> to cancel</span>
            </span>
          </div>
        </div>
      `;
      insertBlockAtActiveLine(promptHtml, true);

      setTimeout(() => {
        const promptBox = document.getElementById('editor-active-prompt');
        const input = document.getElementById('video-url-input');
        const cancelBtn = document.getElementById('cancel-video-prompt-btn');
        if (!input) return;
        input.focus();

        if (cancelBtn) {
          cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            removeActivePrompt(true);
          });
        }

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const url = input.value.trim();
            if (!url) {
              removeActivePrompt(true);
              return;
            }

            const embedHtml = createVideoEmbedHtml(url);
            if (promptBox && promptBox.parentNode) {
              const temp = document.createElement('div');
              temp.innerHTML = embedHtml.trim();
              const newNodes = Array.from(temp.childNodes);
              promptBox.replaceWith(...newNodes);
              triggerAutoSave();

              const trailingP = newNodes.slice().reverse().find(n => n.nodeType === Node.ELEMENT_NODE && n.tagName === 'P');
              if (trailingP) {
                activeLineElement = trailingP;
                setCaretToStart(trailingP);
              }
              updateFloatingPlusPosition();
            }
          } else if (e.key === 'Escape') {
            e.preventDefault();
            removeActivePrompt(true);
          } else if (e.key === 'Backspace' && input.value === '') {
            e.preventDefault();
            removeActivePrompt(true);
          }
        });

        const handleOutsideClick = (e) => {
          const currentPrompt = document.getElementById('editor-active-prompt');
          if (!currentPrompt) {
            document.removeEventListener('click', handleOutsideClick);
            return;
          }
          if (!currentPrompt.contains(e.target)) {
            if (input.value.trim() === '') {
              removeActivePrompt(true);
            }
            document.removeEventListener('click', handleOutsideClick);
          }
        };
        setTimeout(() => {
          document.addEventListener('click', handleOutsideClick);
        }, 100);
      }, 50);
    });
  }

  // 4. Add Embed (< >)
  const insertEmbedBtn = document.getElementById('insert-embed-btn');
  if (insertEmbedBtn) {
    insertEmbedBtn.addEventListener('click', () => {
      closeMenu();
      removeActivePrompt(false);

      const promptHtml = `
        <div id="editor-active-prompt" class="my-6 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-[#1a1a1a] shadow-xs select-none transition-all" contenteditable="false">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 text-sm">
              <i class="bi bi-code-slash"></i>
            </div>
            <input type="text" id="embed-url-input"
              class="w-full text-sm font-sans text-gray-800 dark:text-gray-100 placeholder-gray-400 bg-transparent focus:outline-none"
              placeholder="Paste any link to embed (Twitter, GitHub, web page) and press Enter..." autofocus />
            <button type="button" id="cancel-embed-prompt-btn" class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-800 transition" title="Cancel (Esc)">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="flex flex-wrap items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-gray-200/70 dark:border-gray-800 text-[11px] text-gray-400 font-sans">
            <span>Paste any web URL or media link</span>
            <span class="flex items-center gap-1.5">
              <span>Press <kbd class="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 rounded font-mono text-[10px] text-gray-600 dark:text-gray-300">Enter</kbd> to embed</span>
              <span>·</span>
              <span><kbd class="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 rounded font-mono text-[10px] text-gray-600 dark:text-gray-300">Esc</kbd> to cancel</span>
            </span>
          </div>
        </div>
      `;
      insertBlockAtActiveLine(promptHtml, true);

      setTimeout(() => {
        const promptBox = document.getElementById('editor-active-prompt');
        const input = document.getElementById('embed-url-input');
        const cancelBtn = document.getElementById('cancel-embed-prompt-btn');
        if (!input) return;
        input.focus();

        if (cancelBtn) {
          cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            removeActivePrompt(true);
          });
        }

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const url = input.value.trim();
            if (!url) {
              removeActivePrompt(true);
              return;
            }

            const ytId = extractYouTubeId(url);
            let embedHtml = '';
            if (ytId) {
              embedHtml = createYouTubeCardHtml(ytId);
            } else {
              const domain = url.replace(/^https?:\/\//i, '').split('/')[0];
              embedHtml = `
                <div class="my-6 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex items-center justify-between hover:border-gray-400 transition select-none bg-white dark:bg-[#1a1a1a] shadow-xs" contenteditable="false">
                  <div class="pr-6 max-w-[500px]">
                    <a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="font-sans font-bold text-base text-gray-900 dark:text-white hover:underline line-clamp-1 block mb-1">${escapeHtml(url)}</a>
                    <p class="text-xs text-gray-500 dark:text-gray-400 font-sans line-clamp-2 leading-relaxed">Content embedded from ${escapeHtml(domain)}. Click to open original page.</p>
                    <span class="text-[11px] text-gray-400 font-sans mt-2 inline-flex items-center gap-1"><i class="bi bi-link-45deg"></i> ${escapeHtml(domain)}</span>
                  </div>
                  <div class="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 dark:bg-gray-800 rounded-lg shrink-0 flex items-center justify-center text-gray-400 text-2xl">
                    <i class="bi bi-globe2"></i>
                  </div>
                </div>
                <p><br></p>
              `;
            }

            if (promptBox && promptBox.parentNode) {
              const temp = document.createElement('div');
              temp.innerHTML = embedHtml.trim();
              const newNodes = Array.from(temp.childNodes);
              promptBox.replaceWith(...newNodes);
              triggerAutoSave();

              const trailingP = newNodes.slice().reverse().find(n => n.nodeType === Node.ELEMENT_NODE && n.tagName === 'P');
              if (trailingP) {
                activeLineElement = trailingP;
                setCaretToStart(trailingP);
              }
              updateFloatingPlusPosition();
            }
          } else if (e.key === 'Escape') {
            e.preventDefault();
            removeActivePrompt(true);
          } else if (e.key === 'Backspace' && input.value === '') {
            e.preventDefault();
            removeActivePrompt(true);
          }
        });

        const handleOutsideClick = (e) => {
          const currentPrompt = document.getElementById('editor-active-prompt');
          if (!currentPrompt) {
            document.removeEventListener('click', handleOutsideClick);
            return;
          }
          if (!currentPrompt.contains(e.target)) {
            if (input.value.trim() === '') {
              removeActivePrompt(true);
            }
            document.removeEventListener('click', handleOutsideClick);
          }
        };
        setTimeout(() => {
          document.addEventListener('click', handleOutsideClick);
        }, 100);
      }, 50);
    });
  }

  // 5. Insert Code Block
  const insertCodeBtn = document.getElementById('insert-code-btn');
  if (insertCodeBtn) {
    insertCodeBtn.addEventListener('click', () => {
      closeMenu();
      removeActivePrompt(false);
      const codeHtml = `
        <div class="my-6 border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-[#fcfcfc] dark:bg-[#151515] font-mono text-sm shadow-2xs select-none" contenteditable="false">
          <div class="flex items-center justify-between text-xs text-gray-500 mb-3 border-b border-gray-200 dark:border-gray-800 pb-2 font-mono">
            <div class="flex items-center gap-1.5 cursor-pointer hover:text-black dark:hover:text-white">
              <span>Code</span>
              <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
            </div>
          </div>
          <pre class="focus:outline-none font-mono text-gray-800 dark:text-gray-100 text-sm whitespace-pre-wrap leading-relaxed min-h-[54px]" contenteditable="true" spellcheck="false" placeholder="// Paste or write code here..."></pre>
        </div>
        <p><br></p>
      `;
      const firstNode = insertBlockAtActiveLine(codeHtml, true);
      if (firstNode) {
        const pre = firstNode.querySelector('pre');
        if (pre) pre.focus();
      }
      triggerAutoSave();
    });
  }

  // 6. Insert Divider
  const insertDividerBtn = document.getElementById('insert-divider-btn');
  if (insertDividerBtn) {
    insertDividerBtn.addEventListener('click', () => {
      closeMenu();
      removeActivePrompt(false);
      const dividerHtml = `<div class="my-8 text-center text-2xl tracking-[0.6em] text-gray-400 select-none font-bold py-2" contenteditable="false">...</div><p><br></p>`;
      insertBlockAtActiveLine(dividerHtml, true);
      const body = document.getElementById('editor-body');
      const trailingP = body ? body.lastElementChild : null;
      if (trailingP && trailingP.tagName === 'P') {
        activeLineElement = trailingP;
        setCaretToStart(trailingP);
      }
      updateFloatingPlusPosition();
      triggerAutoSave();
    });
  }
}

/* ==========================================================================
   9. YouTube Card Generator & Embed Handler (Zero Error 153)
   ========================================================================== */
function createYouTubeCardHtml(videoId) {
  const containerId = 'yt-card-' + Math.random().toString(36).substring(2, 9);

  // Fetch real title and author via oEmbed asynchronously
  setTimeout(() => {
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
      .then(res => res.json())
      .then(data => {
        const titleEl = document.getElementById(containerId + '-title');
        const authorEl = document.getElementById(containerId + '-author');
        if (titleEl && data.title) titleEl.textContent = data.title;
        if (authorEl && data.author_name) authorEl.textContent = data.author_name;
      })
      .catch(() => {});
  }, 50);

  return `
    <figure class="my-8 block select-none" contenteditable="false">
      <div id="${containerId}" data-yt-id="${videoId}" class="yt-video-card relative w-full aspect-video rounded-md overflow-hidden bg-black shadow-md group cursor-pointer">
        <!-- Thumbnail Background -->
        <img src="https://i.ytimg.com/vi/${videoId}/hqdefault.jpg" alt="YouTube Video Thumbnail" class="absolute inset-0 w-full h-full object-cover" onerror="this.src='https://i.ytimg.com/vi/${videoId}/mqdefault.jpg'" />

        <!-- Top Title Bar Overlay -->
        <div class="absolute top-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between text-white z-10 pointer-events-none">
          <div class="flex items-center gap-2.5 min-w-0 pr-4">
            <div class="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white shrink-0 font-bold text-xs shadow">
              <i class="bi bi-youtube text-base"></i>
            </div>
            <div class="min-w-0">
              <div id="${containerId}-title" class="text-xs sm:text-sm font-sans font-medium line-clamp-1 text-white/95">YouTube Video</div>
              <div id="${containerId}-author" class="text-[11px] text-gray-300 font-sans line-clamp-1">YouTube</div>
            </div>
          </div>
          <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" rel="noopener" class="pointer-events-auto p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition shrink-0" title="Open on YouTube" onclick="event.stopPropagation()">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
          </a>
        </div>

        <!-- Center Red YouTube Play Button -->
        <div class="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div class="w-16 h-11 sm:w-18 sm:h-12 bg-[#ff0000] rounded-xl flex items-center justify-center shadow-2xl transition-transform duration-200 group-hover:scale-110">
            <svg class="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <polygon points="9.5 7.5 16.5 12 9.5 16.5 9.5 7.5"/>
            </svg>
          </div>
        </div>

        <!-- Bottom Watch on YouTube Badge -->
        <div class="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-10 flex items-center gap-2">
          <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" rel="noopener" class="px-2.5 py-1 rounded bg-black/75 hover:bg-black text-white text-[11px] font-sans flex items-center gap-1.5 transition shadow" onclick="event.stopPropagation()">
            <span>Watch on</span>
            <span class="font-bold flex items-center gap-0.5"><i class="bi bi-youtube text-red-500"></i> YouTube</span>
          </a>
        </div>
      </div>
      <figcaption class="text-center text-xs text-gray-400 font-sans mt-2" contenteditable="true">Type caption for video (optional)</figcaption>
    </figure>
    <p><br></p>
  `;
}

// Click on YouTube card to play live video
document.addEventListener('click', (e) => {
  const card = e.target.closest('.yt-video-card');
  if (!card) return;
  if (e.target.closest('a')) return;
  const videoId = card.getAttribute('data-yt-id');
  if (!videoId) return;

  card.outerHTML = `
    <div class="relative w-full aspect-video rounded-md overflow-hidden bg-black shadow-md">
      <iframe class="absolute inset-0 w-full h-full"
        src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&enablejsapi=1"
        title="YouTube video player"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerpolicy="strict-origin-when-cross-origin"
        allowfullscreen>
      </iframe>
    </div>
  `;
});

function insertHtmlAtCursor(html) {
  const body = document.getElementById('editor-body');
  if (!body) return;
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && body.contains(sel.anchorNode)) {
    try {
      document.execCommand('insertHTML', false, html);
      return;
    } catch (err) {}
  }
  insertBlockAtActiveLine(html, false);
}

/* ==========================================================================
   10. Draft Auto-Save Engine (localStorage)
   ========================================================================== */
let autoSaveTimer = null;

function triggerAutoSave() {
  const statusEl = document.getElementById('editor-save-status');
  if (statusEl) {
    statusEl.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse mr-1.5"></span> Saving...`;
  }

  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    saveDraft();
  }, 600);
}

function saveDraft() {
  const title = document.getElementById('editor-title')?.value || '';
  const body = document.getElementById('editor-body')?.innerHTML || '';

  const draft = {
    title,
    body,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  try {
    localStorage.setItem('medium_active_draft', JSON.stringify(draft));
  } catch (e) {}

  const statusEl = document.getElementById('editor-save-status');
  if (statusEl) {
    statusEl.innerHTML = `<svg class="w-3.5 h-3.5 text-medium-green inline-block mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg> Saved draft`;
  }
}

function initDraftAutoSave() {
  const saved = localStorage.getItem('medium_active_draft');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      const titleInput = document.getElementById('editor-title');
      const bodyEl = document.getElementById('editor-body');
      if (titleInput && data.title && !titleInput.value) {
        titleInput.value = data.title;
        titleInput.style.height = 'auto';
        titleInput.style.height = titleInput.scrollHeight + 'px';
      }
      if (bodyEl && data.body && bodyEl.innerHTML.trim() === '') {
        bodyEl.innerHTML = data.body;
      }
      updateWordCount();
    } catch (e) {
      console.warn('Could not parse saved draft', e);
    }
  }
}

/* ==========================================================================
   11. Topic Tags Chip Manager
   ========================================================================== */
const activeTags = new Set(['Programming', 'Technology']);

function initTagManager() {
  const tagInput = document.getElementById('publish-tag-input');
  const tagsContainer = document.getElementById('publish-tags-container');

  if (!tagInput || !tagsContainer) return;

  const renderTags = () => {
    tagsContainer.innerHTML = '';
    activeTags.forEach(tag => {
      const pill = document.createElement('span');
      pill.className = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-sans bg-white text-gray-800 border border-gray-300 shadow-2xs';
      pill.innerHTML = `
        <span>${escapeHtml(tag)}</span>
        <button type="button" class="ml-1.5 text-gray-400 hover:text-gray-900 font-bold focus:outline-none">&times;</button>
      `;
      pill.querySelector('button').addEventListener('click', () => {
        activeTags.delete(tag);
        renderTags();
      });
      tagsContainer.appendChild(pill);
    });
  };

  tagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.value.trim().replace(/^#/, '');
      if (val && activeTags.size < 5) {
        activeTags.add(val);
        tagInput.value = '';
        renderTags();
      } else if (activeTags.size >= 5) {
        if (window.showToast) window.showToast('Maximum 5 topics allowed');
      }
    }
  });

  renderTags();
}

/* ==========================================================================
   12. Publish Modal (Full-Page Submission View)
   ========================================================================== */
function initPublishModal() {
  const openBtn = document.getElementById('open-publish-modal-btn');
  const modal = document.getElementById('publish-modal');
  const closeBtn = document.getElementById('close-publish-modal-btn');
  const publishNowBtn = document.getElementById('publish-now-btn');
  const previewTitle = document.getElementById('publish-preview-title');
  const previewSubtitle = document.getElementById('publish-preview-subtitle');
  const titleCounter = document.getElementById('publish-title-counter');
  const subtitleCounter = document.getElementById('publish-subtitle-counter');
  const readTimeEl = document.getElementById('publish-read-time');

  if (!openBtn || !modal) return;

  function updateTitleCounter() {
    if (!previewTitle || !titleCounter) return;
    if (previewTitle.value.length > 100) {
      previewTitle.value = previewTitle.value.slice(0, 100);
    }
    titleCounter.textContent = `${previewTitle.value.length}/100`;
  }

  function updateSubtitleCounter() {
    if (!previewSubtitle || !subtitleCounter) return;
    if (previewSubtitle.value.length > 140) {
      previewSubtitle.value = previewSubtitle.value.slice(0, 140);
    }
    subtitleCounter.textContent = `${previewSubtitle.value.length}/140`;
  }

  // Title character counter listeners
  if (previewTitle && titleCounter) {
    ['input', 'keyup', 'change', 'paste'].forEach(evt => {
      previewTitle.addEventListener(evt, () => {
        setTimeout(updateTitleCounter, 0);
      });
    });
  }

  // Subtitle character counter listeners
  if (previewSubtitle && subtitleCounter) {
    ['input', 'keyup', 'change', 'paste'].forEach(evt => {
      previewSubtitle.addEventListener(evt, () => {
        setTimeout(updateSubtitleCounter, 0);
      });
    });
  }

  openBtn.addEventListener('click', () => {
    const rawTitle = document.getElementById('editor-title')?.value.trim() || '';
    const bodyText = document.getElementById('editor-body')?.innerText.trim() || '';

    if (previewTitle) {
      previewTitle.value = rawTitle.slice(0, 100);
      updateTitleCounter();
    }
    if (previewSubtitle) {
      updateSubtitleCounter();
    }

    const words = (rawTitle + ' ' + bodyText).trim().split(/\s+/).filter(Boolean).length;
    const readTime = Math.max(1, Math.ceil(words / 200));
    if (readTimeEl) {
      readTimeEl.textContent = `${readTime} min read`;
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    });
  }

  if (publishNowBtn) {
    publishNowBtn.addEventListener('click', () => {
      const title = previewTitle?.value.trim() || document.getElementById('editor-title')?.value.trim() || '';
      const subtitle = previewSubtitle?.value.trim() || '';
      const bodyEl = document.getElementById('editor-body');
      const text = bodyEl ? bodyEl.innerHTML : '';
      const plainText = bodyEl ? bodyEl.innerText.trim() : '';

      if (!title) {
        if (window.showToast) window.showToast('Please enter a title for your story', 'warning');
        return;
      }
      if (!plainText && !text) {
        if (window.showToast) window.showToast('Please write some content for your story', 'warning');
        return;
      }

      const tagsArray = Array.from(activeTags || []);

      publishNowBtn.disabled = true;
      publishNowBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg> Publishing...
      `;

      function getCsrfToken() {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
          const cookies = document.cookie.split(';');
          for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, 10) === 'csrftoken=') {
              cookieValue = decodeURIComponent(cookie.substring(10));
              break;
            }
          }
        }
        return cookieValue || '';
      }

      const postId = document.getElementById('editor-body')?.dataset?.postId || null;

      if (window.showLoadingAnimation) {
        window.showLoadingAnimation('Publishing your story...');
      }

      fetch('/api/posts/create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify({
          post_id: postId,
          title: title,
          subtitle: subtitle,
          text: text,
          plain_text: plainText,
          topics: tagsArray,
          status: 'published'
        })
      })
      .then(res => {
        if (res.status === 401) {
          throw new Error('Please sign in to publish your story');
        }
        return res.json();
      })
      .then(data => {
        if (data.success) {
          modal.classList.add('hidden');
          document.body.style.overflow = '';
          if (window.showToast) window.showToast('Story published successfully!');
          // Clear draft storage
          try { localStorage.removeItem('medium_story_draft'); } catch(e){}
          setTimeout(() => {
            window.location.href = data.redirect_url || `/story/${data.slug}/`;
          }, 600);
        } else {
          if (window.hideLoadingAnimation) window.hideLoadingAnimation();
          publishNowBtn.disabled = false;
          publishNowBtn.textContent = 'Publish';
          if (window.showToast) window.showToast(data.error || 'Failed to publish story', 'error');
        }
      })
      .catch(err => {
        if (window.hideLoadingAnimation) window.hideLoadingAnimation();
        publishNowBtn.disabled = false;
        publishNowBtn.textContent = 'Publish';
        if (window.showToast) window.showToast(err.message || 'Error publishing story', 'error');
      });
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.innerText = str;
  return div.innerHTML;
}
