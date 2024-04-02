import { Container } from './container'
import { BoxSize, RenderContext } from '../common/help'

export class Text {
  parentNode: Container | null = null

  get offsetHeight() {
    if (!this.parentNode) {
      return 0
    }

    if (this._offsetHeight !== null) {
      return this._offsetHeight
    }
    const { fontSize, lineHeight, fontFamily } = this.parentNode.style
    const context = this.context
    context.save()
    context.font = `${fontSize}px ${fontFamily}`

    const width = this.parentNode?.innerWidth || 0
    let lineWidth = 0
    let lineCount = this.textContent ? 1 : 0
    for (const ch of this.textContent) {
      const charWidth = context.measureText(ch).width
      if (lineWidth + charWidth <= width) {
        lineWidth += charWidth
        continue
      }
      lineCount++
      lineWidth = charWidth
    }

    const height = lineHeight * lineCount
    context.restore()
    this._offsetHeight = height
    return height
  }

  private _offsetHeight: number | null = null

  constructor(public textContent: string,
              private context: CanvasRenderingContext2D) {
  }

  remove() {
    this._offsetHeight = null
    this.parentNode?.removeChild(this)
  }

  setText(text: string) {
    this._offsetHeight = null
    this.textContent = text
    this.parentNode?.markAsDirty()
  }

  render(renderContext: RenderContext): BoxSize {
    const context = this.context
    const { fontSize, lineHeight, color, fontFamily } = this.parentNode!.style
    const width = this.parentNode?.innerWidth || 0
    context.font = `${fontSize}px ${fontFamily}`
    context.fillStyle = color || '#000000'
    context.textBaseline = 'middle'

    let line = ''
    let lineWidth = 0
    let top = renderContext.top
    let lineCount = this.textContent ? 1 : 0
    for (const ch of this.textContent) {
      const charWidth = context.measureText(ch).width
      if (lineWidth + charWidth <= width) {
        lineWidth += charWidth
        line += ch
        continue
      }
      context.fillText(line, renderContext.left, top + lineHeight / 2)
      lineCount++
      top += lineHeight
      line = ch
      lineWidth = charWidth
    }

    if (line) {
      context.fillText(line, renderContext.left, top + lineHeight / 2)
    }

    this._offsetHeight = lineHeight * lineCount

    return {
      width,
      height: this._offsetHeight,
      bottomDistance: 0
    }
  }
}
