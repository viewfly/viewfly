import { NativeRenderer } from '@viewfly/core'

export class DomRenderer extends NativeRenderer<HTMLElement, Text> {
  static NAMESPACES = {
    svg: 'http://www.w3.org/2000/svg',
    html: 'http://www.w3.org/1999/xhtml',
    xml: 'http://www.w3.org/XML/1998/namespace',
    xlink: 'http://www.w3.org/1999/xlink',
    xmlns: 'http://www.w3.org/2000/xmlns/'
  }

  propMap: Record<string, Record<string, string>> = {
    INPUT: {
      readonly: 'readOnly'
    },
    TEXTAREA: {
      readonly: 'readOnly'
    }
  }

  createElement(name: string, isSvg: boolean): HTMLElement {
    if (isSvg) {
      return document.createElementNS(DomRenderer.NAMESPACES.svg, name) as any
    }
    return document.createElement(name)
  }

  createTextNode(textContent: string): Text {
    return document.createTextNode(textContent)
  }

  prependChild(parent: HTMLElement, newChild: HTMLElement | Text) {
    parent.prepend(newChild)
  }

  insertAfter(newNode: HTMLElement | Text, ref: HTMLElement | Text) {
    if (ref.nextSibling) {
      this.insertBefore(newNode, ref.nextSibling as HTMLElement)
    } else {
      this.appendChild(ref.parentNode as HTMLElement, newNode)
    }
  }

  remove(node: HTMLElement | Text) {
    node.remove()
  }

  setProperty(node: HTMLElement, key: string, value: any, isSvg: boolean) {
    const nameSpace = DomRenderer.NAMESPACES
    if (isSvg) {
      const [prefix, ...unqualifiedName] = key.split(/(?=[A-Z])/)
      let ns = null
      if (prefix === 'xmlns' || unqualifiedName.length && nameSpace[prefix]) {
        ns = nameSpace[prefix]
      }
      node.setAttributeNS(ns, key, String(value))
      return
    }
    const map = this.propMap[node.tagName]
    if (map) {
      key = map[key] || key
    }
    if (key in node) {
      node[key] = value
    } else {
      node.setAttribute(key, value)
    }
  }

  removeProperty(node: HTMLElement, key: string, isSvg: boolean) {
    if (isSvg) {
      const nameSpace = DomRenderer.NAMESPACES
      const [prefix, ...unqualifiedName] = key.split(/(?=[A-Z])/)
      let ns = null
      if (prefix === 'xmlns' || unqualifiedName.length && nameSpace[prefix]) {
        ns = nameSpace[prefix]
      }
      node.removeAttributeNS(ns, key)
      return
    }
    if (key in node) {
      node[key] = ''
    } else {
      node.removeAttribute(key)
    }
  }

  setClass(target: HTMLElement, className: string) {
    target.setAttribute('class', className)
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
    target.textContent = content
  }

  private insertBefore(newNode: HTMLElement | Text, ref: HTMLElement | Text) {
    ref.parentNode!.insertBefore(newNode, ref)
  }

  private appendChild(parent: HTMLElement, newChild: any) {
    parent.appendChild(newChild)
  }
}
