export type NativeNode = Record<string, any>

export abstract class NativeRenderer<ElementNode = NativeNode, TextNode = NativeNode> {
  abstract createElement(name: string): ElementNode

  abstract createTextNode(textContent: string): TextNode

  abstract setProperty(node: ElementNode, key: string, value: any): void

  abstract appendChild(parent: ElementNode, newChild: ElementNode | TextNode): void

  abstract replace(newChild: ElementNode | TextNode, oldChild: ElementNode | TextNode): void

  abstract removeProperty(node: ElementNode, key: string): void

  abstract setStyle(target: ElementNode, key: string, value: any): void

  abstract removeStyle(target: ElementNode, key: string): void

  abstract addClass(target: ElementNode, name: string): void

  abstract removeClass(target: ElementNode, name: string): void

  abstract listen<T = any>(node: ElementNode, type: string, callback: (ev: T) => any): void

  abstract unListen(node: ElementNode, type: string, callback: (ev: any) => any): void

  abstract remove(node: ElementNode | TextNode): void

  abstract syncTextContent(target: TextNode, content: string): void

  abstract insertBefore(newNode: ElementNode | TextNode, ref: ElementNode | TextNode): void

  abstract insertAfter(newNode: ElementNode | TextNode, ref: ElementNode | TextNode): void
}
