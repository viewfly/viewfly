import { NativeRenderer } from '@viewfly/core'

export class DomRenderer extends NativeRenderer<HTMLElement, Text> {
  isSVG = new RegExp(`^(${[
    // 'a',
    'animate',
    'animateMotion',
    'animateTransform',
    'circle',
    'clipPath',
    'defs',
    'desc',
    'ellipse',
    'feBlend',
    'feColorMatrix',
    'feComponentTransfer',
    'feComposite',
    'feConvolveMatrix',
    'feDiffuseLighting',
    'feDisplacementMap',
    'feDistantLight',
    'feDropShadow',
    'feFlood',
    'feFuncA',
    'feFuncB',
    'feFuncG',
    'feFuncR',
    'feGaussianBlur',
    'feImage',
    'feMerge',
    'feMergeNode',
    'feMorphology',
    'feOffset',
    'fePointLight',
    'feSpecularLighting',
    'feSpotLight',
    'feTile',
    'feTurbulence',
    'filter',
    'foreignObject',
    'g',
    'image',
    'line',
    'linearGradient',
    'marker',
    'mask',
    'metadata',
    'mpath',
    'path',
    'pattern',
    'polygon',
    'polyline',
    'radialGradient',
    'rect',
    // 'script',
    'set',
    'stop',
    // 'style',
    'svg',
    'switch',
    'symbol',
    'text',
    'textPath',
    'title',
    'tspan',
    'use',
    'view'
  ].join('|')
  })$`, 'i')

  xlinkNameSpace = 'http://www.w3.org/1999/xlink'
  possibleXlinkNames = {
    xlinkActuate: 'xlink:actuate',
    xlinkactuate: 'xlink:actuate',
    'xlink:actuate': 'xlink:actuate',

    xlinkArcrole: 'xlink:arcrole',
    xlinkarcrole: 'xlink:arcrole',
    'xlink:arcrole': 'xlink:arcrole',

    xlinkHref: 'xlink:href',
    xlinkhref: 'xlink:href',
    'xlink:href': 'xlink:href',

    xlinkRole: 'xlink:role',
    xlinkrole: 'xlink:role',
    'xlink:role': 'xlink:role',

    xlinkShow: 'xlink:show',
    xlinkshow: 'xlink:show',
    'xlink:show': 'xlink:show',

    xlinkTitle: 'xlink:title',
    xlinktitle: 'xlink:title',
    'xlink:title': 'xlink:title',

    xlinkType: 'xlink:type',
    xlinktype: 'xlink:type',
    'xlink:type': 'xlink:type'
  }
  booleanProps: Record<string, string[]> = {
    input: ['disabled', 'readonly'],
    select: ['disabled', 'multiple'],
    option: ['disabled', 'selected'],
    button: ['disabled'],
    video: ['controls', 'autoplay', 'loop', 'muted'],
    audio: ['controls', 'autoplay', 'loop', 'muted'],
  }
  valueProps: Record<string, string[]> = {
    input: ['value'],
    option: ['value'],
    video: ['src'],
    audio: ['src']
  }

  createElement(name: string): HTMLElement {
    if (this.isSVG.test(name)) {
      return document.createElementNS('http://www.w3.org/2000/svg', name) as any
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
    } else {
      this.appendChild(ref.parentNode as HTMLElement, newNode)
    }
  }

  remove(node: HTMLElement | Text) {
    node.remove()
  }

  setProperty(node: HTMLElement, key: string, value: any) {
    if (this.possibleXlinkNames[key]) {
      this.setXlinkAttribute(node as any, this.possibleXlinkNames[key], value)
      return
    }
    node.setAttribute(key, value)
    const tag = node.tagName.toLowerCase()
    const booleanTagNames = this.booleanProps[tag]
    const valueTagNames = this.valueProps[tag]
    if (booleanTagNames && booleanTagNames.includes(key)) {
      node[key] = Boolean(value)
    } else if (valueTagNames && valueTagNames.includes(key)) {
      if (node[key] === value) {
        return
      }
      node[key] = value
    }
  }

  removeProperty(node: HTMLElement, key: string) {
    if (this.possibleXlinkNames[key]) {
      this.removeXlinkAttribute(node as any, this.possibleXlinkNames[key])
      return
    }
    node.removeAttribute(key)
    const tag = node.tagName.toLowerCase()
    const booleanTagNames = this.booleanProps[tag]
    const valueTagNames = this.valueProps[tag]
    if (booleanTagNames && booleanTagNames.includes(key)) {
      node[key] = false
    } else if (valueTagNames && valueTagNames.includes(key)) {
      node[key] = ''
    }
  }

  setClass(target: HTMLElement, className: string) {
    target.className = className || ''
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

  private setXlinkAttribute(target: SVGElement, key: string, value: string) {
    target.setAttributeNS(this.xlinkNameSpace, key, value)
  }

  private removeXlinkAttribute(target: SVGElement, key: string) {
    target.removeAttributeNS(this.xlinkNameSpace, key.split(':')[1])
  }

  private insertBefore(newNode: HTMLElement | Text, ref: HTMLElement | Text) {
    ref.parentNode!.insertBefore(newNode, ref)
  }
}
