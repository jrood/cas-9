import { expect, test } from 'vitest';
import { signal } from './signals';
import { elements } from './dom';

test('counter', async () => {
  const { button } = elements;

  function Counter() {
    const [count, setCount] = signal(0);
    return button({ onClick: () => setCount(count() + 1) }, count);
  }
  const counter = Counter();

  expect(counter.textContent).toBe('0');
  counter.click();
  expect(counter.textContent).toBe('1');
});
