import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { BookOpen, MessageSquare, TrendingUp, Plus, ArrowRight, Loader2 } from 'lucide-react'

interface Stats {
  articles: number
  conversations: number
  messagesToday: number
}

interface RecentConv {
  id: string
  created_at: string
  first_message: string
  message_count: number
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats>({ articles: 0, conversations: 0, messagesToday: 0 })
  const [recent, setRecent] = useState<RecentConv[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [articlesRes, convsRes, msgsRes] = await Promise.all([
          supabase.from('pgn_kb_articles').select('id', { count: 'exact', head: true }),
          supabase.from('pgn_conversations').select('id', { count: 'exact', head: true }),
          supabase.from('pgn_messages').select('id', { count: 'exact', head: true })
            .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
        ])

        setStats({
          articles: articlesRes.count || 0,
          conversations: convsRes.count || 0,
          messagesToday: msgsRes.count || 0
        })

        // Recent conversations
        const { data: convs } = await supabase
          .from('pgn_conversations')
          .select('id, created_at')
          .order('created_at', { ascending: false })
          .limit(10)

        if (convs?.length) {
          const enriched = await Promise.all(convs.map(async (c) => {
            const { data: msgs } = await supabase
              .from('pgn_messages')
              .select('content, role')
              .eq('conversation_id', c.id)
              .eq('role', 'user')
              .order('created_at', { ascending: true })
              .limit(1)

            const { count } = await supabase
              .from('pgn_messages')
              .select('id', { count: 'exact', head: true })
              .eq('conversation_id', c.id)

            return {
              ...c,
              first_message: msgs?.[0]?.content || '(empty)',
              message_count: count || 0
            }
          }))
          setRecent(enriched)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 size={28} className="animate-spin text-gray-400" /></div>
  }

  const statCards = [
    { label: 'KB Articles', value: stats.articles, icon: BookOpen, color: '#1a3a2a' },
    { label: 'Total Conversations', value: stats.conversations, icon: MessageSquare, color: '#c9a84c' },
    { label: 'Messages Today', value: stats.messagesToday, icon: TrendingUp, color: '#059669' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">AImee overview for Perth Golf Network</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-500">{label}</span>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
                <Icon size={20} style={{ color }} />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{value}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={() => navigate('/knowledge-base')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: '#1a3a2a' }}
        >
          <Plus size={16} />
          Add KB Article
        </button>
        <button
          onClick={() => navigate('/conversations')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
        >
          <MessageSquare size={16} />
          View All Conversations
        </button>
      </div>

      {/* Recent conversations */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Conversations</h2>
          <button onClick={() => navigate('/conversations')} className="text-sm text-pgn-green flex items-center gap-1 hover:underline" style={{ color: '#1a3a2a' }}>
            View all <ArrowRight size={14} />
          </button>
        </div>
        {recent.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">No conversations yet</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recent.map(conv => (
              <div key={conv.id} className="px-6 py-4 hover:bg-gray-50 cursor-pointer" onClick={() => navigate('/conversations')}>
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm text-gray-800 truncate flex-1">"{conv.first_message}"</p>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-gray-400">{conv.message_count} msgs</span>
                    <span className="text-xs text-gray-400">{new Date(conv.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
