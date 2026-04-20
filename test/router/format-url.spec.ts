import { formatQueryParams, formatUrl } from '@viewfly/router'

describe('formatUrl / formatQueryParams：地址拼接', () => {
  test('formatUrl 折叠多余斜杠并附加查询与 hash', () => {
    expect(
      formatUrl('//a//b/', {
        queryParams: { x: '1' },
        fragment: 'h'
      })
    ).toBe('/a/b/?x=1#h')
  })

  test('formatUrl 在无查询与 hash 时仅返回规范化路径', () => {
    expect(formatUrl('/page', {})).toBe('/page')
  })

  test('formatQueryParams 支持数组值（同 key 多条）', () => {
    expect(
      formatQueryParams({ tag: ['a', 'b'], ok: '1' })
    ).toBe('tag=a&tag=b&ok=1')
  })

  test('formatQueryParams 对值做 decodeURIComponent 写入（与 navigator 行为一致）', () => {
    expect(formatQueryParams({ q: 'a%20b' })).toBe('q=a b')
  })
})
