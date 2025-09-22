const API_BASE = import.meta.env.VITE_API_BASE || ''

export function apiUrl(path: string){
  if (!API_BASE) return path
  if (path.startsWith('/')) return API_BASE + path
  return API_BASE + '/' + path
}

