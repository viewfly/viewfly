import { ElementNamespace, NativeRenderer } from '@viewfly/core'

import { getContentAttrNameForIdl, isUnsetLikeReflectedIdlValue } from './html-idl-reflection'
import { getXmlPresentationAttributeName } from './xml-jsx-attr-name'

export class DomRenderer extends NativeRenderer<HTMLElement, Text> {
  private static readonly XLINK_NS = 'http://www.w3.org/1999/xlink'

  /**
   * React/JSX 式 xlink* 与 `xlink:` 开头的属性在 SVG/Math 等中须走 XLink 命名空间。
   * 旧实现把 `xlink:` 后接的名字误当作 namespaceURI，且 `xlinkHref` 会退成普通 setAttribute 导致非标准属性名。
   */
  private static readonly XLINK_IDL_TO_LOCAL: Readonly<Record<string, string>> = {
    xlinkHref: 'href',
    xlinkType: 'type',
    xlinkRole: 'role',
    xlinkTitle: 'title',
    xlinkShow: 'show',
    xlinkActuate: 'actuate',
    xlinkArcrole: 'arcrole',
  }

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
    if (value == null) {
      this.removeProperty(node, key, namespace)
      return
    }
    if (namespace) {
      if (DomRenderer.isXmlAttributeUnsetValue(value)) {
        this.removeProperty(node, key, namespace)
        return
      }
      if (key === 'className') {
        ;(node as any).className = value
        return
      }
      const xlinkLocal = DomRenderer.XLINK_IDL_TO_LOCAL[key]
      if (xlinkLocal) {
        node.setAttributeNS(DomRenderer.XLINK_NS, xlinkLocal, String(value))
        return
      }
      if (key.startsWith('xlink:')) {
        const local = key.slice(6) // "xlink:".length
        node.setAttributeNS(DomRenderer.XLINK_NS, local, String(value))
        return
      }
      const xmlAttr = getXmlPresentationAttributeName(key)
      node.setAttribute(xmlAttr, String(value))
      return
    }
    const map = this.propMap[node.tagName]
    if (map) {
      key = map[key] || key
    }
    if (!namespace && isUnsetLikeReflectedIdlValue(key, value)) {
      this.removeProperty(node, key, namespace)
      return
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
      if (key === 'className') {
        if ('className' in node) {
          ;(node as any).className = ''
        }
        node.removeAttribute('className')
        return
      }
      const xlinkLocal = DomRenderer.XLINK_IDL_TO_LOCAL[key]
      if (xlinkLocal) {
        node.removeAttributeNS(DomRenderer.XLINK_NS, xlinkLocal)
        return
      }
      if (key.startsWith('xlink:')) {
        const local = key.slice(6)
        node.removeAttributeNS(DomRenderer.XLINK_NS, local)
        return
      }
      const xmlAttr = getXmlPresentationAttributeName(key)
      node.removeAttribute(xmlAttr)
      return
    }
    const map = this.propMap[node.tagName]
    const resolvedKey = map ? (map[key] || key) : key
    const contentAttr = getContentAttrNameForIdl(resolvedKey)
    if (contentAttr) {
      node.removeAttribute(contentAttr)
      return
    }
    if (resolvedKey in node) {
      (node as any)[resolvedKey] = ''
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

  getNameSpace(type: string, namespace: ElementNamespace): string | void {
    if (namespace === 'svg') {
      if (type === 'foreignObject') {
        return
      }
      return namespace
    }
    if (type === 'svg') {
      return type
    }
    if (type === 'math') {
      return 'mathml'
    }
    return namespace
  }

  /**
   * SVG / MathML 等非 HTML 下无 HTML5 的「反射 IDL」表；通常用属性字符串表示，false/空串/非数常表示不输出该属性。
   */
  private static isXmlAttributeUnsetValue(value: unknown): boolean {
    if (value === false || value === '') {
      return true
    }
    if (typeof value === 'number' && !Number.isFinite(value)) {
      return true
    }
    return false
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
