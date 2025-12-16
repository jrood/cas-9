import { expect, test } from 'vitest';
import { signal, effect } from '.';

test('effect autotracking', () => {
  const [a, setA] = signal(0);
  const [b, setB] = signal(0);
  const [src, setSrc] = signal('a');
  let runs = 0;
  effect(() => {
    runs++;
    if (src() === 'a') a();
    if (src() === 'b') b();
  });
  expect(runs).toBe(1);
  setA(1);
  expect(runs).toBe(2);
  setB(1);
  expect(runs).toBe(2);
  setSrc('b');
  expect(runs).toBe(3);
  setA(2);
  expect(runs).toBe(3);
  setB(2);
  expect(runs).toBe(4);
});

test('inner effect disposal', () => {
  const [a, setA] = signal(0);
  const [b, setB] = signal(0);
  let outer = 0;
  let inner = 0;
  effect(() => {
    outer++;
    a();
    effect(() => {
      inner++;
      b();
    });
  });
  expect(outer).toBe(1);
  expect(inner).toBe(1);
  setB(1);
  expect(outer).toBe(1);
  expect(inner).toBe(2);
  setA(1);
  expect(outer).toBe(2);
  expect(inner).toBe(3);
  setB(2);
  expect(outer).toBe(2);
  expect(inner).toBe(4);
});

test('children are updated when bound to signal', () => {
  const [n, setN] = signal(0);
  const div = <div>{n}</div>;
  expect(div.innerText).toBe('0');
  setN(1);
  expect(div.innerText).toBe('1');
});

test('attribute is updated when bound to signal', () => {
  const [cssClass, setCssClass] = signal('a');
  const d = <div class={cssClass} />;
  expect(d.className).toEqual('a');
  setCssClass('b');
  expect(d.className).toEqual('b');
});

test('signal binding works with click handler', () => {
  function Counter() {
    const [count, setCount] = signal(0);
    const inc = () => setCount(count() + 1);
    return <button onClick={inc}>{count}</button>;
  }
  const btn = <Counter />;
  expect(btn.textContent).toBe('0');
  btn.click();
  expect(btn.textContent).toBe('1');
});

test('replacement of one child does not affect siblings', () => {
  const [obj, setObj] = signal({});
  const div = (
    <div>
      {() => <span />}
      {() => obj() && <span />}
      {() => <span />}
    </div>
  );
  const [a1, b1, c1] = div.childNodes;
  setObj({});
  const [a2, b2, c2] = div.childNodes;
  expect(a1 === a2 && b1 !== b2 && c1 === c2).toBeTruthy();
});

test('removal of child via shortened array does not affect siblings', () => {
  const [arr, setArr] = signal([1, 2]);
  const div = (
    <div>
      {() => <span />}
      {() => arr().map(() => <span />)}
      {() => <span />}
    </div>
  );
  const [a1, _, __, b1] = div.childNodes;
  const len1 = div.childNodes.length;
  setArr([3]);
  const [a2, ___, b2] = div.childNodes;
  const len2 = div.childNodes.length;
  expect(len1 === 4 && len2 === 3 && a1 === a2 && b1 === b2).toBeTruthy();
});

test('elements are injected at correct slot when previously empty array', () => {
  const [arr, setArr] = signal([]);
  const div = (
    <div>
      <span id='static1' />
      {() => arr().map(() => <span id='injected' />)}
      <span id='static2' />
    </div>
  );
  setArr([1]);
  expect(div.childNodes[0].id).toBe('static1');
  expect(div.childNodes[1].id).toBe('injected');
  expect(div.childNodes[2].id).toBe('static2');
});

test('component setup runs untracked', () => {
  const [n, setN] = signal(1);
  let renders = 0;
  const TestComponent = () => {
    renders++;
    const _n = n();
    return (
      <>
        <span>{_n}</span>
        <span>{n}</span>
      </>
    );
  };
  const div = <div>{() => <TestComponent />}</div>;
  expect(renders).toBe(1);
  expect(div.childNodes[0].innerText).toBe('1');
  expect(div.childNodes[1].innerText).toBe('1');
  setN(2);
  expect(renders).toBe(1);
  expect(div.childNodes[0].innerText).toBe('1');
  expect(div.childNodes[1].innerText).toBe('2');
});

test('children bindings are disposed along with elements', () => {
  const [obj, setObj] = signal({});
  const [children, setChildren] = signal('a');
  const main = (
    <main>
      {() => {
        obj();
        return <div>{children}</div>;
      }}
    </main>
  );
  const div1 = main.childNodes[0];
  expect(div1.textContent).toBe('a');
  setObj({});
  const div2 = main.childNodes[0];
  expect(div1 === div2).toBe(false);
  setChildren('b');
  expect(div1.textContent).toBe('a');
  expect(div2.textContent).toBe('b');
});

test('attribute bindings are disposed along with elements', () => {
  const [obj, setObj] = signal({});
  const [id, setId] = signal('a');
  const main = (
    <main>
      {() => {
        obj();
        return <div id={id}></div>;
      }}
    </main>
  );
  const div1 = main.childNodes[0];
  expect(div1.id).toBe('a');
  setObj({});
  const div2 = main.childNodes[0];
  expect(div1 === div2).toBe(false);
  setId('b');
  expect(div1.id).toBe('a');
  expect(div2.id).toBe('b');
});
