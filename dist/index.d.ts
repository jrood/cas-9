export namespace JSX {
  export type IntrinsicElements = { [tag: string]: Record<string, any> };
}

type Props = Record<string, any>;
type Tag = string | Component;
type Component = (props: Props) => any;

export function jsx(t: Tag, p: Props): any;
export function Fragment(p: Props): any;
export function render(content: any, container: HTMLElement): void;
