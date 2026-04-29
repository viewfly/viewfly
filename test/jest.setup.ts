const originalConsoleError = console.error

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const [first] = args
    const text = typeof first === 'string' ? first : String(first)
    if (text.includes('Not implemented: navigation (except hash changes)')) {
      return
    }
    originalConsoleError(...args)
  })
})

afterAll(() => {
  ;(console.error as jest.Mock).mockRestore?.()
})
