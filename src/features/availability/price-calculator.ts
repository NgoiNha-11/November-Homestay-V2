import { targetElement } from '../../shared/dom';

/** Four operations with standard precedence; never executes entered text. */
export function calculatePrice(expression: string): number {
  const source = expression
    .trim()
    .replace(/^=/, '')
    .replace(/[xX]/g, '*')
    .replaceAll(',', '.')
    .replaceAll('×', '*')
    .replaceAll('÷', '/')
    .replace(/\s/g, '');
  const tokens = source.match(/(?:\d+(?:\.\d*)?|\.\d+)|[+*/()-]/g) ?? [];
  if (!source || source.length > 200 || tokens.join('') !== source)
    throw new Error('Phép tính chưa hợp lệ.');
  let index = 0;
  function number(): number {
    let sign = 1;
    if (tokens[index] === '+' || tokens[index] === '-') sign = tokens[index++] === '-' ? -1 : 1;
    if (tokens[index] === '(') {
      index++;
      const value = sum();
      if (tokens[index++] !== ')') throw new Error('Thiếu dấu đóng ngoặc.');
      return sign * value;
    }
    const token = tokens[index++];
    if (!token || !/^\d|^\.\d/.test(token)) throw new Error('Phép tính chưa hoàn tất.');
    return sign * Number(token);
  }
  function product(): number {
    let value = number();
    while (tokens[index] === '*' || tokens[index] === '/') {
      const operator = tokens[index++];
      const right = number();
      if (operator === '/' && right === 0) throw new Error('Không thể chia cho 0.');
      value = operator === '*' ? value * right : value / right;
    }
    return value;
  }
  function sum(): number {
    let value = product();
    while (tokens[index] === '+' || tokens[index] === '-') {
      const operator = tokens[index++];
      const right = product();
      value += operator === '+' ? right : -right;
    }
    return value;
  }
  const value = sum();
  if (index !== tokens.length) throw new Error('Phép tính chưa hợp lệ.');
  const vnd = Math.round(value * 1000);
  if (!Number.isFinite(value) || value <= 0 || value > 100000 || vnd < 1)
    throw new Error('Kết quả phải từ 1đ đến 100.000.000đ.');
  return vnd / 1000;
}

/** Commit on Enter or blur, keeping the expression available for the next edit. */
export function mountInlinePrices(page: HTMLElement): void {
  const form = page.querySelector<HTMLFormElement>('#availability-form')!;
  const priceTarget = (event: Event) =>
    targetElement(event)?.closest<HTMLInputElement>('[data-offer-price]');
  let committing = false;
  form.addEventListener(
    'input',
    (event) => {
      const price = priceTarget(event);
      if (!price || committing) return;
      delete price.dataset.priceExpression;
      delete price.dataset.priceResult;
    },
    true,
  );
  function commit(price: HTMLInputElement) {
    if (!price.value.trim() || price.disabled) return;
    if (price.value === price.dataset.priceResult) return;
    try {
      const expression = price.value;
      const result = String(calculatePrice(expression));
      price.dataset.priceExpression = expression;
      price.dataset.priceResult = result;
      if (price.value !== result) {
        price.value = result;
        committing = true;
        try {
          price.dispatchEvent(new Event('input', { bubbles: true }));
        } finally {
          committing = false;
        }
      }
    } catch (error) {
      price.setCustomValidity((error as Error).message);
      price
        .closest('.offer-room-choice')!
        .querySelector<HTMLOutputElement>('[data-offer-price-display]')!.textContent = (
        error as Error
      ).message;
    }
  }
  form.addEventListener('focusin', (event) => {
    const price = priceTarget(event);
    if (!price || price.disabled) return;
    if (price.dataset.priceExpression && price.value === price.dataset.priceResult) {
      price.value = price.dataset.priceExpression;
    }
  });
  form.addEventListener('focusout', (event) => {
    const price = priceTarget(event);
    if (price) commit(price);
  });
  form.addEventListener('keydown', (event) => {
    const price = priceTarget(event);
    if (!price || event.key !== 'Enter' || event.isComposing) return;
    event.preventDefault();
    commit(price);
  });
  // Keep the numeric keyboard and cursor in place when tapping an operation.
  form.addEventListener('pointerdown', (event) => {
    if (targetElement(event)?.closest('[data-price-key]')) event.preventDefault();
  });
  form.addEventListener('click', (event) => {
    const key = targetElement(event)?.closest<HTMLButtonElement>('[data-price-key]');
    if (!key) return;
    const price = key
      .closest('.offer-room-price')!
      .querySelector<HTMLInputElement>('[data-offer-price]')!;
    price.focus();
    if (key.dataset.priceKey === '=') {
      commit(price);
      return;
    }
    const start = price.selectionStart ?? price.value.length;
    const end = price.selectionEnd ?? start;
    price.setRangeText(key.dataset.priceKey!, start, end, 'end');
    price.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

export function priceKeysView(): string {
  return (
    '<div class="offer-price-keys" aria-label="Phép tính giá">' +
    ['+', '-', '×', '÷', '(', ')', '=']
      .map(
        (key) =>
          '<button type="button" data-price-key="' +
          key +
          '" aria-label="' +
          (key === '=' ? 'Tính giá' : key) +
          '">' +
          key +
          '</button>',
      )
      .join('') +
    '</div>'
  );
}
