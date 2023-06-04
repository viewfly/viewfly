import { Injectable } from '@tanbo/di'
import { NativeRenderer } from '@viewfly/core'

@Injectable()
export class DomRenderer extends NativeRenderer<HTMLElement, Text> {
  createElement(name: string): HTMLElement {
    return document.createElement(name)
  }

  createTextNode(textContent: string): Text {
    return document.createTextNode(textContent)
  }

  appendChild(parent: HTMLElement, newChild: any) {
    parent.appendChild(newChild)
  }

  prependChild(parent: HTMLElement, newChild: HTMLElement | Text) {
    if (newChild === parent.childNodes[0]) {
      return
    }
    parent.prepend(newChild)
  }

  insertBefore(newNode: HTMLElement | Text, ref: HTMLElement | Text) {
    if (ref.previousSibling === newNode) {
      return
    }
    ref.parentNode!.insertBefore(newNode, ref)
  }

  insertAfter(newNode: HTMLElement | Text, ref: HTMLElement | Text) {
    if (ref.nextSibling === newNode) {
      return
    }
    if (ref.nextSibling) {
      this.insertBefore(newNode, ref.nextSibling as HTMLElement)
    } else {
      this.appendChild(ref.parentNode as HTMLElement, newNode)
    }
  }

  remove(node: HTMLElement | Text) {
    node.parentNode?.removeChild(node)
  }

  setProperty(node: HTMLElement, key: string, value: any) {
    // TODO: 设置属性还需优化，需区分 HTML Attribute 和 DOM Property
    node.setAttribute(key, value)
    node[key] = value
  }

  replace(newChild: HTMLElement | Text, oldChild: HTMLElement | Text) {
    oldChild.parentNode?.replaceChild(newChild, oldChild)
  }

  removeProperty(node: HTMLElement, key: string) {
    node[key] = void 0
  }

  addClass(target: HTMLElement, name: string) {
    target.classList.add(name)
  }

  removeClass(target: HTMLElement, name: string) {
    target.classList.remove(name)
  }

  setStyle(target: HTMLElement, key: string, value: any) {
    target.style[key] = value ?? ''
  }

  removeStyle(target: HTMLElement, key: string) {
    target.style[key] = ''
  }

  listen<T = any>(node: HTMLElement, type: string, callback: (ev: T) => any) {
    node.addEventListener(type as any, callback)
  }

  unListen(node: HTMLElement, type: string, callback: (ev: any) => any) {
    node.removeEventListener(type, callback)
  }

  syncTextContent(target: Text, content: string) {
    if (target.textContent !== content) {
      target.textContent = content
    }
  }
}
