(function() {
  'use strict';

  var config = window.AImeeConfig || {};
  var SUPABASE_URL = config.supabaseUrl || 'https://kouembkldbpdbhzeaoth.supabase.co';
  var CHAT_URL = SUPABASE_URL + '/functions/v1/pgn-chat';
  var GREEN = config.widgetColor || '#1a3a2a';
  var GOLD = config.accentColor || '#c9a84c';
  var SESSION_KEY = 'aimee_session_id';

  function getSessionId() {
    var id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  var history = [];
  var isOpen = false;
  var isTyping = false;

  // --- Styles ---
  var style = document.createElement('style');
  style.textContent = `
    #aimee-widget-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${GREEN};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99998;
      transition: transform 0.2s, box-shadow 0.2s;
      flex-direction: column;
    }
    #aimee-widget-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 24px rgba(0,0,0,0.3);
    }
    #aimee-widget-btn svg { display: block; }
    #aimee-widget-btn .aimee-btn-label {
      font-size: 9px;
      color: ${GOLD};
      font-family: sans-serif;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-top: 2px;
      line-height: 1;
    }

    #aimee-widget-panel {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 380px;
      height: 520px;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.18);
      display: flex;
      flex-direction: column;
      z-index: 99997;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      transform: scale(0.95) translateY(10px);
      opacity: 0;
      pointer-events: none;
      transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
    }
    #aimee-widget-panel.open {
      transform: scale(1) translateY(0);
      opacity: 1;
      pointer-events: all;
    }

    #aimee-header {
      background: ${GREEN};
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    #aimee-header-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: ${GOLD};
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    #aimee-header-info { flex: 1; }
    #aimee-header-name {
      color: #fff;
      font-weight: 700;
      font-size: 15px;
      line-height: 1.2;
    }
    #aimee-header-sub {
      color: rgba(255,255,255,0.65);
      font-size: 11px;
      line-height: 1.2;
    }
    #aimee-close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: rgba(255,255,255,0.7);
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: background 0.15s;
    }
    #aimee-close-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }

    #aimee-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: #f8f9fa;
    }
    #aimee-messages::-webkit-scrollbar { width: 4px; }
    #aimee-messages::-webkit-scrollbar-track { background: transparent; }
    #aimee-messages::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }

    .aimee-msg {
      display: flex;
      gap: 8px;
      max-width: 88%;
      animation: aimee-fadein 0.2s ease;
    }
    @keyframes aimee-fadein { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
    .aimee-msg.user { align-self: flex-end; flex-direction: row-reverse; }
    .aimee-msg.assistant { align-self: flex-start; }
    .aimee-msg-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      margin-top: 2px;
    }
    .aimee-msg.assistant .aimee-msg-avatar { background: ${GREEN}; }
    .aimee-msg.user .aimee-msg-avatar { background: #e0e0e0; }
    .aimee-msg-bubble {
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.5;
    }
    .aimee-msg.user .aimee-msg-bubble {
      background: ${GREEN};
      color: #fff;
      border-bottom-right-radius: 4px;
    }
    .aimee-msg.assistant .aimee-msg-bubble {
      background: #fff;
      color: #1a1a1a;
      border: 1px solid #e8e8e8;
      border-bottom-left-radius: 4px;
    }

    .aimee-typing {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 12px 14px;
    }
    .aimee-typing span {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #aaa;
      display: inline-block;
      animation: aimee-bounce 1.2s infinite;
    }
    .aimee-typing span:nth-child(2) { animation-delay: 0.2s; }
    .aimee-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes aimee-bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-5px); }
    }

    #aimee-input-area {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      padding: 12px;
      background: #fff;
      border-top: 1px solid #f0f0f0;
      flex-shrink: 0;
    }
    #aimee-input {
      flex: 1;
      border: 1.5px solid #e0e0e0;
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 14px;
      font-family: inherit;
      resize: none;
      outline: none;
      max-height: 120px;
      overflow-y: auto;
      line-height: 1.4;
      transition: border-color 0.15s;
    }
    #aimee-input:focus { border-color: ${GREEN}; }
    #aimee-send-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: opacity 0.15s;
      background: ${GREEN};
    }
    #aimee-send-btn:disabled { opacity: 0.4; cursor: default; }
    #aimee-send-btn:not(:disabled):hover { opacity: 0.85; }

    @media (max-width: 440px) {
      #aimee-widget-panel {
        bottom: 0;
        right: 0;
        width: 100vw;
        height: 100vh;
        border-radius: 0;
      }
    }
  `;
  document.head.appendChild(style);

  // --- FAB Button ---
  var btn = document.createElement('button');
  btn.id = 'aimee-widget-btn';
  btn.setAttribute('aria-label', 'Chat with AImee');
  btn.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C6.48 2 2 6.48 2 12C2 13.85 2.5 15.58 3.38 17.07L2 22L6.93 20.62C8.42 21.5 10.15 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="${GOLD}"/>
      <path d="M8 11H8.01M12 11H12.01M16 11H16.01" stroke="${GREEN}" stroke-width="2.5" stroke-linecap="round"/>
    </svg>
    <span class="aimee-btn-label">AImee</span>
  `;
  document.body.appendChild(btn);

  // --- Panel ---
  var panel = document.createElement('div');
  panel.id = 'aimee-widget-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'AImee Chat');
  panel.innerHTML = `
    <div id="aimee-header">
      <div id="aimee-header-avatar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 13.85 2.5 15.58 3.38 17.07L2 22L6.93 20.62C8.42 21.5 10.15 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="${GREEN}"/>
          <path d="M8 11H8.01M12 11H12.01M16 11H16.01" stroke="${GOLD}" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </div>
      <div id="aimee-header-info">
        <div id="aimee-header-name">AImee</div>
        <div id="aimee-header-sub">Perth Golf Network AI Assistant</div>
      </div>
      <button id="aimee-close-btn" aria-label="Close chat">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div id="aimee-messages"></div>
    <div id="aimee-input-area">
      <textarea id="aimee-input" placeholder="Ask me anything about PGN..." rows="1"></textarea>
      <button id="aimee-send-btn" aria-label="Send" disabled>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>
    </div>
  `;
  document.body.appendChild(panel);

  var messagesEl = document.getElementById('aimee-messages');
  var inputEl = document.getElementById('aimee-input');
  var sendBtn = document.getElementById('aimee-send-btn');
  var closeBtn = document.getElementById('aimee-close-btn');

  function addMessage(role, text) {
    var msg = document.createElement('div');
    msg.className = 'aimee-msg ' + role;
    var avatarSvg = role === 'assistant'
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12C2 13.85 2.5 15.58 3.38 17.07L2 22L6.93 20.62C8.42 21.5 10.15 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="${GOLD}"/></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`;
    msg.innerHTML = `
      <div class="aimee-msg-avatar">${avatarSvg}</div>
      <div class="aimee-msg-bubble"></div>
    `;
    msg.querySelector('.aimee-msg-bubble').textContent = text;
    messagesEl.appendChild(msg);
    scrollBottom();
    return msg;
  }

  function showTyping() {
    var el = document.createElement('div');
    el.className = 'aimee-msg assistant';
    el.id = 'aimee-typing-indicator';
    el.innerHTML = `
      <div class="aimee-msg-avatar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12C2 13.85 2.5 15.58 3.38 17.07L2 22L6.93 20.62C8.42 21.5 10.15 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="${GOLD}"/></svg>
      </div>
      <div class="aimee-msg-bubble aimee-typing"><span></span><span></span><span></span></div>
    `;
    messagesEl.appendChild(el);
    scrollBottom();
  }

  function hideTyping() {
    var el = document.getElementById('aimee-typing-indicator');
    if (el) el.remove();
  }

  function scrollBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function openPanel() {
    isOpen = true;
    panel.classList.add('open');
    btn.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${GOLD}" stroke-width="2.5" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    `;
    inputEl.focus();

    // Greeting if first open
    if (messagesEl.children.length === 0) {
      setTimeout(function() {
        addMessage('assistant', "G'day! I'm AImee, Perth Golf Network's AI assistant. How can I help you today? 🏌️");
      }, 300);
    }
  }

  function closePanel() {
    isOpen = false;
    panel.classList.remove('open');
    btn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.48 2 2 6.48 2 12C2 13.85 2.5 15.58 3.38 17.07L2 22L6.93 20.62C8.42 21.5 10.15 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="${GOLD}"/>
        <path d="M8 11H8.01M12 11H12.01M16 11H16.01" stroke="${GREEN}" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
      <span class="aimee-btn-label">AImee</span>
    `;
  }

  async function sendMessage() {
    var text = inputEl.value.trim();
    if (!text || isTyping) return;

    inputEl.value = '';
    inputEl.style.height = 'auto';
    sendBtn.disabled = true;
    isTyping = true;

    addMessage('user', text);
    history.push({ role: 'user', content: text });

    showTyping();

    try {
      var res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: getSessionId(),
          history: history.slice(-8)
        })
      });
      var data = await res.json();
      hideTyping();
      var reply = data.message || "Sorry, I couldn't get a response. Please try again.";
      addMessage('assistant', reply);
      history.push({ role: 'assistant', content: reply });
    } catch (e) {
      hideTyping();
      addMessage('assistant', "Oops, something went wrong. Please check your connection and try again.");
    }

    isTyping = false;
    sendBtn.disabled = inputEl.value.trim() === '';
  }

  // Event listeners
  btn.addEventListener('click', function() {
    isOpen ? closePanel() : openPanel();
  });

  closeBtn.addEventListener('click', closePanel);

  inputEl.addEventListener('input', function() {
    sendBtn.disabled = inputEl.value.trim() === '' || isTyping;
    // Auto-resize
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
  });

  inputEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);

})();
