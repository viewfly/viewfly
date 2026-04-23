import type { JSXNode } from '@viewfly/core'
import { createDerived, createSignal } from '@viewfly/core'
import type { ClassNames } from '@viewfly/core'

export type InputSize = 'small' | 'middle' | 'large'

export type InputHtmlType = 'text' | 'password' | 'search' | 'email' | 'number' | 'tel' | 'url'

export interface InputProps {
  /** 受控值 */
  value?: string
  /** 非受控初始值 */
  defaultValue?: string
  /** 输入变化（每次输入触发） */
  onChange?: (value: string) => void
  onFocus?: (e: FocusEvent) => void
  onBlur?: (e: FocusEvent) => void
  onKeyDown?: (e: KeyboardEvent) => void
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  type?: InputHtmlType
  size?: InputSize
  /** 块级宽度 */
  block?: boolean
  class?: ClassNames
  /** 前置内容：图标、文案或按钮等 */
  prefix?: JSXNode
  /** 后置内容：图标、文案或按钮等 */
  suffix?: JSXNode
  id?: string
  name?: string
  autoComplete?: string
  maxLength?: number
  minLength?: number
  pattern?: string
  required?: boolean
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search'
  ariaLabel?: string
  ariaDescribedby?: string
  ariaInvalid?: boolean
}

export function Input(props: InputProps) {
  const uncontrolled = createSignal(props.defaultValue ?? '')
  const text = createDerived(() => (props.value !== undefined ? props.value : uncontrolled()))

  const commit = (next: string) => {
    if (props.value === undefined) {
      uncontrolled.set(next)
    }
    props.onChange?.(next)
  }

  const onInput = (e: Event) => {
    if (props.disabled || props.readOnly) return
    const el = e.target as HTMLInputElement
    commit(el.value)
  }

  return () => {
    const {
      disabled = false,
      readOnly = false,
      placeholder,
      type = 'text',
      size = 'middle',
      block = false,
      class: rootClass,
      prefix,
      suffix,
      id,
      name,
      autoComplete,
      maxLength,
      minLength,
      pattern,
      required,
      inputMode,
      onFocus,
      onBlur,
      onKeyDown,
      ariaLabel,
      ariaDescribedby,
      ariaInvalid,
    } = props

    const useAffix = prefix != null || suffix != null
    const sizeMod = size === 'middle' ? '' : ` vfui-input-affix--size-${size}`
    const sizeModInput = size === 'middle' ? '' : ` vfui-input--size-${size}`
    const blockMod = block ? ' vfui-input-affix--block' : ''
    const blockModSingle = block ? ' vfui-input--block' : ''
    const disabledMod = disabled ? ' vfui-input-affix--disabled' : ''
    const disabledModSingle = disabled ? ' vfui-input--disabled' : ''

    const affixCls = `vfui-input-affix${sizeMod}${blockMod}${disabledMod}`
    const singleCls = `vfui-input${sizeModInput}${blockModSingle}${disabledModSingle}`
    const nestedInputCls = `vfui-input vfui-input--in-affix${sizeModInput}`

    const field = (
      <input
        id={id}
        type={type}
        class={useAffix ? [nestedInputCls, rootClass] : [singleCls, rootClass]}
        value={text()}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        name={name}
        autoComplete={autoComplete}
        maxLength={maxLength}
        minLength={minLength}
        pattern={pattern}
        required={required}
        inputMode={inputMode}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedby}
        aria-invalid={ariaInvalid ? true : undefined}
        onInput={onInput}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
    )

    if (!useAffix) {
      return field
    }

    return (
      <div class={[affixCls, rootClass]} aria-disabled={disabled ? true : undefined}>
        {prefix != null ? <span class="vfui-input-affix__addon vfui-input-affix__addon--prefix">{prefix}</span> : null}
        {field}
        {suffix != null ? <span class="vfui-input-affix__addon vfui-input-affix__addon--suffix">{suffix}</span> : null}
      </div>
    )
  }
}
