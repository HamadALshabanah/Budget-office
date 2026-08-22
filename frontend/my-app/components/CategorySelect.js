'use client';
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { flattenTree } from '../lib/categories';
import { addCategory } from '../lib/api';

// Dropdown of the category tree. Value = category_id, label = full path.
// Pass onTreeRefresh to enable the "+" quick-create button; after creating,
// the parent refetches the tree and the new node is selected automatically.
export default function CategorySelect({ tree, value, onChange, required, placeholder, className, excludeIds = [], onTreeRefresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const options = flattenTree(tree).filter(o => !excludeIds.includes(o.id));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      const created = await addCategory({ name: name.trim(), parent_id: parentId ? Number(parentId) : null });
      setShowAdd(false);
      setName('');
      setParentId('');
      if (onTreeRefresh) await onTreeRefresh();
      onChange(created.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex gap-1.5">
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
        required={required}
        className={className || 'input-field w-full p-2 text-sm'}
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o.id} value={o.id}>{o.path}</option>
        ))}
      </select>

      {onTreeRefresh && (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="btn-secondary shrink-0 w-9 rounded flex items-center justify-center"
          title="New category"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}

      {showAdd && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
          <div className="panel p-5 w-full max-w-sm animate-fade-up" style={{ background: 'var(--surface-raised)' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-heading text-sm" style={{ color: 'var(--text-primary)' }}>New category</h3>
              <button type="button" onClick={() => setShowAdd(false)} className="icon-btn">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input-field w-full p-2 text-sm"
                  placeholder="e.g. Coffee"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Under</label>
                <select
                  value={parentId}
                  onChange={e => setParentId(e.target.value)}
                  className="input-field w-full p-2 text-sm"
                >
                  <option value="">Top level</option>
                  {flattenTree(tree).map(o => (
                    <option key={o.id} value={o.id}>{o.path}</option>
                  ))}
                </select>
              </div>
              {error && (
                <p className="text-[10px]" style={{ color: 'var(--danger)' }}>{error}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1 py-2 text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 py-2 text-xs disabled:opacity-40">
                  {saving ? 'Saving...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
