const key = 'november-favorites';
/** Stores the visitor’s favorite room IDs on this browser. */
export function loadFavorites(validIds: ReadonlySet<string>): Set<string> {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return new Set(
      Array.isArray(data)
        ? data.filter((id): id is string => typeof id === 'string' && validIds.has(id))
        : [],
    );
  } catch {
    return new Set();
  }
}
export function persistFavorites(ids: ReadonlySet<string>): boolean {
  try {
    localStorage.setItem(key, JSON.stringify([...ids]));
    return true;
  } catch {
    return false;
  }
}
