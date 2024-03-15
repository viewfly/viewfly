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

  get children() {
    return [...this._children]
  }

  private _children: Array<Container | Text> = []
  private attrs = new Map<string, any>()

  constructor(public name: string) {
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

  render(context: CanvasRenderingContext2D, renderContext: RenderContext): BoxSize {
    const { overflow, backgroundColor, borderWidth: bw, borderColor, borderRadius: radius, padding, width, height } = this.style
    const borderRadius = normalizeCSSNumber(radius)
    const [p1, , , p4] = normalizeCSSNumber(padding)
    const borderWidth = bw || 0

    const borderRenderParams: RectRenderParams = {
      width: width - borderWidth,
      height: height - borderWidth,
      top: renderContext.top + borderWidth / 2,
      left: renderContext.left + borderWidth / 2,
      borderRadius
    }
    if (overflow === 'hidden') {
      const contentRenderParams: RectRenderParams = {
        width: width - borderWidth * 2,
        height: height - borderWidth * 2,
        top: renderContext.top + borderWidth,
        left: renderContext.left + borderWidth,
        borderRadius,
      }
      this.renderRect(context, contentRenderParams)
      context.save()
      context.clip()
    }
    const childRenderContext: RenderContext = {
      left: renderContext.left + borderWidth + p4,
      top: renderContext.top + borderWidth + p1
    }
    let contentHeight = 0
    for (const child of this._children) {
      const size = child.render(context, childRenderContext)
      childRenderContext.top += size.height
      contentHeight += size.height
    }
    if (overflow === 'hidden') {
      context.restore()
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
      width: this.style.width,
      height: this.style.height || contentHeight
    }
  }

  private renderRect(context: CanvasRenderingContext2D, renderContext: RectRenderParams) {
    const { left, top, borderRadius: [r1, r2, r3, r4], width, height } = renderContext
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
