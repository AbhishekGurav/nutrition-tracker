/** Lowercase, strip accents and punctuation, collapse whitespace. */
export function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9%.]+/g, " ")
    .trim()
}

export function tokenize(text: string) {
  const n = normalize(text)
  return n ? n.split(" ") : []
}

/**
 * Relevance score for `query` against `text` (0 = no match). Every query token
 * must appear; word-prefix and whole-word hits score higher, and earlier
 * matches beat later ones. Cheap enough to run on every keystroke for a few
 * thousand items.
 */
export function scoreMatch(text: string, query: string) {
  const q = tokenize(query)
  if (q.length === 0) return 1
  const words = tokenize(text)
  if (words.length === 0) return 0
  const joined = words.join(" ")
  let score = 0
  for (const token of q) {
    let best = 0
    for (let i = 0; i < words.length; i++) {
      const w = words[i]
      let s = 0
      if (w === token) s = 3
      else if (w.startsWith(token)) s = 2
      else if (w.includes(token)) s = 1
      // Plural/singular tolerance: "eggs" ~ "egg".
      else if (token.endsWith("s") && w === token.slice(0, -1)) s = 2.5
      else if (w.endsWith("s") && token === w.slice(0, -1)) s = 2.5
      if (s > 0) s += Math.max(0, 1 - i * 0.15)
      best = Math.max(best, s)
    }
    if (best === 0) {
      if (!joined.includes(token)) return 0
      best = 0.5
    }
    score += best
  }
  // Prefer shorter names when token scores tie ("Egg" over "Egg noodles").
  return score + 1 / (1 + words.length)
}

export function searchItems<T>(
  items: readonly T[],
  query: string,
  getText: (item: T) => string
): T[] {
  if (!normalize(query)) return [...items]
  return items
    .map((item) => ({ item, score: scoreMatch(getText(item), query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.item)
}
