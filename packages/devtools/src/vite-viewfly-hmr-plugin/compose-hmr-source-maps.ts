import remapping from '@ampproject/remapping'

/** 与 Vite transform `map` 字段兼容的 decoded JSON source map。 */
export interface RawSourceMapJson {
  version?: number
  mappings: string
  sources?: string[]
  sourcesContent?: (string | null)[]
  names?: string[]
  file?: string
  sourceRoot?: string
}

export function normalizeSourceMapInput(map: unknown): RawSourceMapJson | null {
  if (map == null) {
    return null
  }
  if (typeof map === 'string') {
    try {
      return JSON.parse(map) as RawSourceMapJson
    } catch {
      return null
    }
  }
  const toJSON = (map as { toJSON?: () => RawSourceMapJson }).toJSON
  if (typeof toJSON === 'function') {
    return toJSON.call(map)
  }
  return map as RawSourceMapJson
}

/**
 * 自左向右：maps[0] 为「最新一步」产物 → 上一步；maps[last] 为第一步输入（通常为 Vite 传入的模块文本）。
 * 与 `@ampproject/remapping` 约定一致。
 */
export function composeVitePluginSourceMaps(
  maps: (RawSourceMapJson | null | undefined)[],
): RawSourceMapJson | null {
  const list = maps.map(normalizeSourceMapInput).filter(Boolean) as RawSourceMapJson[]
  if (list.length === 0) {
    return null
  }
  if (list.length === 1) {
    return list[0]!
  }
  return remapping(list as Parameters<typeof remapping>[0], () => null) as RawSourceMapJson
}

/** 将本插件产出 map（输出 → 当前 transform 输入）再接上 Vite 传入的 combined map（输入 → 更上游源码）。 */
export function appendUpstreamSourceMap(
  pluginMap: RawSourceMapJson | null | undefined,
  viteCombined: unknown,
): RawSourceMapJson | null {
  const downstream = normalizeSourceMapInput(pluginMap)
  const upstream = normalizeSourceMapInput(viteCombined)
  if (downstream && upstream) {
    return remapping([downstream as any, upstream as any], () => null) as RawSourceMapJson
  }
  return downstream ?? upstream ?? null
}
