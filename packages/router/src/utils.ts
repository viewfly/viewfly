import { RouteConfig } from './router.interface'

function _formatRoute(config: RouteConfig) {
  const path = config.path.replace(/\/\//g, '\/')
  config.path = config.path.startsWith('\/') ? path : ('\/' + path)
}

/**
 * 注意：该方法具有副作用，会将配置内的路径格式化
 * @param routeConfig 
 * @returns 
 */
export function formatRoute<T extends RouteConfig | RouteConfig[]>(routeConfig: T) {
  if (Array.isArray(routeConfig)) {
    routeConfig.forEach(_formatRoute)
  } else {
    _formatRoute(routeConfig)
  }

  return routeConfig
}