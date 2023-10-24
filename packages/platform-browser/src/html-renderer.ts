import { NativeRenderer } from '@viewfly/core'

export class VDOMElement {
  props = new Map<string, any>()
  children: Array<VDOMElement | VDomText> = []
  style = new Map<string, any>()
  className = ''
  parent: VDOMElement | null = null

  constructor(public name: string) {
  }
}

export class VDomText {
  parent: VDOMElement | null = null

  constructor(public text: string) {
  }
}

/**
 * 用于生成模拟轻量 DOM 节点的渲染器
 */
export class HTMLRenderer extends NativeRenderer<VDOMElement, VDomText> {
  createElement(name: string): VDOMElement {
    return new VDOMElement(name)
  }

  createTextNode(textContent: string): VDomText {
    return new VDomText(textContent)
  }

  setProperty(node: VDOMElement, key: string, value: any): void {
    node.props.set(key, value)
  }

  prependChild(parent: VDOMElement, newChild: VDOMElement | VDomText): void {
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

  remove(node: VDOMElement | VDomText): void {
    if (node.parent) {
      const i = node.parent.children.indexOf(node)
      if (i > -1) {
        node.parent.children.splice(i, 1)
      }
    }
    node.parent = null
  }

  syncTextContent(target: VDomText, content: string): void {
    target.text = content
  }

  insertAfter(newNode: VDOMElement | VDomText, ref: VDOMElement | VDomText): void {
    const parent = ref.parent
    if (parent) {
      const i = parent.children.indexOf(ref)
      if (i > -1) {
        newNode.parent = parent
        parent.children.splice(i + 1, 0, newNode)
      }
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

  private vDomToHTMLString(vDom: VDOMElement | VDomText): string {
    const xssFilter = OutputTranslator.simpleXSSFilter

    if (vDom instanceof VDomText) {
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
      return (value === true ? `${key}` : `${key}="${xssFilter.attrValue(`${value}`)}"`)
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
