import { UrlParser } from '@viewfly/router'

describe('UrlParser：URL 片段解析', () => {
  const parser = new UrlParser()

  test('解析单层路径并忽略前导斜杠', () => {
    expect(parser.parse('/home')).toEqual({
      paths: ['home'],
      queryParams: {},
      hash: null
    })
  })

  test('解析多级路径', () => {
    expect(parser.parse('/a/b/c')).toEqual({
      paths: ['a', 'b', 'c'],
      queryParams: {},
      hash: null
    })
  })

  test('解析查询串：单 key 与无等号取值', () => {
    expect(parser.parse('/p?flag')).toEqual({
      paths: ['p'],
      queryParams: { flag: '' },
      hash: null
    })
  })

  test('解析查询串：多个 key 与重复 key 合并为数组', () => {
    expect(parser.parse('/p?a=1&a=2&b=x')).toEqual({
      paths: ['p'],
      queryParams: { a: ['1', '2'], b: 'x' },
      hash: null
    })
  })

  test('解析 hash：取 # 后剩余子串', () => {
    expect(parser.parse('/p#section')).toEqual({
      paths: ['p'],
      queryParams: {},
      hash: 'section'
    })
  })

  test('解析路径中的 ./ 前缀', () => {
    expect(parser.parse('/x/./y')).toEqual({
      paths: ['x', 'y'],
      queryParams: {},
      hash: null
    })
  })

  test('解析 ../ 回退路径段', () => {
    expect(parser.parse('/a/b/../c')).toEqual({
      paths: ['a', 'c'],
      queryParams: {},
      hash: null
    })
  })

  test('组合：路径 + 查询 + hash', () => {
    expect(parser.parse('/list/tab?q=1#top')).toEqual({
      paths: ['list', 'tab'],
      queryParams: { q: '1' },
      hash: 'top'
    })
  })

  test('查询值在 & 或 # 处截断', () => {
    expect(parser.parse('/?v=a%26b')).toEqual({
      paths: [],
      queryParams: { v: 'a%26b' },
      hash: null
    })
  })
})
