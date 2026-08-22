'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Plus, Pencil, Trash2, X, Save, ChevronDown, ChevronRight, ChevronLeft, Moon, Sun, FolderTree, Tag } from 'lucide-react';
import { fetchCategories, addCategory, updateCategory, deleteCategory, fetchRules, addRule, isAuthenticated } from '../../lib/api';
import { subtreeIdSet } from '../../lib/categories';
import CategorySelect from '../../components/CategorySelect';
import KeywordsInput from '../../components/KeywordsInput';
import { useLanguage } from '../../lib/LanguageContext';

function TreeRow({ node, depth, merchants, onEdit, onDelete, onAddChild, isRTL, t }) {
    const [open, setOpen] = useState(depth < 1);
    const hasKids = (node.children || []).length > 0;
    const Chevron = isRTL ? ChevronLeft : ChevronRight;
    const kws = merchants[node.id] || [];

    return (
        <div>
            <div
                className="p-3 group data-row flex items-center gap-2"
                style={{ paddingInlineStart: `${12 + depth * 20}px`, borderBottom: '1px solid var(--border)' }}
            >
                <button
                    onClick={() => hasKids && setOpen(!open)}
                    className={`w-5 h-5 shrink-0 flex items-center justify-center rounded ${hasKids ? 'hover:bg-[var(--base-subtle)]' : 'opacity-0 pointer-events-none'}`}
                    style={{ color: 'var(--text-muted)' }}
                >
                    {open ? <ChevronDown className="w-3.5 h-3.5" /> : <Chevron className="w-3.5 h-3.5" />}
                </button>

                <FolderTree className="w-3.5 h-3.5 shrink-0" style={{ color: node.level === 0 ? 'var(--accent)' : 'var(--text-muted)' }} />
                <span className="text-xs font-medium truncate flex-1" style={{ color: 'var(--text-primary)' }}>
                    {node.name}
                </span>
                {kws.length > 0 && (
                    <span
                        className="text-[9px] font-data px-1.5 py-0.5 rounded shrink-0"
                        title={kws.join(', ')}
                        style={{ background: 'var(--base-subtle)', color: 'var(--text-muted)' }}
                    >
                        <Tag className="w-2.5 h-2.5 inline mr-1 -mt-px" />
                        {kws.length} {isRTL ? 'تاجر' : kws.length === 1 ? 'merchant' : 'merchants'}
                    </span>
                )}
                {node.category_limit != null && (
                    <span className="text-[9px] font-data px-1.5 py-0.5 rounded shrink-0" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                        SAR {node.category_limit.toLocaleString()}
                    </span>
                )}
                <span className="text-[9px] font-data shrink-0" style={{ color: 'var(--text-muted)' }}>L{node.level}</span>

                <div className="flex gap-0.5 justify-end data-actions shrink-0">
                    <button onClick={() => onAddChild(node)} className="icon-btn" title={t('addCategory')}>
                        <Plus className="w-3 h-3" />
                    </button>
                    <button onClick={() => onEdit(node)} className="icon-btn" title={t('edit')}>
                        <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => onDelete(node)} className="icon-btn icon-btn-danger" title={t('delete')}>
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            </div>
            {open && kws.length > 0 && (
                <div className="flex flex-wrap gap-1 px-3 pb-2" style={{ paddingInlineStart: `${44 + depth * 20}px`, borderBottom: '1px solid var(--border)', marginTop: '-1px' }}>
                    {kws.map((kw, i) => (
                        <span key={i} className="badge badge-green text-[9px]">
                            <Tag className="w-2 h-2" />
                            {kw}
                        </span>
                    ))}
                </div>
            )}
            {open && hasKids && node.children.map(child => (
                <TreeRow key={child.id} node={child} depth={depth + 1} merchants={merchants}
                    onEdit={onEdit} onDelete={onDelete} onAddChild={onAddChild} isRTL={isRTL} t={t} />
            ))}
        </div>
    );
}

