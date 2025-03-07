export interface UrlRelativePath {
  type: 'toParent'
}


export interface UrlChildPath {
  type: 'toChild'
  value: string
}

export interface UrlQuery {
  type: 'query'
  params: UrlQueryParams
}

export interface UrlQueryParams {
  [key: string]: string | string[]
}

export interface UrlHash {
  type: 'hash'
  value: string
}

export type UrlToken = UrlRelativePath | UrlChildPath | UrlQuery | UrlHash

export interface UrlTree {
  paths: string[]
  queryParams: UrlQueryParams
  hash: string | null
}

export class UrlParser {
  private index = 0
  private url = ''
  private tokens: UrlToken[] = []

  parse(url: string): UrlTree {
    this.index = 0
    this.url = url
    this.tokens = []
    while (this.index < this.url.length) {
      this.ignore('/')
      if (this.peek('../')) {
        this.tokens.push({
          type: 'toParent'
        })
        this.index += 3
      } else if (this.peek('?')) {
        this.index++
        this.tokens.push({
          type: 'query',
          params: this.readQuery()
        })
      } else if (this.peek('#')) {
        this.index++
        this.tokens.push({
          type: 'hash',
          value: this.readHash()
        })
      } else {
        if (this.peek('./')) {
          this.index += 2
        }

        const path = this.readPath()
        if (path) {
          this.tokens.push({
            type: 'toChild',
            value: path
          })
        }
      }
    }

    const urlTree: UrlTree = {
      paths: [],
      queryParams: {},
      hash: null
    }
    for (const item of this.tokens) {
      switch (item.type) {
        case 'toParent':
          urlTree.paths.pop()
          break
        case 'toChild':
          urlTree.paths.push(item.value)
          break
        case 'query':
          urlTree.queryParams = item.params
          break
        case 'hash':
          urlTree.hash = item.value
      }
    }
    return urlTree
  }

  private readHash() {
    const hash = this.url.substring(this.index)
    this.index = this.url.length
    return hash
  }

  private readQuery() {
    const query: Record<string, any> = {}
    while (this.index < this.url.length) {
      const key = this.readQueryKey()
      let value = ''
      if (this.peek('=')) {
        this.index++
        value = this.readQueryValue()
      }
      const oldValue = query[key]
      if (oldValue) {
        if (Array.isArray(oldValue)) {
          oldValue.push(value)
        } else {
          query[key] = [oldValue, value]
        }
      } else {
        query[key] = value
      }
      if (this.peek('&')) {
        this.index++
        continue
      }
      break
    }
    return query
  }

  private readQueryValue() {
    const chars: string[] = []
    while (this.index < this.url.length) {
      if (this.not('&#')) {
        chars.push(this.url.at(this.index)!)
        this.index++
        continue
      }
      break
    }
    return chars.join('')
  }

  private readQueryKey() {
    const chars: string[] = []
    while (this.index < this.url.length) {
      if (this.not('=&#')) {
        chars.push(this.url.at(this.index)!)
        this.index++
        continue
      }
      break
    }
    return chars.join('')
  }

  private readPath() {
    const chars: string[] = []
    while (this.index < this.url.length) {
      if (this.not('./?#')) {
        chars.push(this.url.at(this.index)!)
        this.index++
        continue
      }
      break
    }
    return chars.join('')
  }

  private not(text: string) {
    const ch = this.url.at(this.index)!
    return text.indexOf(ch) === -1
  }

  private peek(str: string) {
    return this.url.slice(this.index, this.index + str.length) === str
  }

  private ignore(str: string) {
    while (this.peek(str)) {
      this.index++
    }
  }
}
