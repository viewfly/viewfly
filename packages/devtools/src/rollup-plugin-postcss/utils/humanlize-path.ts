import path from 'path'
import normalizePath from './normalize-path'

export default function humanlizePath(filepath: string): string {
  return normalizePath(path.relative(process.cwd(), filepath))
}
