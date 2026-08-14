(function () {
  'use strict';

  const TAKEOVER_STATE_API_URL =
    'https://domeagloco.app.n8n.cloud/webhook/durmbar-admin-takeover-state';
  const TAKEOVER_SET_API_URL =
    'https://domeagloco.app.n8n.cloud/webhook/durmbar-admin-takeover-set';

  let takeoverMode = 'UNKNOWN';
  let takeoverBusy = false;

  function activeConversation() {
    if (!currentSelectedPage || !currentSelectedPage.id) return null;
    const conversation = currentConversations.find(function (item) {
      return String(item.conversation_id) === String(currentConversationId);
    });
    if (!conversation || !conversation.customer || !conversation.customer.id) return null;
    return {
      pageId: String(currentSelectedPage.id),
      psid: String(conversation.customer.id),
      conversationId: String(conversation.conversation_id || '')
    };
  }

  function injectTakeoverUi() {
    if (document.getElementById('takeoverBar')) return;
    const style = document.createElement('style');
    style.textContent = `
      .takeover-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid #e2e8f0;background:#f8fafc}
      .takeover-copy{min-width:0}.takeover-status{font-weight:700}.takeover-hint{margin-top:3px;font-size:12px;color:#64748b}
      .takeover-action{padding:9px 12px;font-size:14px;white-space:nowrap;background:#0f172a;color:#fff}
      .takeover-bar.human{background:#fff7ed}.takeover-bar.human .takeover-status{color:#9a3412}.takeover-bar.bot .takeover-status{color:#166534}
    `;
    document.head.appendChild(style);

    const bar = document.createElement('div');
    bar.id = 'takeoverBar';
    bar.className = 'takeover-bar bot';
    bar.innerHTML = '<div class="takeover-copy"><div id="takeoverStatus" class="takeover-status">🤖 บอทกำลังทำงาน</div><div id="takeoverHint" class="takeover-hint">AI จะตอบลูกค้าตามปกติ</div></div><button id="takeoverActionButton" class="takeover-action" type="button" disabled>รับช่วง</button>';
    chatHeader.insertAdjacentElement('afterend', bar);
    document.getElementById('takeoverActionButton').addEventListener('click', toggleTakeoverMode);
  }

  function renderTakeover(mode, busy) {
    takeoverMode = mode === 'HUMAN' ? 'HUMAN' : (mode === 'BOT' ? 'BOT' : 'UNKNOWN');
    takeoverBusy = !!busy;
    const bar = document.getElementById('takeoverBar');
    const status = document.getElementById('takeoverStatus');
    const hint = document.getElementById('takeoverHint');
    const button = document.getElementById('takeoverActionButton');
    if (!bar || !status || !hint || !button) return;
    bar.classList.toggle('human', takeoverMode === 'HUMAN');
    bar.classList.toggle('bot', takeoverMode === 'BOT');
    if (takeoverMode === 'HUMAN') {
      status.textContent = '👤 พนักงานกำลังดูแล';
      hint.textContent = 'AI จะไม่ตอบระหว่าง Human Mode';
      button.textContent = busy ? 'กำลังเปลี่ยน...' : 'คืนให้บอท';
    } else if (takeoverMode === 'BOT') {
      status.textContent = '🤖 บอทกำลังทำงาน';
      hint.textContent = 'AI จะตอบลูกค้าตามปกติ';
      button.textContent = busy ? 'กำลังเปลี่ยน...' : 'รับช่วง';
    } else {
      status.textContent = '⚠️ ตรวจสถานะไม่ได้';
      hint.textContent = 'ระบบจะไม่ให้สั่งเปลี่ยนโหมดจนกว่าจะโหลดสถานะสำเร็จ';
      button.textContent = 'โหลดสถานะใหม่';
    }
    button.disabled = busy || !activeConversation() || takeoverMode === 'UNKNOWN';
  }

  async function callTakeover(url, payload) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    let result;
    try { result = JSON.parse(text); } catch (_) { throw new Error('Takeover API ไม่ได้ตอบกลับมาเป็น JSON'); }
    if (!response.ok || !result.success) throw new Error(result.message || result.error || 'Takeover API ตอบกลับด้วยข้อผิดพลาด');
    return result;
  }

  async function loadTakeoverState() {
    const ctx = activeConversation();
    if (!ctx || !currentUserAccessToken) { renderTakeover('UNKNOWN', false); return; }
    renderTakeover(takeoverMode, true);
    try {
      const result = await callTakeover(TAKEOVER_STATE_API_URL, {
        page_id: ctx.pageId,
        recipient_id: ctx.psid,
        conversation_id: ctx.conversationId,
        access_token: currentUserAccessToken
      });
      renderTakeover(result.mode, false);
    } catch (error) {
      console.error('Load takeover state error:', error);
      renderTakeover('UNKNOWN', false);
      inboxStatus.textContent = 'โหลดสถานะ Human Takeover ไม่สำเร็จ: ' + error.message;
      inboxStatus.className = 'status error';
    }
  }

  async function setTakeoverMode(mode, updatedBy) {
    const ctx = activeConversation();
    if (!ctx) throw new Error('กรุณาเลือกบทสนทนาก่อน');
    if (!currentUserAccessToken) throw new Error('ไม่พบข้อมูล Facebook Login');
    renderTakeover(takeoverMode, true);
    try {
      const result = await callTakeover(TAKEOVER_SET_API_URL, {
        page_id: ctx.pageId,
        recipient_id: ctx.psid,
        conversation_id: ctx.conversationId,
        mode: mode,
        updated_by: updatedBy || 'durmbar_admin',
        access_token: currentUserAccessToken
      });
      renderTakeover(result.mode, false);
      return result;
    } catch (error) {
      renderTakeover(takeoverMode, false);
      throw error;
    }
  }

  async function toggleTakeoverMode() {
    if (takeoverBusy) return;
    if (takeoverMode === 'UNKNOWN') return;
    const target = takeoverMode === 'HUMAN' ? 'BOT' : 'HUMAN';
    try {
      await setTakeoverMode(target, target === 'HUMAN' ? 'admin_takeover_button' : 'admin_return_to_bot_button');
      inboxStatus.textContent = target === 'HUMAN' ? 'รับช่วงบทสนทนาแล้ว — AI จะไม่ตอบลูกค้ารายนี้' : 'คืนบทสนทนาให้บอทแล้ว';
      inboxStatus.className = 'status success';
    } catch (error) {
      inboxStatus.textContent = 'เปลี่ยนสถานะไม่สำเร็จ: ' + error.message;
      inboxStatus.className = 'status error';
    }
  }

  function installHooks() {
    injectTakeoverUi();

    const originalOpenConversation = openConversation;
    openConversation = function (conversationId) {
      const result = originalOpenConversation.apply(this, arguments);
      loadTakeoverState();
      return result;
    };

    const originalSendMessage = sendMessage;
    sendMessage = async function () {
      const ctx = activeConversation();
      const text = messageInput && messageInput.value ? messageInput.value.trim() : '';
      if (!ctx || !text) return originalSendMessage.apply(this, arguments);
      try {
        // Critical ordering: HUMAN is persisted before the existing Meta send path runs.
        await setTakeoverMode('HUMAN', 'admin_send');
      } catch (error) {
        inboxStatus.textContent = 'ส่งข้อความถูกหยุด เพราะตั้ง Human Mode ไม่สำเร็จ: ' + error.message;
        inboxStatus.className = 'status error';
        return;
      }
      return originalSendMessage.apply(this, arguments);
    };

    renderTakeover('UNKNOWN', false);
    if (currentConversationId) loadTakeoverState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installHooks, {once:true});
  } else {
    installHooks();
  }
})();
