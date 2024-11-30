import { Plugin } from 'vite'

/**
 * 是否在 vue 项目中接入，默认为 false
 * 如果在 vue 项目中，请传入 true
 * @param inVue
 */
export default function viteScopedCssPlugin(inVue?: boolean): Plugin
