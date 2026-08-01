// CSS style properties to copy from the textarea to the mirror div
// so the mirror exactly matches the real textarea's text layout
const properties = [
  'direction',
  'boxSizing',
  'width',
  'height',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStyle',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
  'MozTabSize'
];

// Browser environment checks
const isBrowser = (typeof window !== 'undefined');
const isFirefox = isBrowser && (window as any).mozInnerScreenX != null;

// The (top, left, height) pixel position of a caret inside a textarea
export interface CaretCoordinates {
  top: number;
  left: number;
  height: number;
}

// Calculate the exact pixel coordinates of a caret at a given character position
// Works by creating an invisible "mirror" div that matches the textarea's styling,
// then measuring a span placed at the target character position inside it
export function getCaretCoordinates(
  element: HTMLTextAreaElement | HTMLInputElement,
  position: number,
  options?: { recalculate?: boolean }
): CaretCoordinates {
  if (!isBrowser) {
    throw new Error('getCaretCoordinates should only be called in the browser');
  }

  const debug = (options && (options as any).debug) || false;
  if (debug) {
    const el = document.getElementById('input-textarea-caret-position-mirror-div');
    if (el) el.parentNode?.removeChild(el);
  }

  // Create an invisible mirror div to measure text layout
  const div = document.createElement('div');
  div.id = 'input-textarea-caret-position-mirror-div';
  document.body.appendChild(div);

  const style = div.style;
  const computed = window.getComputedStyle(element);
  const isInput = element.nodeName === 'INPUT';

  // Apply basic mirror styles to make it invisible and match the textarea
  style.position = 'absolute';
  if (!debug) style.visibility = 'hidden';
  style.whiteSpace = 'pre-wrap';
  if (isInput) style.whiteSpace = 'pre';
  style.wordWrap = 'break-word';

  // Position mirror off-screen so it doesn't affect page layout
  style.top = '0';
  style.left = '-9999px';

  // Copy all computed styles from the real textarea to the mirror div
  properties.forEach((prop) => {
    if (isInput && prop === 'lineHeight') {
      if (computed.boxSizing === 'border-box') {
        const height = parseFloat(computed.height);
        const paddingActive = parseFloat(computed.paddingTop) + parseFloat(computed.paddingBottom);
        const borderActive = parseFloat(computed.borderTopWidth) + parseFloat(computed.borderBottomWidth);
        const targetHeight = height - paddingActive - borderActive;
        style.lineHeight = `${targetHeight}px`;
      } else {
        style.lineHeight = computed.height;
      }
    } else {
      style[prop as any] = computed[prop as any];
    }
  });

  // Fix Firefox overflow scroll detection
  if (isFirefox) {
    if (element.scrollHeight > parseInt(computed.height)) {
      style.overflowY = 'scroll';
    }
  } else {
    style.overflowY = 'hidden';
  }

  // Fill the mirror with text up to the caret position, then add a span at that point
  div.textContent = element.value.substring(0, position);
  
  if (isInput) {
    div.textContent = div.textContent.replace(/\s/g, '\u00a0');
  }

  // Span placed at the caret position — its offset gives us the pixel coordinates
  const span = document.createElement('span');
  span.textContent = element.value.substring(position) || '.';
  div.appendChild(span);

  // Read the span's position to get the caret coordinates
  const coordinates = {
    top: span.offsetTop + parseFloat(computed.borderTopWidth),
    left: span.offsetLeft + parseFloat(computed.borderLeftWidth),
    height: parseFloat(computed.lineHeight) || span.offsetHeight
  };

  // Clean up the mirror div from the DOM
  if (debug) {
    span.style.backgroundColor = '#aaa';
  } else {
    document.body.removeChild(div);
  }

  return coordinates;
}
