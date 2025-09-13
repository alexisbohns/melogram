import { derived, writable, type Readable } from 'svelte/store'
import { load as yamlLoad } from 'js-yaml'

type Dict = Record<string, unknown>

// Import all locale YAML files as raw strings and parse them
// Vite: use query + import per deprecation notice
const rawFiles = import.meta.glob('./locales/*.yml', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

const catalogs: Record<string, Dict> = {}
for (const path in rawFiles) {
  const raw = rawFiles[path]
  const locale = path.split('/').pop()!.split('.')[0]
  try {
    catalogs[locale] = (yamlLoad(raw) as Dict) ?? {}
  } catch (e) {
    catalogs[locale] = {}
  }
}

export type Locale = keyof typeof catalogs extends string ? keyof typeof catalogs : string

export const locale = writable<Locale>((('fr' in catalogs ? 'fr' : (Object.keys(catalogs)[0] as Locale)) || 'en') as Locale)

export const dictionary: Readable<Dict> = derived(locale, ($l) => catalogs[$l] ?? {})

function get(obj: any, path: string) {
  return path.split('.').reduce((o, k) => (o && typeof o === 'object' ? (o as any)[k] : undefined), obj)
}

function format(str: string, params?: Record<string, unknown>) {
  if (!params) return str
  return str.replace(/\{(.*?)\}/g, (_, k) => {
    const v = params[k]
    return v == null ? '' : String(v)
  })
}

export const t: Readable<(key: string, params?: Record<string, unknown>) => string> = derived(
  dictionary,
  ($d) => (key: string, params?: Record<string, unknown>) => {
    const val = get($d, key)
    if (typeof val === 'string') return format(val, params)
    return key
  }
)

export function setLocale(l: Locale) {
  if (catalogs[l]) locale.set(l)
}
