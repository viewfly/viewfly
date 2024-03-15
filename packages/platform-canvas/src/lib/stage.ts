import { Container } from './container'

export class Stage extends Container {
  private context = this.canvas.getContext('2d')

  private microTask: Promise<void> | null = null

  constructor(public canvas: HTMLCanvasElement) {
    super('root')
    const ratio = window.devicePixelRatio || 1
    const { offsetWidth, offsetHeight } = canvas
    this.canvas.style.width = offsetWidth + 'px'
    this.canvas.style.height = offsetHeight + 'px'
    this.canvas.width = canvas.offsetWidth * ratio
    this.canvas.height = canvas.offsetHeight * ratio
    this.context!.scale(ratio, ratio)
    Object.assign(this.style, {
      fontSize: 16,
      lineHeight: 1.6
    })
  }

  override markAsDirty() {
    if (this.microTask) {
      return
    }
    this.microTask = Promise.resolve().then(() => {
      this.microTask = null
      this.render()
    })
  }

  override render() {
    if (this.context) {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
      super.render(this.context, {
        left: 0,
        top: 0
      })
    }
    return {
      width: this.canvas.width,
      height: this.canvas.height
    }
  }
}
