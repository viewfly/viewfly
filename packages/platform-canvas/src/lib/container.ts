import { Style } from '../common/style'
import { Text } from './text'
import { normalizeCSSNumber, BoxSize, RenderContext } from '../common/help'

interface RectRenderParams {
  left: number
  top: number
  width: number
  height: number
  borderRadius: [number, number, number, number]
}


export class Container {
  parentNode: Container | null = null
  style = Style.create(this)

  get offsetWidth() {
    const { width, margin } = this.style
    const [, m2, , m4] = normalizeCSSNumber(margin)
    if (width === 'auto') {
      if (this.parentNode) {
        const parentInnerWidth = this.parentNode.innerWidth
        return parentInnerWidth - m2 - m4
      }
      return 0
    }
    return width
  }

  get innerWidth() {
    const offsetWidth = this.offsetWidth
    if (offsetWidth === 0) {
      return 0
    }
    const { padding, borderWidth } = this.style
    const [, pr, , pl] = normalizeCSSNumber(padding)
    const width = offsetWidth - pr - pl - borderWidth * 2
    return width < 0 ? 0 : width
  }

  get offsetHeight() {
    const h = this.style.height
    if (typeof h === 'number') {
      return h
    }
    let totalHeight = 0
    for (const child of this._children) {
      totalHeight += child.offsetHeight
      if (child instanceof Container) {
        const [m1, , m3] = normalizeCSSNumber(child.style.margin)
        totalHeight += (m1 + m3)
      }
    }
    const { padding, borderWidth } = this.style
    const [pt, , pb] = normalizeCSSNumber(padding)
    return totalHeight + pt + pb + borderWidth * 2
  }

  //
  // get offsetTop() {
  //
  // }

  get children() {
    return [...this._children]
  }

  private _children: Array<Container | Text> = []
  private attrs = new Map<string, any>()

  constructor(public name: string,
              protected context: CanvasRenderingContext2D) {
  }

  setAttribute(key: string, value: any) {
    this.attrs.set(key, value)
    this.markAsDirty()
  }

  prependChild(node: Container | Text) {
    node.remove()
    this._children.unshift(node)
    node.parentNode = this
    this.markAsDirty()
  }

  appendChild(node: Container | Text) {
    node.remove()
    this._children.push(node)
    node.parentNode = this
    this.markAsDirty()
  }

  insertAfter(node: Container | Text, ref: Container | Text) {
    node.remove()
    const index = this._children.indexOf(ref)
    if (index > -1) {
      this._children.splice(index + 1, 0, node)
      node.parentNode = this
      this.markAsDirty()
    }
  }

  removeChild(node: Container | Text) {
    const index = this._children.indexOf(node)
    if (index > -1) {
      this._children.splice(index, 1)
      node.parentNode = null
      this.markAsDirty()
    }
  }

  remove() {
    this.parentNode?.removeChild(this)
  }

  markAsDirty() {
    this.parentNode?.markAsDirty()
  }

  render(renderContext: RenderContext): BoxSize {
    const context = this.context
    const { overflow, backgroundColor, borderWidth: bw, borderColor, borderRadius: radius, padding, margin } = this.style
    const borderRadius = normalizeCSSNumber(radius)
    const [p1, , , p4] = normalizeCSSNumber(padding)
    const [m1, , m3, m4] = normalizeCSSNumber(margin)
    const borderWidth = bw || 0

    const width = this.offsetWidth
    const height = this.offsetHeight
    const top = renderContext.top + m1
    const left = renderContext.left + m4

    if (overflow === 'hidden') {
      const contentRenderParams: RectRenderParams = {
        width: width - borderWidth * 2,
        height: height - borderWidth * 2,
        top: top + borderWidth,
        left: left + borderWidth,
        borderRadius: borderRadius.map(i => i - borderWidth) as any,
      }
      this.renderRect(context, contentRenderParams)
      context.save()
      context.clip()
    }
    const childRenderContext: RenderContext = {
      left: left + borderWidth + p4,
      top: top + borderWidth + p1,
    }
    // let contentHeight = 0
    for (const child of this._children) {
      const size = child.render(childRenderContext)
      childRenderContext.top += size.height
      // contentHeight += size.height
    }
    if (overflow === 'hidden') {
      context.restore()
    }
    const borderRenderParams: RectRenderParams = {
      width: width - borderWidth,
      height: height - borderWidth,
      top: top + borderWidth / 2,
      left: left + borderWidth / 2,
      borderRadius: borderRadius.map(i => i - borderWidth / 2) as any,
    }
    context.save()
    if (borderColor && borderWidth) {
      this.renderRect(context, borderRenderParams)
      context.globalCompositeOperation = 'destination-over'
      context.strokeStyle = borderColor
      context.lineWidth = borderWidth
      context.stroke()
    }
    if (backgroundColor) {
      this.renderRect(context, borderRenderParams)
      context.globalCompositeOperation = 'destination-over'
      context.fillStyle = backgroundColor
      context.fill()
    }
    context.restore()

    return {
      width,
      height: height + m1 + m3,
      bottomDistance: m3
    }
  }

  private renderRect(context: CanvasRenderingContext2D, renderContext: RectRenderParams) {
    const { left, top, borderRadius, width, height } = renderContext
    let [r1, r2, r3, r4] = borderRadius
    r1 = Math.min(r1, width / 2, height / 2)
    r2 = Math.min(r2, width / 2, height / 2)
    r3 = Math.min(r3, width / 2, height / 2)
    r4 = Math.min(r4, width / 2, height / 2)
    context.beginPath()
    context.moveTo(left + r1, top)
    context.lineTo(left + width - r2, top)
    context.arcTo(left + width, top, left + width, top + r2, r2)
    context.lineTo(left + width, top + height - r3)
    context.arcTo(left + width, top + height, left + width - r3, top + height, r3)
    context.lineTo(left + r4, top + height)
    context.arcTo(left, top + height, left, top + height - r4, r4)
    context.lineTo(left, top + r1)
    context.arcTo(left, top, left + r1, top, r1)
    context.closePath()
  }
}
