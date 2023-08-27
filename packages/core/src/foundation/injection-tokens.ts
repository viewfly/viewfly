export type NativeNode = Record<string, any>

export abstract class NativeRenderer<ElementNode = NativeNode, TextNode = NativeNode> {
  abstract createElement(name: string, isSvg: boolean): ElementNode

  abstract createTextNode(textContent: string, isSvg: boolean): TextNode

  abstract setProperty(node: ElementNode, key: string, value: any, isSvg: boolean): void

  abstract appendChild(parent: ElementNode, newChild: ElementNode | TextNode, isSvg: boolean): void

  abstract prependChild(parent: ElementNode, newChild: ElementNode | TextNode, isSvg: boolean): void

  abstract removeProperty(node: ElementNode, key: string, isSvg: boolean): void

  abstract setStyle(target: ElementNode, key: string, value: any, isSvg: boolean): void

  abstract removeStyle(target: ElementNode, key: string, isSvg: boolean): void

  abstract setClass(target: ElementNode, value: string, isSvg: boolean): void

  abstract listen<T = any>(node: ElementNode, type: string, callback: (ev: T) => any, isSvg: boolean): void

  abstract unListen(node: ElementNode, type: string, callback: (ev: any) => any, isSvg: boolean): void

  abstract remove(node: ElementNode | TextNode, isSvg: boolean): void

  abstract syncTextContent(target: TextNode, content: string, isSvg: boolean): void

  abstract insertAfter(newNode: ElementNode | TextNode, ref: ElementNode | TextNode, isSvg: boolean): void
}
