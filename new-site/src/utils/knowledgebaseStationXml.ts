/**
 * Parse NRE Knowledgebase Stations XML (v4) into a plain JSON tree for display.
 * Browser-only (DOMParser). Strips namespaces; repeated sibling tags become arrays.
 */

export type KbJson =
  | string
  | number
  | boolean
  | null
  | KbJson[]
  | { [key: string]: KbJson }

function localName(tag: string): string {
  if (tag.includes(':')) return tag.split(':').pop() || tag
  return tag
}

function elementToJson(el: Element): KbJson {
  const children = [...el.childNodes]
  const elementChildren = children.filter((n): n is Element => n.nodeType === 1)
  const textParts = children
    .filter((n) => n.nodeType === 3 || n.nodeType === 4)
    .map((n) => (n.textContent || '').trim())
    .filter(Boolean)

  if (elementChildren.length === 0) {
    const text = textParts.join(' ').trim()
    if (text === 'true') return true
    if (text === 'false') return false
    return text
  }

  const obj: Record<string, KbJson> = {}
  for (const child of elementChildren) {
    const key = localName(child.tagName)
    const value = elementToJson(child)
    if (key in obj) {
      const existing = obj[key]
      obj[key] = Array.isArray(existing) ? [...existing, value] : [existing, value]
    } else {
      obj[key] = value
    }
  }

  if (textParts.length > 0) {
    obj['#text'] = textParts.join(' ')
  }

  return obj
}

export function parseKnowledgebaseStationXml(xmlText: string): KbJson {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml')
  const err = doc.querySelector('parsererror')
  if (err) throw new Error(err.textContent || 'Invalid XML')
  const root = doc.documentElement
  if (!root) throw new Error('Empty XML document')
  return { [localName(root.tagName)]: elementToJson(root) }
}
