/** @jsxImportSource . */

import { expect, test } from 'vitest';
import { signal } from './signals';

test('div', () => {
  const d = <div>1</div>;
  expect(d.innerText).toBe('1');
});

test('counter', () => {
  function Counter() {
    const [count, setCount] = signal(0);
    return <button onClick={() => setCount(count() + 1)}>{count}</button>;
  }
  const counter = Counter();

  expect(counter.textContent).toBe('0');
  counter.click();
  expect(counter.textContent).toBe('1');
});

test('nested changes', () => {
  const [a, setA] = signal(1);
  const [b, setB] = signal(10);
  const [c, setC] = signal(100);
  const r = (
    <div>
      {() => [
        <div>{a()}</div>,
        <div>test</div>,
        () => [
          <div>{b()}</div>,
          <div>test</div>,
          () => [
            <div>{c()}</div>,
            <div>test</div>,
            <div>test</div>,
            <div>test</div>,
          ],
        ],
      ]}
    </div>
  );
  const nodes = [...r.children];
  expect(r.children[0].innerText).toBe('1');
  expect(r.children[2].innerText).toBe('10');
  expect(r.children[4].innerText).toBe('100');
  setC(101);
  expect(r.children[0]).toBe(nodes[0]);
  expect(r.children[2]).toBe(nodes[2]);
  expect(r.children[0].innerText).toBe('1');
  expect(r.children[2].innerText).toBe('10');
  expect(r.children[4].innerText).toBe('101');
  setB(11);
  expect(r.children[0]).toBe(nodes[0]);
  expect(r.children[0].innerText).toBe('1');
  expect(r.children[2].innerText).toBe('11');
  expect(r.children[4].innerText).toBe('101');
  setA(2);
  expect(r.children[0].innerText).toBe('2');
  expect(r.children[2].innerText).toBe('11');
  expect(r.children[4].innerText).toBe('101');
});
