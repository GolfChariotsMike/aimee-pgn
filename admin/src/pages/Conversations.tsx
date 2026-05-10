import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { MessageSquare, ChevronDown, ChevronRight, Loader2, User, Bot } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface Conversation {
  id: string
  session_id: string
  created_at: string
  messages?: Message[]
  message_count?: number
  first_message?: string
}

export default function Conversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState<string | null>(null)

  useEffect(() => { loadConversations() }, [])

  async function loadConversations() {
    setLoading(true)
    const { data: convs } = await supabase
      .from('pgn_conversations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (!convs) { setLoading(false); return }

    const enriched = await Promise.all(convs.map(async (c) => {
      const { data: msgs } = await supabase
        .from('pgn_messages')
        .select('content')
        .eq('conversation_id', c.id)
        .eq('role', 'user')
        .order('created_at', { ascending: true })
        .limit(1)

      const { count } = await supabase
        .from('pgn_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', c.id)

      return { ...c, first_message: msgs?.[0]?.content || '', message_count: count || 0 }
    }))

    setConversations(enriched)
    setLoading(false)
  }

  async function toggleExpand(convId: string) {
    if (expanded === convId) {
      setExpanded(null)
      return
    }
    setExpanded(convId)

    // Load messages if not already loaded
    const conv = conversations.find(c => c.id === convId)
    if (!conv?.messages) {
      setLoadingMessages(convId)
      const { data: msgs } = await supabase
        .from('pgn_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })

      setConversations(prev => prev.map(c => c.id === convId ? { ...c, messages: msgs || [] } : c))
      setLoadingMessages(null)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
        <p className="text-sm text-gray-500 mt-1">{conversations.length} conversations</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
      ) : conversations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400 text-sm">
          No conversations yet — embed the widget to start chatting
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(conv => (
            <div key={conv.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 text-left"
                onClick={() => toggleExpand(conv.id)}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1a3a2a20' }}>
                  <MessageSquare size={16} style={{ color: '#1a3a2a' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {conv.first_message || '(no messages)'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {conv.message_count} messages · {new Date(conv.created_at).toLocaleString()}
                  </p>
                </div>
                {expanded === conv.id ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
              </button>

              {expanded === conv.id && (
                <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
                  {loadingMessages === conv.id ? (
                    <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {conv.messages?.map(msg => (
                        <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {msg.role === 'assistant' && (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: '#1a3a2a' }}>
                              <Bot size={14} color="#c9a84c" />
                            </div>
                          )}
                          <div className={`max-w-sm px-4 py-2.5 rounded-xl text-sm ${
                            msg.role === 'user'
                              ? 'text-white rounded-br-sm'
                              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                          }`} style={msg.role === 'user' ? { backgroundColor: '#1a3a2a' } : {}}>
                            {msg.content}
                          </div>
                          {msg.role === 'user' && (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-gray-200">
                              <User size={14} className="text-gray-500" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
