import { useState } from 'react'
import { Copy, Check, Eye, EyeOff } from 'lucide-react'

const SUPABASE_URL = 'https://kouembkldbpdbhzeaoth.supabase.co'

const EMBED_CODE = `<script>
  window.AImeeConfig = {
    supabaseUrl: '${SUPABASE_URL}',
    widgetColor: '#1a3a2a',
    accentColor: '#c9a84c'
  };
<\/script>
<script src="https://aimee-pgn.vercel.app/aimee-widget.js"><\/script>`

export default function Settings() {
  const [copiedEmbed, setCopiedEmbed] = useState(false)
  const [showOld, setShowOld] = useState(false)
  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [passMsg, setPassMsg] = useState('')

  function copyEmbed() {
    navigator.clipboard.writeText(EMBED_CODE)
    setCopiedEmbed(true)
    setTimeout(() => setCopiedEmbed(false), 2000)
  }

  async function handleChangePassword() {
    if (newPass !== confirmPass) {
      setPassMsg('Passwords do not match')
      return
    }
    if (newPass.length < 8) {
      setPassMsg('Password must be at least 8 characters')
      return
    }
    // TODO: call pgn-admin-auth with action=change_password
    setPassMsg('Password change coming soon — update via Supabase dashboard for now')
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">AImee configuration</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Assistant info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Assistant</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 w-32">Name</span>
              <span className="text-sm font-medium text-gray-900">AImee</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 w-32">Client</span>
              <span className="text-sm font-medium text-gray-900">Perth Golf Network</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 w-32">Model</span>
              <span className="text-sm font-medium text-gray-900">OpenAI gpt-4o-mini</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 w-32">Embeddings</span>
              <span className="text-sm font-medium text-gray-900">text-embedding-3-small</span>
            </div>
          </div>
        </div>

        {/* Embed code */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Widget Embed Code</h2>
            <button
              onClick={copyEmbed}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: '#1a3a2a' }}
            >
              {copiedEmbed ? <Check size={14} /> : <Copy size={14} />}
              {copiedEmbed ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Paste this code into any HTML page (before closing &lt;/body&gt; tag) to embed AImee.
          </p>
          <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
            {EMBED_CODE}
          </pre>
        </div>

        {/* Password change */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Change Password</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
              <div className="relative">
                <input
                  type={showOld ? 'text' : 'password'}
                  value={oldPass}
                  onChange={e => setOldPass(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none"
                />
                <button onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
              <input
                type="password"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none"
              />
            </div>
            {passMsg && (
              <p className="text-sm text-amber-600">{passMsg}</p>
            )}
            <button
              onClick={handleChangePassword}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: '#1a3a2a' }}
            >
              Update Password
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
