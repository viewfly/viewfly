import { Container } from './container'
import { BoxSize, getTextHeight, RenderContext } from '../common/help'

export class Text {
  parentNode: Container | null = null

  constructor(public textContent: string) {
  }

  remove() {
    this.parentNode?.removeChild(this)
  }

  setText(text: string) {
    this.textContent = text
    this.parentNode?.markAsDirty()
  }

  render(context: CanvasRenderingContext2D, renderContext: RenderContext): BoxSize {
    const { fontSize, lineHeight, width, color } = this.parentNode!.style
    context.font = `${fontSize}px Arial`
    context.fillStyle = color || '#000000'
    context.fillText(this.textContent, renderContext.left, renderContext.top + 30)
    const defaultWidth = context.measureText(this.textContent).width
    if (defaultWidth < width) {
      return {
        width: defaultWidth,
        height: fontSize * lineHeight
      }
    }
    return {
      width,
      height: getTextHeight(context, this.textContent, fontSize, lineHeight, width)
    }
  }
}
