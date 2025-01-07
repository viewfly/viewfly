import { ElementNamespace, NativeRenderer } from '@viewfly/core'

export class DomRenderer extends NativeRenderer<HTMLElement, Text> {
  static NAMESPACES: Record<string, string> = {
    svg: 'http://www.w3.org/2000/svg',
    html: 'http://www.w3.org/1999/xhtml',
    xml: 'http://www.w3.org/XML/1998/namespace',
    xlink: 'http://www.w3.org/1999/xlink',
    xmlns: 'http://www.w3.org/2000/xmlns/',
    mathml: 'http://www.w3.org/1998/Math/MathML',
  }

  propMap: Record<string, Record<string, string>> = {
    INPUT: {
      readonly: 'readOnly'
    },
    TEXTAREA: {
      readonly: 'readOnly'
    }
  }

  createElement(name: string, namespace: ElementNamespace): HTMLElement {
    const ns = namespace && DomRenderer.NAMESPACES[namespace]
    if (ns) {
      return document.createElementNS(ns, name) as any
    }
    return document.createElement(name)
  }

  createTextNode(textContent: string): Text {
    return document.createTextNode(textContent)
  }

  appendChild(parent: HTMLElement, newChild: any) {
    parent.appendChild(newChild)
  }

  prependChild(parent: HTMLElement, newChild: HTMLElement | Text) {
    parent.prepend(newChild)
  }

  insertAfter(newNode: HTMLElement | Text, ref: HTMLElement | Text) {
    if (ref.nextSibling) {
      this.insertBefore(newNode, ref.nextSibling as HTMLElement)
    } else if (ref.parentNode) {
      this.appendChild(ref.parentNode as HTMLElement, newNode)
    } else {
      // eslint-disable-next-line
      console.warn(`Element "${ref instanceof Text ? ref.textContent : ref.tagName}" was accidentally deleted, and viewfly is unable to update the current view`)
    }
  }

  remove(node: HTMLElement | Text) {
    node.remove()
  }

  cleanChildren(node: HTMLElement) {
    node.textContent = ''
  }

  setProperty(node: HTMLElement, key: string, value: any, namespace: ElementNamespace) {
    if (namespace) {
      const prefix = 'xlink:'
      if (key.startsWith(prefix)) {
        const ns = key.substring(prefix.length)
        node.setAttributeNS(ns, key, String(value))
      } else {
        node.setAttribute(key, String(value))
      }
      return
    }
    const map = this.propMap[node.tagName]
    if (map) {
      key = map[key] || key
    }
    if (key in node) {
      if (map && document.activeElement === node && key === 'value') {
        return
      }
      (node as any)[key] = value
    } else {
      node.setAttribute(key, value)
    }
  }

  removeProperty(node: HTMLElement, key: string, namespace: ElementNamespace) {
    if (namespace) {
      const prefix = 'xlink:'
      if (key.startsWith(prefix)) {
        const ns = key.substring(prefix.length)
        node.removeAttributeNS(ns, key.substring(prefix.length))
      } else {
        node.removeAttribute(key)
      }
      return
    }
    if (key in node) {
      (node as any)[key] = ''
    } else {
      node.removeAttribute(key)
    }
  }

  setClass(target: HTMLElement, className: string) {
    target.setAttribute('class', className)
  }

  setStyle(target: HTMLElement, key: string, value: any) {
    if (key.startsWith('--')) {
      target.style.setProperty(key, value)
      return
    }
    (target.style as any)[key] = value ?? ''
  }

  removeStyle(target: HTMLElement, key: string) {
    if (key.startsWith('--')) {
      target.style.removeProperty(key)
      return
    }
    (target.style as any)[key] = ''
  }

  listen<T = any>(node: HTMLElement, type: string, callback: (ev: T) => any) {
    const normalizedType = this.normalizedEventType(type)
    node.addEventListener(normalizedType, callback as any)
  }

  unListen(node: HTMLElement, type: string, callback: (ev: any) => any) {
    const normalizedType = this.normalizedEventType(type)
    node.removeEventListener(normalizedType, callback)
  }

  syncTextContent(target: Text, content: string) {
    target.textContent = content
  }

  private normalizedEventType(type: string): keyof HTMLElementEventMap {
    return type.substring(2).toLowerCase() as any
  }

  private insertBefore(newNode: HTMLElement | Text, ref: HTMLElement | Text) {
    if (ref.parentNode) {
      ref.parentNode.insertBefore(newNode, ref)
    } else {
      // eslint-disable-next-line
      console.warn(`Element "${ref instanceof Text ? ref.textContent : ref.tagName}" was accidentally deleted, and viewfly is unable to update the current view`)
    }
  }
}
