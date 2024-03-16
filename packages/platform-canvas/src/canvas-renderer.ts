import { NativeRenderer } from '@viewfly/core'
import { Container } from './lib/container'
import { Text } from './lib/text'

/* eslint-disable */
/**
 * 用于生成模拟轻量 DOM 节点的渲染器
 */
export class CanvasRenderer extends NativeRenderer<Container, Text> {
   context!: CanvasRenderingContext2D

  createElement(name: string): Container {
    return new Container(name, this.context)
  }

  createTextNode(textContent: string): Text {
    return new Text(textContent, this.context)
  }

  setProperty(node: Container, key: string, value: any): void {
    node.setAttribute(key, value)
  }

  appendChild(parent: Container, newChild: Container | Text) {
    parent.appendChild(newChild)
  }

  prependChild(parent: Container, newChild: Container | Text): void {
    parent.prependChild(newChild)
  }

  removeProperty(node: Container, key: string): void {
    // node
  }

  setStyle(target: Container, key: string, value: any): void {
    target.style[key] = value
  }

  removeStyle(target: Container, key: string): void {
    // target.style.delete(key)
  }

  setClass(target: Container, value: string): void {
    // target.className = value
  }

  listen(target: Container, type: string, callback: (ev: any) => void): void {
    // target.origin.on(type, callback)
  }

  unListen(): void {
    //
  }

  remove(node: Container | Text): void {
    // if(node instanceof Group) {
    //   node
    // }
  }

  cleanChildren(node: Container) {
    // node.ch
  }

  syncTextContent(target: Text, content: string): void {
    target.setText(content)
  }

  insertAfter(newNode: Container | Text, ref: Container | Text): void {
    ref.parentNode!.insertAfter(newNode, ref)
  }
}
