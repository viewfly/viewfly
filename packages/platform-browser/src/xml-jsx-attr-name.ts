/**
 * 对标 React `possibleStandardNames`：SVG / Math 子树中 JSX 的 camelCase -> 真正写在 DOM 上的 attribute 名。
 * 易错、不能简单「插横线」的名字放在 XML_JSX_NAME_TO_ATTR；其余走受控的 kebab 回退。
 * @see https://github.com/facebook/react/blob/main/packages/react-dom-bindings/src/shared/possibleStandardNames.js
 */

/** 须按 XML/命名空间 语义单独处理的 JSX 名 -> setAttribute(…) 的完整名字（`xml:lang` 等） */
const XML_OR_XMLNS_JSX: Readonly<Record<string, string>> = {
  xmlBase: 'xml:base',
  'xml:base': 'xml:base',
  xmlLang: 'xml:lang',
  'xml:lang': 'xml:lang',
  xmlSpace: 'xml:space',
  'xml:space': 'xml:space',
  xmlns: 'xmlns',
  xmlnsXlink: 'xmlns:xlink',
  'xmlns:xlink': 'xmlns:xlink',
}

/**
 * 显式表：JSX 名 -> 属性名（多含 kebab 或需保留大小写如 viewBox）。
 * 全小写、单字符（x,y,r,cx 等）不必列出，会原样使用。
 */
export const XML_JSX_NAME_TO_ATTR: Readonly<Record<string, string>> = {
  /** 注意：勿在此写 `className`→`class`；`class` 仅由 renderer 的 setClass+classToString 处理，与 className 语义分离。 */
  tabIndex: 'tabindex',
  viewBox: 'viewBox',
  viewTarget: 'viewTarget',
  preserveAspectRatio: 'preserveAspectRatio',
  contentScriptType: 'contentScriptType',
  contentStyleType: 'contentStyleType',
  baseProfile: 'baseProfile',
  fontFamily: 'font-family',
  fontSize: 'font-size',
  fontStyle: 'font-style',
  fontWeight: 'font-weight',
  fontStretch: 'font-stretch',
  fontVariant: 'font-variant',
  fontSizeAdjust: 'font-size-adjust',
  textAnchor: 'text-anchor',
  textLength: 'textLength',
  textRendering: 'text-rendering',
  textDecoration: 'text-decoration',
  shapeRendering: 'shape-rendering',
  imageRendering: 'image-rendering',
  fillOpacity: 'fill-opacity',
  fillRule: 'fill-rule',
  strokeLinecap: 'stroke-linecap',
  strokeLinejoin: 'stroke-linejoin',
  strokeMiterlimit: 'stroke-miterlimit',
  strokeWidth: 'stroke-width',
  strokeOpacity: 'stroke-opacity',
  strokeDasharray: 'stroke-dasharray',
  strokeDashoffset: 'stroke-dashoffset',
  clipPath: 'clip-path',
  clipRule: 'clip-rule',
  clipPathUnits: 'clipPathUnits',
  colorInterpolation: 'color-interpolation',
  colorInterpolationFilters: 'color-interpolation-filters',
  colorRendering: 'color-rendering',
  colorProfile: 'color-profile',
  floodColor: 'flood-color',
  floodOpacity: 'flood-opacity',
  stopColor: 'stop-color',
  stopOpacity: 'stop-opacity',
  lightingColor: 'lighting-color',
  pointerEvents: 'pointer-events',
  maskContentUnits: 'maskContentUnits',
  patternContentUnits: 'patternContentUnits',
  patternTransform: 'patternTransform',
  patternUnits: 'patternUnits',
  gradientTransform: 'gradientTransform',
  gradientUnits: 'gradientUnits',
  filterUnits: 'filterUnits',
  filterRes: 'filterRes',
  primitiveUnits: 'primitiveUnits',
  kernelMatrix: 'kernelMatrix',
  kernelUnitLength: 'kernelUnitLength',
  markerStart: 'marker-start',
  markerEnd: 'marker-end',
  markerMid: 'marker-mid',
  markerWidth: 'markerWidth',
  markerHeight: 'markerHeight',
  markerUnits: 'markerUnits',
  startOffset: 'startOffset',
  pathLength: 'pathLength',
  keySplines: 'keySplines',
  keyPoints: 'keyPoints',
  keyTimes: 'keyTimes',
  xChannelSelector: 'xChannelSelector',
  yChannelSelector: 'yChannelSelector',
  stdDeviation: 'stdDeviation',
  specularConstant: 'specularConstant',
  specularExponent: 'specularExponent',
  diffuseConstant: 'diffuseConstant',
  limitingConeAngle: 'limitingConeAngle',
  requiredExtensions: 'requiredExtensions',
  requiredFeatures: 'requiredFeatures',
  tableValues: 'tableValues',
  numOctaves: 'numOctaves',
  wordSpacing: 'word-spacing',
  letterSpacing: 'letter-spacing',
  paintOrder: 'paint-order',
  transformOrigin: 'transform-origin',
  alignmentBaseline: 'alignment-baseline',
  dominantBaseline: 'dominant-baseline',
  baselineShift: 'baseline-shift',
  unicodeBidi: 'unicode-bidi',
  unicodeRange: 'unicode-range',
  unitsPerEm: 'units-per-em',
  xHeight: 'x-height',
  capHeight: 'cap-height',
  horizOriginX: 'horiz-origin-x',
  horizAdvX: 'horiz-adv-x',
  vertOriginX: 'vert-origin-x',
  vertOriginY: 'vert-origin-y',
  vAlphabetic: 'v-alphabetic',
  vHanging: 'v-hanging',
  vMathematical: 'v-mathematical',
  vIdeographic: 'v-ideographic',
  vertAdvY: 'vert-adv-y',
  refX: 'refX',
  refY: 'refY',
}

/**
 * 返回在 SVG / Math 元素上应使用的 content attribute 名（用于 set/removeAttribute，含 `xml:…`、`xmlns:…`）。
 */
export function getXmlPresentationAttributeName(jsxKey: string): string {
  if (XML_OR_XMLNS_JSX[jsxKey]) {
    return XML_OR_XMLNS_JSX[jsxKey]
  }
  if (Object.prototype.hasOwnProperty.call(XML_JSX_NAME_TO_ATTR, jsxKey)) {
    return XML_JSX_NAME_TO_ATTR[jsxKey as keyof typeof XML_JSX_NAME_TO_ATTR]
  }
  if (!/[A-Z]/.test(jsxKey)) {
    return jsxKey
  }
  return jsxKey.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}
