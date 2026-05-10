import { useEffect, useState } from 'react'
import { supabase, FUNCTIONS_URL } from '../lib/supabase'
import { Mail, Copy, Check, Send, Loader2 } from 'lucide-react'
import { getToken } from '../lib/auth'

const SUPABASE_URL = 'https://kouembkldbpdbhzeaoth.supabase.co'
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/pgn-email-ingest`

export default function EmailIngestion() {
  const [articles, setArticles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [testSubject, setTestSubject] = useState('')
  const [testBody, setTestBody] = useState('')
  const [testFrom, setTestFrom] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok?: boolean; error?: string } | null>(null)

  useEffect(() => {
    loadEmailArticles()
  }, [])

  async function loadEmailArticles() {
    setLoading(true)
    const { data } = await supabase
      .from('pgn_kb_articles')
      .select('*')
      .eq('source', 'email')
      .order('created_at', { ascending: false })
      .limit(20)
    setArticles(data || [])
    setLoading(false)
  }

  function copyWebhook() {
    navigator.clipboard.writeText(WEBHOOK_URL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleTest() {
    if (!testSubject || !testBody) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(`${FUNCTIONS_URL}/pgn-email-ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ subject: testSubject, body: testBody, from: testFrom })
      })
      const data = await res.json()
      setTestResult(data.ok ? { ok: true } : { error: data.error })
      if (data.ok) {
        setTestSubject('')
        setTestBody('')
        setTestFrom('')
        loadEmailArticles()
      }
    } catch (e) {
      setTestResult({ error: String(e) })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Email Ingestion</h1>
        <p className="text-sm text-gray-500 mt-1">Forward emails to automatically grow AImee's knowledge base</p>
      </div>

      {/* Webhook URL card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1a3a2a20' }}>
            <Mail size={20} style={{ color: '#1a3a2a' }} />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900 mb-1">Email Webhook URL</h2>
            <p className="text-sm text-gray-500 mb-4">
              Forward newsletters or emails to this webhook to automatically add them to AImee's knowledge base.
              You can use email forwarding rules or tools like Zapier/Make.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 font-mono break-all">
                {WEBHOOK_URL}
              </code>
              <button
                onClick={copyWebhook}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white flex-shrink-0"
                style={{ backgroundColor: '#1a3a2a' }}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Test form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Test Ingestion</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
              <input
                type="text"
                value={testSubject}
                onChange={e => setTestSubject(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none"
                placeholder="Email subject..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">From (optional)</label>
              <input
                type="email"
                value={testFrom}
                onChange={e => setTestFrom(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none"
                placeholder="sender@example.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Body</label>
            <textarea
              value={testBody}
              onChange={e => setTestBody(e.target.value)}
              rows={6}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none resize-none"
              placeholder="Paste email body here..."
            />
          </div>

          {testResult && (
            <div className={`px-4 py-3 rounded-lg text-sm ${testResult.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {testResult.ok ? '✓ Article created and embedded successfully' : `Error: ${testResult.error}`}
            </div>
          )}

          <button
            onClick={handleTest}
            disabled={testing || !testSubject || !testBody}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: '#1a3a2a' }}
          >
            {testing ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            Test Ingestion
          </button>
        </div>
      </div>

      {/* Recent email articles */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Email Articles</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
        ) : articles.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">No email-sourced articles yet</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {articles.map(a => (
              <div key={a.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.title}</p>
                    {a.source_email && <p className="text-xs text-gray-400 mt-0.5">From: {a.source_email}</p>}
                  </div>
                  <span className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
