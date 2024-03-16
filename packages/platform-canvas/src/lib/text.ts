import { Container } from './container'
import { BoxSize, getTextHeight, RenderContext } from '../common/help'

export class Text {
  parentNode: Container | null = null

  get offsetHeight() {
    if (!this.parentNode) {
      return 0
    }
    const maxWidth = this.parentNode.innerWidth
    const { fontSize, lineHeight, fontFamily } = this.parentNode.style
    const context = this.context
    context.save()
    context.font = `${fontSize}px ${fontFamily}`
    const height = getTextHeight(context, this.textContent, lineHeight, maxWidth)
    context.restore()
    return height
  }

  constructor(public textContent: string,
              private context: CanvasRenderingContext2D) {
  }

  remove() {
    this.parentNode?.removeChild(this)
  }

  setText(text: string) {
    this.textContent = text
    this.parentNode?.markAsDirty()
  }

  render(renderContext: RenderContext): BoxSize {
    const context = this.context
    const { fontSize, lineHeight, color } = this.parentNode!.style
    const width = this.parentNode?.offsetWidth || 0
    context.font = `${fontSize}px Arial`
    context.fillStyle = color || '#000000'
    context.textBaseline = 'middle'
    context.fillText(this.textContent, renderContext.left, renderContext.top + lineHeight / 2)
    const defaultWidth = context.measureText(this.textContent).width
    if (defaultWidth < width) {
      return {
        width: defaultWidth,
        height: Math.max(fontSize, lineHeight),
        bottomDistance: 0
      }
    }
    return {
      width,
      height: getTextHeight(context, this.textContent, lineHeight, width),
      bottomDistance: 0
    }
  }
}
