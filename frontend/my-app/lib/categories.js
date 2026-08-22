// Helpers for the /categories tree API.

// Flatten the tree into selectable options with full-path labels:
// Expense / Coffee / Shovel Coffee
export function flattenTree(nodes, prefix = '') {
  const out = [];
  for (const n of nodes || []) {
    const path = prefix ? `${prefix} / ${n.name}` : n.name;
    out.push({ id: n.id, name: n.name, path, level: n.level, category_limit: n.category_limit });
    out.push(...flattenTree(n.children, path));
  }
  return out;
}

// Short badge label: last two segments, like the old "main / sub" display.
export function shortPath(path) {
  const parts = (path || '').split(' / ');
  return parts.slice(-2).join(' / ');
}

// { id: option } lookup for resolving category_id -> path/limit.
export function buildPathMap(tree) {
  const map = {};
  for (const opt of flattenTree(tree)) map[opt.id] = opt;
  return map;
}

// A node plus all its descendants — exclude these when choosing a new parent,
// otherwise moving a node under itself would corrupt the tree.
export function subtreeIdSet(nodes, rootId) {
  const out = new Set([rootId]);
  const walk = (list, inside) => {
    for (const n of list || []) {
      if (inside || n.id === rootId) {
        out.add(n.id);
        walk(n.children, true);
      } else {
        walk(n.children, false);
      }
    }
  };
  walk(nodes, false);
  return [...out];
}
