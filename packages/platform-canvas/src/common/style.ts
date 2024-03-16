import { Container } from '../lib/container'

export interface InheritableStyles {
  color: string
  fontSize: number
  fontWeight: string
  fontStyle: string
  lineHeight: number
  fontFamily: string
}

export type CSSNumber = number | [number] | [number, number] | [number, number, number] | [number, number, number, number]

export interface StyleProperties extends InheritableStyles {
  width: number | 'auto'
  height: number | 'auto'
  borderWidth: number
  left: number
  top: number
  backgroundColor: string
  borderStyle: 'dashed' | 'solid' | 'double' | 'dotted' | ''
  borderColor: string
  borderRadius: CSSNumber
  padding: CSSNumber
  margin: CSSNumber
  overflow: 'visible' | 'hidden' | 'auto' | 'scroll'
}

const inheritableStyleKeys: Array<keyof InheritableStyles> = [
  'color',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'lineHeight',
  'fontFamily'
]

const defaultStyles: Partial<StyleProperties> = {
  width: 'auto',
  height: 'auto',
  borderWidth: 0,
  left: 0,
  top: 0,
  padding: [0, 0, 0, 0],
  margin: [0, 0, 0, 0],
  overflow: 'visible',
  borderRadius: [0, 0, 0, 0],
  backgroundColor: '',
  borderStyle: '',
  borderColor: '',
}
const defaultStyleEntries = Object.entries(defaultStyles)

export class Style<T extends StyleProperties = StyleProperties> {
  static create(node: Container): StyleProperties {
    const style = new Style(node)

    return new Proxy(style, {
      get(target: Style, p: string | symbol): any {
        const v = style.get(p as any)
        if (v === null || typeof v === 'undefined' || v === '') {
          if (inheritableStyleKeys.includes(p as any)) {
            return style.node.parentNode?.style[p]
          }
        }
        return v
      },
      set(target: Style, p: string | symbol, newValue: any): boolean {
        style.set(p as any, newValue)
        node.markAsDirty()
        return true
      }
    }) as any
  }

  styles = new Map<string, any>(defaultStyleEntries)

  constructor(public node: Container) {
  }

  set<K extends keyof T, V = T[K]>(key: K, value: V) {
    this.styles.set(key as any, value)
  }

  get<K extends keyof T>(key: K): T[K] {
    return this.styles.get(key as any)
  }

  has<K extends keyof T>(key: K): boolean {
    return this.styles.has(key as any)
  }
}
