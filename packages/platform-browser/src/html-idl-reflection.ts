/**
 * HTML 反射 IDL 属性：在「与 default / 未设」一致时须 removeAttribute，不能写 `node[idl] = ''`，
 * 否则会出现空 content 属性、错误约束（如 `pattern=""`、`maxLength=0` 等）。
 * @see https://html.spec.whatwg.org/ 2.3.1 Reflected attributes
 */

/**
 * 解析后的 IDL 名 -> content attribute 名。removeProperty 命中时仅 `removeAttribute(name)`。
 */
export const IDL_TO_CONTENT_ATTR: Readonly<Record<string, string>> = {
  accessKey: 'accesskey',
  accept: 'accept',
  async: 'async',
  autofocus: 'autofocus',
  acceptCharset: 'accept-charset',
  action: 'action',
  allow: 'allow',
  align: 'align',
  alt: 'alt',
  as: 'as',
  autoCapitalize: 'autocapitalize',
  autoComplete: 'autocomplete',
  challenge: 'challenge',
  charset: 'charset',
  cite: 'cite',
  color: 'color',
  cols: 'cols',
  'class': 'class',
  className: 'class',
  checked: 'checked',
  disabled: 'disabled',
  colSpan: 'colspan',
  content: 'content',
  crossOrigin: 'crossorigin',
  dateTime: 'datetime',
  decoding: 'decoding',
  default: 'default',
  defer: 'defer',
  download: 'download',
  enctype: 'enctype',
  encType: 'enctype',
  formAction: 'formaction',
  formEnctype: 'formenctype',
  formMethod: 'formmethod',
  formNoValidate: 'formnovalidate',
  formTarget: 'formtarget',
  height: 'height',
  href: 'href',
  hreflang: 'hreflang',
  htmlFor: 'for',
  httpEquiv: 'http-equiv',
  icon: 'icon',
  id: 'id',
  inputMode: 'inputmode',
  integrity: 'integrity',
  isMap: 'ismap',
  keytype: 'keytype',
  kind: 'kind',
  label: 'label',
  list: 'list',
  loading: 'loading',
  longDesc: 'longdesc',
  max: 'max',
  maxLength: 'maxlength',
  media: 'media',
  min: 'min',
  minLength: 'minlength',
  method: 'method',
  name: 'name',
  noModule: 'nomodule',
  noValidate: 'novalidate',
  open: 'open',
  optimum: 'optimum',
  part: 'part',
  pattern: 'pattern',
  ping: 'ping',
  placeholder: 'placeholder',
  popover: 'popover',
  referrerPolicy: 'referrerpolicy',
  readOnly: 'readonly',
  rel: 'rel',
  required: 'required',
  rowSpan: 'rowspan',
  rows: 'rows',
  scheme: 'scheme',
  size: 'size',
  sizes: 'sizes',
  slot: 'slot',
  span: 'span',
  src: 'src',
  srcset: 'srcset',
  selected: 'selected',
  srclang: 'srclang',
  start: 'start',
  step: 'step',
  tabIndex: 'tabindex',
  target: 'target',
  title: 'title',
  type: 'type',
  useMap: 'usemap',
  width: 'width',
  wrap: 'wrap',
}

/**
 * 常见「布尔受控」IDL：`false` 是合法值，不能当作“删除属性/恢复默认”。
 *（未列出的、未在 FALSY 表中的键，若用户误传 `false` 可能仍被转换，以各标签为准。）
 */
const BOOLEAN_IDL_EXCLUDE_FROM_FALSY: ReadonlySet<string> = new Set([
  'readOnly',
  'disabled',
  'required',
  'checked',
  'defaultChecked',
  'autofocus',
  'async',
  'selected',
  'defaultSelected',
  'multiple',
  'hidden',
  'autoplay',
  'controls',
  'loop',
  'muted',
  'defaultMuted',
  'allowFullscreen',
  'defer',
  'noModule',
  'reversed',
  'scoped',
  'seamless',
  'inert',
  'draggable',
  'indeterminate',
  'formNoValidate',
  'noValidate',
  'isMap',
  'default', // e.g. <track default> — false 是合法显式值
  'open', // <details> / <dialog> — false 为关闭
  'spellcheck', // 布尔/字符串混用，false 不当作 remove
])

/**
 * setProperty 时，若把 `false`、`''` 或非有限 number 当「不设置/默认」，应走 remove。
 * 不在此集合的 IDL 由通用逻辑或单独分支处理；布尔见上表排除。
 */
export const IDL_FALSY_OR_NONFINITE_REMOVES: ReadonlySet<string> = new Set([
  'maxLength',
  'minLength',
  'size',
  'cols',
  'rows',
  'tabIndex',
  'colSpan',
  'rowSpan',
  'span',
  'pattern',
  'id',
  'name',
  'type',
  'htmlFor',
  'min',
  'max',
  'step',
  'inputMode',
  'autoComplete',
  'autoCapitalize',
  'placeholder',
  'title',
  'alt',
  'src',
  'href',
  'crossOrigin',
  'integrity',
  'referrerPolicy',
  'rel',
  'target',
  'as',
  'action',
  'accept',
  'enctype',
  'encType',
  'method',
  'formAction',
  'formEnctype',
  'formMethod',
  'formTarget',
  'download',
  'list',
  'sizes',
  'srcset',
  'useMap',
  'align',
  'allow',
  'width',
  'height',
  'accessKey',
  'slot',
  'part',
  'popover',
  'loading',
  'decoding',
  'media',
  'ping',
  'acceptCharset',
  'color',
  'charset',
  'content',
  'httpEquiv',
  'dateTime',
  'cite',
  'wrap',
  'keytype',
  'challenge',
  'kind',
  'srclang',
  'icon',
  'optimum',
  'start',
  'label',
  'scheme',
  'longDesc',
])

/**
 * 是否应把 setProperty 改为 remove（`null`/`undefined` 由 setProperty 开头处理，此处不返回 true）。
 * `false`、`''`、非有限数（NaN、±∞）在允许列表上时视为与「未设」同义。
 */
export function isUnsetLikeReflectedIdlValue(resolvedIdlKey: string, value: unknown): boolean {
  if (value == null) {
    return false
  }
  if (BOOLEAN_IDL_EXCLUDE_FROM_FALSY.has(resolvedIdlKey)) {
    return false
  }
  if (!IDL_FALSY_OR_NONFINITE_REMOVES.has(resolvedIdlKey)) {
    return false
  }
  if (value === false || value === '') {
    return true
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return true
  }
  return false
}

/**
 * 由 IDL 名取 content attribute 名，无则 undefined。
 */
export function getContentAttrNameForIdl(resolvedIdlKey: string): string | void {
  return IDL_TO_CONTENT_ATTR[resolvedIdlKey as keyof typeof IDL_TO_CONTENT_ATTR]
}