export default function CategoriesPage() {
    const router = useRouter();
    const { t, isRTL, theme, toggleTheme } = useLanguage();
    const [tree, setTree] = useState([]);
    const [loading, setLoading] = useState(true);

    const [name, setName] = useState('');
    const [parentId, setParentId] = useState('');
    const [limit, setLimit] = useState('');
    const [merchantKeywords, setMerchantKeywords] = useState([]);
    const [editKeywords, setEditKeywords] = useState([]);
    const [ruleMap, setRuleMap] = useState({});   // category_id -> [merchant keywords]
    const [error, setError] = useState('');

    const [editing, setEditing] = useState(null); // {id, name, parent_id, category_limit}

    useEffect(() => {
        if (!isAuthenticated()) {
            router.replace('/login');
            return;
        }
        loadTree();
    }, []);

    const loadTree = async () => {
        setLoading(true);
        try {
            const [nodes, rules] = await Promise.all([fetchCategories(), fetchRules()]);
            setTree(Array.isArray(nodes) ? nodes : []);
            const map = {};
            for (const r of (Array.isArray(rules) ? rules : [])) {
                if (!r.category_id) continue;
                const kws = (r.merchant_keywords || '').split(',').map(k => k.trim()).filter(Boolean);
                map[r.category_id] = [...(map[r.category_id] || []), ...kws];
            }
            setRuleMap(map);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setError('');
        try {
            const created = await addCategory({
                name: name.trim(),
                parent_id: parentId ? Number(parentId) : null,
                category_limit: limit ? parseFloat(limit) : null,
            });
            if (merchantKeywords.length > 0) {
                await addRule({
                    merchant_keywords: merchantKeywords.join(','),
                    category_id: created.id,
                });
            }
            setName('');
            setParentId('');
            setLimit('');
            setMerchantKeywords([]);
            loadTree();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!editing || !editing.name.trim()) return;
        setError('');
        try {
            await updateCategory(editing.id, {
                name: editing.name.trim(),
                parent_id: editing.parent_id,
                category_limit: editing.category_limit ? parseFloat(editing.category_limit) : null,
            });
            if (editKeywords.length > 0) {
                await addRule({
                    merchant_keywords: editKeywords.join(','),
                    category_id: editing.id,
                });
                setEditKeywords([]);
            }
            setEditing(null);
            loadTree();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (node) => {
        const kids = (node.children || []).length;
        const msg = isRTL
            ? kids ? `حذف "${node.name}"؟ سيتم نقل ${kids} فئة فرعية إلى الأب.` : `حذف "${node.name}"؟`
            : kids ? `Delete "${node.name}"? Its ${kids} sub-category(ies) move up to the parent.` : `Delete "${node.name}"?`;
        if (!confirm(msg)) return;
        try {
            await deleteCategory(node.id);
            loadTree();
        } catch (err) {
            console.error(err);
        }
    };

    const openAddChild = (node) => {
        setName('');
        setParentId(String(node.id));
        setLimit('');
        setMerchantKeywords([]);
        setError('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const openEdit = (node) => {
        setEditing({
            id: node.id,
            name: node.name,
            parent_id: node.parent_id,
            category_limit: node.category_limit ?? '',
        });
        setEditKeywords([]);
        setError('');
    };

    const BackIcon = isRTL ? ArrowRight : ArrowLeft;

    return (
        <div className="min-h-screen">
            <header className="sticky top-0 z-10 notebook-header">
                <div className="max-w-6xl mx-auto px-6 sm:px-8 flex items-center justify-between" style={{ height: '52px' }}>
                    <div className="flex items-center gap-3">
                        <Link href="/" className="btn-secondary p-1.5 rounded">
                            <BackIcon className="w-4 h-4" />
                        </Link>
                        <h1 className="font-heading text-sm" style={{ color: 'var(--text-primary)' }}>{t('categoriesTitle')}</h1>
                    </div>
                    <button onClick={toggleTheme} className="btn-secondary flex items-center justify-center w-8 h-8 p-0">
                        {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 sm:px-8 py-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Add form */}
                    <div className="md:col-span-1">
                        <div className="panel p-4 sticky top-6">
                            <h2 className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                                <Plus className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                                {t('addCategory')}
                            </h2>
                            <form onSubmit={handleCreate} className="space-y-3">
                                <div>
                                    <label className="block text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{t('categoryName')}</label>
                                    <input
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="input-field w-full p-2 text-sm"
                                        placeholder={isRTL ? 'مثال: قهوة' : 'e.g. Coffee'}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{t('parentCategory')}</label>
                                    <CategorySelect
                                        tree={tree}
                                        value={parentId ? Number(parentId) : null}
                                        onChange={v => setParentId(v ? String(v) : '')}
                                        placeholder={t('topLevel')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{t('limitLabel')}</label>
                                    <input
                                        type="number"
                                        value={limit}
                                        onChange={e => setLimit(e.target.value)}
                                        className="input-field w-full p-2 text-sm font-data"
                                        placeholder={t('limitPlaceholder')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                                        {isRTL ? 'كلمات التجار (اختياري)' : 'Merchant keywords (optional)'}
                                    </label>
                                    <KeywordsInput
                                        keywords={merchantKeywords}
                                        setKeywords={setMerchantKeywords}
                                        placeholder={isRTL ? 'اكتب اسم التاجر واضغط Enter...' : 'Type a merchant and press Enter...'}
                                        hint={isRTL ? 'الرسائل من هؤلاء التجار تُصنّف تلقائياً تحت هذه الفئة.' : 'SMS from these merchants are auto-filed under this category.'}
                                    />
                                </div>
                                {error && <p className="text-[10px]" style={{ color: 'var(--danger)' }}>{error}</p>}
                                <button type="submit" className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-1.5">
                                    <Save className="w-3.5 h-3.5" />
                                    {t('saveRule')}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Tree */}
                    <div className="md:col-span-2">
                        <div className="panel overflow-hidden">
                            {loading ? (
                                <div className="p-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>{t('loading')}</div>
                            ) : tree.length === 0 ? (
                                <div className="p-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>{t('noCategories')}</div>
                            ) : (
                                tree.map(root => (
                                    <TreeRow key={root.id} node={root} depth={0} merchants={ruleMap}
                                        onEdit={openEdit} onDelete={handleDelete} onAddChild={openAddChild}
                                        isRTL={isRTL} t={t} />
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Edit modal */}
                {editing && (
                    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
                        <div className="panel p-5 w-full max-w-md animate-fade-up" style={{ background: 'var(--surface-raised)' }}>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-heading text-sm" style={{ color: 'var(--text-primary)' }}>{t('edit')}</h2>
                                <button onClick={() => setEditing(null)} className="icon-btn">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <form onSubmit={handleUpdate} className="space-y-3">
                                <div>
                                    <label className="block text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{t('categoryName')}</label>
                                    <input
                                        value={editing.name}
                                        onChange={e => setEditing({ ...editing, name: e.target.value })}
                                        className="input-field w-full p-2 text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{t('parentCategory')}</label>
                                    <CategorySelect
                                        tree={tree}
                                        value={editing.parent_id}
                                        onChange={v => setEditing({ ...editing, parent_id: v })}
                                        excludeIds={subtreeIdSet(tree, editing.id)}
                                        placeholder={t('topLevel')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{t('limitLabel')}</label>
                                    <input
                                        type="number"
                                        value={editing.category_limit}
                                        onChange={e => setEditing({ ...editing, category_limit: e.target.value })}
                                        className="input-field w-full p-2 text-sm font-data"
                                        placeholder={t('limitPlaceholder')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                                        {isRTL ? 'أضف كلمات تجار (اختياري)' : 'Attach merchant keywords (optional)'}
                                    </label>
                                    <KeywordsInput
                                        keywords={editKeywords}
                                        setKeywords={setEditKeywords}
                                        placeholder={isRTL ? 'اكتب اسم التاجر واضغط Enter...' : 'Type a merchant and press Enter...'}
                                        hint={isRTL ? 'ينشئ قاعدة تصنيف جديدة لهذه الفئة.' : 'Creates a new rule filing into this category.'}
                                    />
                                </div>
                                {error && <p className="text-[10px]" style={{ color: 'var(--danger)' }}>{error}</p>}
                                <div className="flex gap-2 pt-1">
                                    <button type="button" onClick={() => setEditing(null)} className="btn-secondary flex-1 py-2 text-xs">
                                        {t('cancel')}
                                    </button>
                                    <button type="submit" className="btn-primary flex-1 py-2 text-xs flex items-center justify-center gap-1.5">
                                        <Save className="w-3.5 h-3.5" />
                                        {t('update')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
