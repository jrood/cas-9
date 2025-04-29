export function signal<T>(initValue: T): [() => T, (newValue?: T) => void];

export function computed<T>(fn: () => T): () => T;

export type Cleanup = () => void;

export function effect(fn: () => void | Cleanup): void;

export const elements: {
  [tag: string]: (
    props: Record<string, unknown>,
    ...children: unknown[]
  ) => HTMLElement;
};

export function render(component: () => any, container: HTMLElement): void;
