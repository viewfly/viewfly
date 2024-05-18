import { NativeRenderer } from '@viewfly/core'

export class VDOMNode {
  parent: VDOMElement | null = null

  remove() {
    if (this.parent) {
      const i = this.parent.children.indexOf(this as any)
      if (i > -1) {
        this.parent.children.splice(i, 1)
      }
    }
    this.parent = null
  }
}

export class VDOMElement extends VDOMNode {
  props = new Map<string, any>()
  children: Array<VDOMElement | VDOMText> = []
  style = new Map<string, any>()
  className = ''

  constructor(public name: string) {
    super()
  }
}

export class VDOMText extends VDOMNode {
  constructor(public text: string) {
    super()
  }
}

/**
 * 用于生成模拟轻量 DOM 节点的渲染器
 */
export class HTMLRenderer extends NativeRenderer<VDOMElement, VDOMText> {
  createElement(name: string): VDOMElement {
    return new VDOMElement(name)
  }

  createTextNode(textContent: string): VDOMText {
    return new VDOMText(textContent)
  }

  setProperty(node: VDOMElement, key: string, value: any): void {
    node.props.set(key, value)
  }

  appendChild(parent: VDOMElement, newChild: VDOMElement | VDOMText) {
    newChild.remove()
    parent.children.push(newChild)
    newChild.parent = parent
  }

  prependChild(parent: VDOMElement, newChild: VDOMElement | VDOMText): void {
    newChild.remove()
    parent.children.unshift(newChild)
    newChild.parent = parent
  }

  removeProperty(node: VDOMElement, key: string): void {
    node.props.delete(key)
  }

  setStyle(target: VDOMElement, key: string, value: any): void {
    target.style.set(key, value)
  }

  removeStyle(target: VDOMElement, key: string): void {
    target.style.delete(key)
  }

  setClass(target: VDOMElement, value: string): void {
    target.className = value
  }

  listen(): void {
    //
  }

  unListen(): void {
    //
  }

  remove(node: VDOMElement | VDOMText): void {
    node.remove()
  }

  cleanChildren(node: VDOMElement) {
    node.children.forEach(i => i.parent = null)
    node.children = []
  }

  syncTextContent(target: VDOMText, content: string): void {
    target.text = content
  }

  insertAfter(newNode: VDOMElement | VDOMText, ref: VDOMElement | VDOMText): void {
    newNode.remove()
    const parent = ref.parent
    if (parent) {
      const i = parent.children.indexOf(ref)
      if (i > -1) {
        newNode.parent = parent
        parent.children.splice(i + 1, 0, newNode)
      }
    } else {
      // eslint-disable-next-line
      console.warn(`Element "${ref instanceof VDOMText ? ref.text : ref.name}" was accidentally deleted, and viewfly is unable to update the current view`)
    }
  }
}

/**
 * 轻量 DOM 转换为 HTML 字符串的转换器
 */
export class OutputTranslator {
  static singleTags = 'br,img,hr'.split(',')

  static simpleXSSFilter = {
    text(text: string) {
      return text.replace(/[><&]/g, str => {
        return {
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;'
        }[str] as string
      })
    },
    attrName(text: string) {
      return text.replace(/[><"'&]/g, str => {
        return {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          '\'': '&#x27;',
          '&': '&amp;'
        }[str] as string
      })
    },
    attrValue(text: string) {
      return text.replace(/["']/g, str => {
        return {
          '"': '&quot;',
          '\'': '&#x27;'
        }[str] as string
      })
    }
  }

  private singleTagTest = new RegExp(`^(${OutputTranslator.singleTags.join('|')})$`, 'i')

  /**
   * 将虚拟 DOM 转换为 HTML 字符串的方法
   * @param vDom 虚拟 DOM 节点
   */
  transform(vDom: VDOMElement): string {
    return vDom.children.map(child => {
      return this.vDomToHTMLString(child)
    }).join('')
  }

  private vDomToHTMLString(vDom: VDOMElement | VDOMText): string {
    const xssFilter = OutputTranslator.simpleXSSFilter

    if (vDom instanceof VDOMText) {
      return this.replaceEmpty(xssFilter.text(vDom.text), '&nbsp;')
    }

    const styles = Array.from(vDom.style.keys()).filter(key => {
      const v = vDom.style.get(key)
      return !(v === undefined || v === null || v === '')
    }).map(key => {
      const k = key.replace(/(?=[A-Z])/g, '-').toLowerCase()
      return xssFilter.attrValue(`${k}:${vDom.style.get(key)}`)
    }).join(';')

    const attrs = Array.from(vDom.props.keys()).filter(key => key !== 'ref' && vDom.props.get(key) !== false).map(k => {
      const key = xssFilter.attrName(k)
      const value = vDom.props.get(k)
      return (value === true && /^\w+$/.test(key) ? `${key}` : `${key}="${xssFilter.attrValue(`${value}`)}"`)
    })

    if (styles) {
      attrs.push(`style="${styles}"`)
    }

    if (vDom.className) {
      attrs.push(`class="${xssFilter.attrValue(vDom.className)}"`)
    }

    let attrStr = attrs.join(' ')
    attrStr = attrStr ? ' ' + attrStr : ''
    if (this.singleTagTest.test(vDom.name)) {
      return `<${vDom.name}${attrStr}>`
    }
    const childHTML = vDom.children.map(child => {
      return this.vDomToHTMLString(child)
    }).join('')

    return [
      `<${vDom.name}${attrStr}>`,
      childHTML,
      `</${vDom.name}>`
    ].join('')
  }

  private replaceEmpty(s: string, target: string) {
    return s.replace(/\s\s+/g, str => {
      return ' ' + Array.from({
        length: str.length - 1
      }).fill(target).join('')
    }).replace(/^\s|\s$/g, target)
  }
}
