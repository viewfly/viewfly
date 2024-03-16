import { CSSNumber } from './style'

export interface RenderContext {
  left: number
  top: number
}

export interface BoxSize {
  width: number
  height: number
  bottomDistance: number
}

export function normalizeCSSNumber(v?: CSSNumber | null): [number, number, number, number] {
  if (typeof v === 'undefined' || v === null) {
    return [0, 0, 0, 0]
  }
  if (typeof v === 'number') {
    return [v, v, v, v]
  }
  if (v.length === 1) {
    v = v[0]
    return [v, v, v, v]
  }
  if (v.length === 2) {
    return [v[0], v[1], v[0], v[1]]
  }
  if (v.length === 3) {
    return [v[0], v[1], v[2], v[1]]
  }
  return v
}


export function getTextHeight(context: CanvasRenderingContext2D,
                              text: string,
                              lineHeight: number,
                              maxWidth: number) {
  const lines = text.split('\n')
  let totalHeight = 0
  lines.forEach(line => {
    const lines = Math.ceil(context.measureText(line).width / maxWidth)
    totalHeight += lineHeight * lines
  })
  return totalHeight
}
