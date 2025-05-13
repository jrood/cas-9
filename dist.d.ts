export function signal<T>(value: T): [() => T, (newValue: T) => void];
export function memo<T>(fn: () => T): () => T;
export function effect(fn: () => void): void;
export function render(content: any, container: HTMLElement): void;
export function untrack<T>(fn: () => T): T;

type Props = Record<string, any>;
type Tag = string | Component;
type Scalar = string | number | boolean;
type Fn = () => unknown;
type Part = Scalar | Node | Fn | null;
type Component = (props: Props) => Part | Part[];

export function jsx(tag: Tag, props: Props): Part | Part[];
export function Fragment(props: Props): any;
