import { useEffect, useState } from 'react'
import { supabase, FUNCTIONS_URL } from '../lib/supabase'
import { Plus, Edit2, Trash2, Search, X, Loader2, Check, RefreshCw } from 'lucide-react'
import { getToken } from '../lib/auth'

interface Article {
  id: string
  title: string
  content: string
  source: string
  is_active: boolean
  created_at: string
}

type Filter = 'all' | 'manual' | 'email' | 'active'

function Modal({ article, onClose, onSave }: {
  article: Partial<Article> | null
  onClose: () => void
  onSave: (title: string, content: string) => Promise<void>
}) {
  const [title, setTitle] = useState(article?.title || '')
  const [content, setContent] = useState(article?.content || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    await onSave(title, content)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-900">{article?.id ? 'Edit Article' : 'Add Article'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2"
              placeholder="Article title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Content</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={10}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 resize-none"
              placeholder="Article content..."
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim() || !content.trim()}
            className="px-4 py-2 text-sm text-white rounded-lg flex items-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: '#1a3a2a' }}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save & Embed
          </button>
        </div>
      </div>
    </div>
  )
}

export default function KnowledgeBase() {
  const [articles, setArticles] = useState<Article[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalArticle, setModalArticle] = useState<Partial<Article> | null>(null)
  const [embeddingId, setEmbeddingId] = useState<string | null>(null)

  useEffect(() => { loadArticles() }, [])

  async function loadArticles() {
    setLoading(true)
    const { data } = await supabase
      .from('pgn_kb_articles')
      .select('*')
      .order('created_at', { ascending: false })
    setArticles(data || [])
    setLoading(false)
  }

  async function handleSave(title: string, content: string) {
    let id: string

    if (modalArticle?.id) {
      // Update
      await supabase.from('pgn_kb_articles').update({ title, content, updated_at: new Date().toISOString() }).eq('id', modalArticle.id)
      id = modalArticle.id
    } else {
      // Insert
      const { data } = await supabase.from('pgn_kb_articles').insert([{ title, content, source: 'manual' }]).select().single()
      id = data?.id
    }

    setModalArticle(null)

    // Trigger chunking
    if (id) {
      setEmbeddingId(id)
      try {
        await fetch(`${FUNCTIONS_URL}/pgn-chunk-kb`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
          body: JSON.stringify({ article_id: id })
        })
      } catch (e) { console.error(e) }
      setEmbeddingId(null)
    }

    loadArticles()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this article? This cannot be undone.')) return
    await supabase.from('pgn_kb_articles').delete().eq('id', id)
    loadArticles()
  }

  async function toggleActive(article: Article) {
    await supabase.from('pgn_kb_articles').update({ is_active: !article.is_active }).eq('id', article.id)
    loadArticles()
  }

  const filtered = articles.filter(a => {
    if (filter === 'manual' && a.source !== 'manual') return false
    if (filter === 'email' && a.source !== 'email') return false
    if (filter === 'active' && !a.is_active) return false
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-sm text-gray-500 mt-1">{articles.length} articles</p>
        </div>
        <button
          onClick={() => setModalArticle({})}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: '#1a3a2a' }}
        >
          <Plus size={16} />
          Add Article
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'manual', 'email', 'active'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors ${filter === f ? 'text-white' : 'text-gray-600 bg-white border border-gray-300 hover:bg-gray-50'}`}
              style={filter === f ? { backgroundColor: '#1a3a2a' } : {}}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">No articles found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Source</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Active</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Date</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(article => (
                <tr key={article.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{article.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate max-w-md">{article.content.slice(0, 80)}…</div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      article.source === 'email' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {article.source}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => toggleActive(article)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${article.is_active ? '' : 'bg-gray-200'}`}
                      style={article.is_active ? { backgroundColor: '#1a3a2a' } : {}}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${article.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-4 text-xs text-gray-400">
                    {new Date(article.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      {embeddingId === article.id && <Loader2 size={14} className="animate-spin text-amber-500" />}
                      <button onClick={() => setModalArticle(article)} className="text-gray-400 hover:text-gray-700 p-1">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => handleDelete(article.id)} className="text-gray-400 hover:text-red-500 p-1">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalArticle !== null && (
        <Modal article={modalArticle} onClose={() => setModalArticle(null)} onSave={handleSave} />
      )}
    </div>
  )
}
