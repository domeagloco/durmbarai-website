(function () {
  'use strict';

  const KNOWLEDGE_LIST_API_URL =
    'https://domeagloco.app.n8n.cloud/webhook/durmbar-admin-knowledge-list';
  const KNOWLEDGE_SAVE_API_URL =
    'https://domeagloco.app.n8n.cloud/webhook/durmbar-admin-knowledge-save';

  let knowledgeRows = [];
  let knowledgeBusy = false;
  let activeAdminTab = 'messenger';

  const CATEGORY_ORDER = [
    'GENERAL','HOURS','LOCATION','CONTACT','BOOKING','MUSIC',
    'PROMOTION','BIRTHDAY','ALCOHOL','PARKING','POLICY','MENU','RECRUITMENT'
  ];

  const CATEGORY_LABELS = {
    GENERAL: 'ข้อมูลทั่วไป',
    HOURS: 'เวลาเปิด–ปิด',
    LOCATION: 'ที่ตั้ง',
    CONTACT: 'การติดต่อ',
    BOOKING: 'การจองโต๊ะ',
    MUSIC: 'ดนตรีสด',
    PROMOTION: 'โปรโมชั่น',
    BIRTHDAY: 'วันเกิด',
    ALCOHOL: 'การนำเครื่องดื่มเข้าร้าน',
    PARKING: 'ที่จอดรถ',
    POLICY: 'นโยบายร้าน',
    MENU: 'เมนู',
    RECRUITMENT: 'รับสมัครงาน'
  };

  const FIELD_META = {
    'restaurant.name': ['ชื่อร้าน', 'ชื่อที่บอทใช้ตอบลูกค้า'],
    'restaurant.province': ['จังหวัด', 'จังหวัดที่ตั้งร้าน'],
    'hours.open': ['เวลาเปิด', 'ตัวอย่าง 17:00'],
    'hours.service_close': ['เวลาปิดให้บริการ', 'ตัวอย่าง 00:00'],
    'hours.customer_stay_until': ['ลูกค้านั่งต่อได้ถึง', 'เวลาที่ลูกค้าที่อยู่ในร้านนั่งต่อได้'],
    'hours.kitchen_close': ['ครัวปิด', 'เวลารับออเดอร์อาหารสุดท้าย/ครัวปิด'],
    'location.description': ['คำอธิบายที่ตั้ง', 'ข้อความสั้น ๆ สำหรับบอกทางลูกค้า'],
    'location.map_url': ['ลิงก์แผนที่', 'ถ้ายังไม่มีให้เว้นว่าง ระบบจะเก็บเป็น UNKNOWN'],
    'contact.phone': ['เบอร์โทรร้าน', 'เบอร์ที่ให้ลูกค้าติดต่อ'],
    'booking.channels': ['ช่องทางจอง', 'เช่น จองผ่านเพจ หรือโทร'],
    'booking.deposit': ['มัดจำ', 'นโยบายมัดจำสำหรับการจอง'],
    'music.daily': ['ดนตรีสดโดยรวม', 'เช่น มีดนตรีสดทุกวัน'],
    'music.sun_thu': ['ดนตรี อา.–พฤ.', 'เวลาและรูปแบบดนตรีช่วงอาทิตย์–พฤหัสบดี'],
    'music.fri_sat': ['ดนตรี ศ.–ส.', 'เวลาและรูปแบบดนตรีช่วงศุกร์–เสาร์'],
    'music.schedule.monday': ['วงวันจันทร์', 'ตารางวงประจำวัน'],
    'music.schedule.tuesday': ['วงวันอังคาร', 'ตารางวงประจำวัน'],
    'music.schedule.wednesday': ['วงวันพุธ', 'ตารางวงประจำวัน'],
    'music.schedule.thursday': ['วงวันพฤหัสบดี', 'ตารางวงประจำวัน'],
    'music.schedule.friday': ['วงวันศุกร์', 'ตารางวงประจำวัน'],
    'music.schedule.saturday': ['วงวันเสาร์', 'ตารางวงประจำวัน'],
    'music.schedule.sunday': ['วงวันอาทิตย์', 'ตารางวงประจำวัน'],
    'music.schedule_disclaimer': ['หมายเหตุตารางวง', 'เช่น ตารางวงอาจเปลี่ยนแปลงได้'],
    'promotion.singha': ['โปรโมชั่นสิงห์', 'ข้อความโปรโมชั่นปัจจุบัน'],
    'promotion.liquor': ['โปรโมชั่นเหล้า', 'ข้อความโปรโมชั่นปัจจุบัน'],
    'birthday.discount': ['ส่วนลดวันเกิด', 'เช่น ส่วนลดค่าอาหาร 15%'],
    'birthday.window': ['ช่วงใช้สิทธิ์วันเกิด', 'เช่น ก่อน 7 วัน และหลัง 7 วัน'],
    'birthday.cake': ['นำเค้กเข้าร้าน', 'นโยบายการนำเค้กเข้า'],
    'birthday.evidence': ['หลักฐานวันเกิด', 'ถ้ายังไม่กำหนดให้เว้นว่าง'],
    'alcohol.bring_liquor': ['นำเหล้าเข้าร้าน', 'นโยบายและค่าเปิดเหล้า'],
    'alcohol.bring_wine': ['นำไวน์เข้าร้าน', 'นโยบายและค่าเปิดไวน์'],
    'parking': ['ที่จอดรถ', 'บอกตำแหน่งที่ลูกค้าจอดได้'],
    'age.under20_entry': ['ลูกค้าอายุต่ำกว่า 20 ปี', 'นโยบายการเข้าใช้บริการและแอลกอฮอล์'],
    'menu.url': ['ลิงก์เมนู', 'URL เมนูปัจจุบัน'],
    'recruitment.ad': ['ประกาศรับสมัคร', 'ข้อความประกาศรับสมัครปัจจุบัน'],
    'recruitment.work_hours': ['เวลาเข้างาน', 'เว้นว่างถ้ายังไม่ได้ระบุ'],
    'recruitment.wage': ['ค่าแรง/เงินเดือน', 'เว้นว่างถ้ายังไม่ได้ระบุ'],
    'recruitment.days_off': ['วันหยุด', 'เว้นว่างถ้ายังไม่ได้ระบุ'],
    'recruitment.benefits': ['สวัสดิการ', 'เว้นว่างถ้ายังไม่ได้ระบุ'],
    'recruitment.duties': ['หน้าที่งาน', 'เว้นว่างถ้ายังไม่ได้ระบุ']
  };

  function selectedPageReady() {
    return !!(
      currentUserAccessToken &&
      currentSelectedPage &&
      currentSelectedPage.id
    );
  }

  function injectStyles() {
    if (document.getElementById('durmbarKnowledgeAdminStyle')) return;
    const style = document.createElement('style');
    style.id = 'durmbarKnowledgeAdminStyle';
    style.textContent = `
      .admin-tabs{display:none;gap:8px;margin-top:28px;padding-top:24px;border-top:1px solid #e2e8f0}
      .admin-tabs.visible{display:flex}
      .admin-tab{background:#e2e8f0;color:#0f172a;font-weight:700}
      .admin-tab.active{background:#0f172a;color:#fff}
      .knowledge-section{display:none;margin-top:22px}
      .knowledge-section.visible{display:block}
      .knowledge-toolbar{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}
      .knowledge-toolbar h2{margin:0}
      .knowledge-toolbar-copy{min-width:0}
      .knowledge-toolbar-hint{margin-top:5px;color:#64748b;font-size:13px;line-height:1.5}
      .knowledge-refresh{background:#e2e8f0;color:#0f172a;padding:10px 14px;font-size:14px}
      .knowledge-groups{display:grid;gap:18px}
      .knowledge-group{border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;background:#fff}
      .knowledge-group-title{padding:13px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:800}
      .knowledge-row{padding:16px;border-bottom:1px solid #e2e8f0}
      .knowledge-row:last-child{border-bottom:0}
      .knowledge-row-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px}
      .knowledge-label{font-weight:700;color:#0f172a}
      .knowledge-note{margin-top:3px;color:#64748b;font-size:12px;line-height:1.45}
      .knowledge-active{display:flex;align-items:center;gap:6px;font-size:13px;color:#475569;white-space:nowrap}
      .knowledge-input{width:100%;min-height:44px;padding:10px 12px;border:1px solid #cbd5e1;border-radius:9px;font:inherit;line-height:1.45;resize:vertical;outline:none}
      .knowledge-input:focus{border-color:#0f172a;box-shadow:0 0 0 3px rgba(15,23,42,.08)}
      .knowledge-row-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:9px}
      .knowledge-meta{font-size:11px;color:#94a3b8}
      .knowledge-save{background:#16a34a;color:#fff;padding:9px 14px;font-size:14px}
      .knowledge-save:disabled{background:#94a3b8}
      @media(max-width:600px){
        .knowledge-toolbar{flex-direction:column}
        .knowledge-row-head{flex-direction:column}
        .knowledge-row-actions{align-items:flex-start;flex-direction:column}
      }
    `;
    document.head.appendChild(style);
  }

  function injectUi() {
    if (document.getElementById('knowledgeAdminTabs')) return;

    const card = document.querySelector('.card');
    if (!card || !inboxSection) return;

    const tabs = document.createElement('div');
    tabs.id = 'knowledgeAdminTabs';
    tabs.className = 'admin-tabs';

    const messengerTab = document.createElement('button');
    messengerTab.id = 'messengerAdminTab';
    messengerTab.type = 'button';
    messengerTab.className = 'admin-tab active';
    messengerTab.textContent = 'Messenger';

    const knowledgeTab = document.createElement('button');
    knowledgeTab.id = 'knowledgeAdminTab';
    knowledgeTab.type = 'button';
    knowledgeTab.className = 'admin-tab';
    knowledgeTab.textContent = 'ข้อมูลร้าน';

    tabs.appendChild(messengerTab);
    tabs.appendChild(knowledgeTab);
    inboxSection.insertAdjacentElement('beforebegin', tabs);

    const section = document.createElement('div');
    section.id = 'knowledgeAdminSection';
    section.className = 'knowledge-section';

    const toolbar = document.createElement('div');
    toolbar.className = 'knowledge-toolbar';

    const copy = document.createElement('div');
    copy.className = 'knowledge-toolbar-copy';

    const heading = document.createElement('h2');
    heading.textContent = 'ข้อมูลร้านที่บอทใช้ตอบ';

    const hint = document.createElement('div');
    hint.className = 'knowledge-toolbar-hint';
    hint.textContent =
      'บันทึกแล้วบอทจะอ่านค่าจาก Data Table ในข้อความถัดไปทันที โดยไม่ต้องแก้ Prompt';

    copy.appendChild(heading);
    copy.appendChild(hint);

    const refresh = document.createElement('button');
    refresh.id = 'knowledgeRefreshButton';
    refresh.type = 'button';
    refresh.className = 'knowledge-refresh';
    refresh.textContent = 'โหลดข้อมูลใหม่';

    toolbar.appendChild(copy);
    toolbar.appendChild(refresh);

    const status = document.createElement('div');
    status.id = 'knowledgeStatus';
    status.className = 'status';
    status.textContent = 'เลือกและเชื่อมต่อเพจก่อนจัดการข้อมูลร้าน';

    const groups = document.createElement('div');
    groups.id = 'knowledgeGroups';
    groups.className = 'knowledge-groups';
    groups.innerHTML = '<div class="empty">ยังไม่ได้โหลดข้อมูลร้าน</div>';

    section.appendChild(toolbar);
    section.appendChild(status);
    section.appendChild(groups);
    tabs.insertAdjacentElement('afterend', section);

    messengerTab.addEventListener('click', function () {
      switchAdminTab('messenger');
    });
    knowledgeTab.addEventListener('click', function () {
      switchAdminTab('knowledge');
      if (selectedPageReady() && !knowledgeRows.length && !knowledgeBusy) {
        loadKnowledge();
      }
    });
    refresh.addEventListener('click', loadKnowledge);
  }

  function switchAdminTab(tab) {
    activeAdminTab = tab === 'knowledge' ? 'knowledge' : 'messenger';

    const messengerTab = document.getElementById('messengerAdminTab');
    const knowledgeTab = document.getElementById('knowledgeAdminTab');
    const section = document.getElementById('knowledgeAdminSection');

    if (!messengerTab || !knowledgeTab || !section) return;

    messengerTab.classList.toggle('active', activeAdminTab === 'messenger');
    knowledgeTab.classList.toggle('active', activeAdminTab === 'knowledge');

    inboxSection.classList.toggle('visible', activeAdminTab === 'messenger');
    section.classList.toggle('visible', activeAdminTab === 'knowledge');
  }

  function setKnowledgeStatus(message, type) {
    const box = document.getElementById('knowledgeStatus');
    if (!box) return;
    box.textContent = message;
    box.className = 'status';
    if (type) box.classList.add(type);
  }

  async function callApi(url, payload) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (_) {
      throw new Error('Knowledge Admin API ไม่ได้ตอบกลับมาเป็น JSON');
    }
    if (!response.ok || !result.success) {
      throw new Error(result.message || result.error || 'Knowledge Admin API ตอบกลับด้วยข้อผิดพลาด');
    }
    return result;
  }

  async function loadKnowledge() {
    if (!selectedPageReady()) {
      setKnowledgeStatus('กรุณาเชื่อมต่อ Facebook และเลือกเพจก่อน', 'error');
      return;
    }
    if (knowledgeBusy) return;

    knowledgeBusy = true;
    const refresh = document.getElementById('knowledgeRefreshButton');
    if (refresh) {
      refresh.disabled = true;
      refresh.textContent = 'กำลังโหลด...';
    }
    setKnowledgeStatus('กำลังโหลดข้อมูลร้าน...', 'loading');

    try {
      const result = await callApi(KNOWLEDGE_LIST_API_URL, {
        page_id: currentSelectedPage.id,
        access_token: currentUserAccessToken
      });
      knowledgeRows = Array.isArray(result.rows) ? result.rows : [];
      renderKnowledge();
      setKnowledgeStatus(
        'โหลดข้อมูลร้านสำเร็จ ' + knowledgeRows.length + ' รายการ',
        'success'
      );
    } catch (error) {
      console.error('Load knowledge error:', error);
      knowledgeRows = [];
      const groups = document.getElementById('knowledgeGroups');
      if (groups) groups.innerHTML = '<div class="empty">โหลดข้อมูลร้านไม่สำเร็จ</div>';
      setKnowledgeStatus('โหลดข้อมูลร้านไม่สำเร็จ: ' + error.message, 'error');
    } finally {
      knowledgeBusy = false;
      if (refresh) {
        refresh.disabled = false;
        refresh.textContent = 'โหลดข้อมูลใหม่';
      }
    }
  }

  function rowLabel(row) {
    const meta = FIELD_META[row.knowledge_key];
    return meta ? meta[0] : row.knowledge_key;
  }

  function rowHint(row) {
    const meta = FIELD_META[row.knowledge_key];
    return meta ? meta[1] : (row.notes || '');
  }

  function renderKnowledge() {
    const groupsBox = document.getElementById('knowledgeGroups');
    if (!groupsBox) return;
    groupsBox.innerHTML = '';

    if (!knowledgeRows.length) {
      groupsBox.innerHTML = '<div class="empty">ยังไม่มีข้อมูลร้าน</div>';
      return;
    }

    const grouped = {};
    knowledgeRows.forEach(function (row) {
      const category = String(row.category || 'OTHER').toUpperCase();
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(row);
    });

    const categories = Object.keys(grouped).sort(function (a, b) {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    categories.forEach(function (category) {
      const group = document.createElement('section');
      group.className = 'knowledge-group';

      const title = document.createElement('div');
      title.className = 'knowledge-group-title';
      title.textContent = CATEGORY_LABELS[category] || category;
      group.appendChild(title);

      grouped[category]
        .sort(function (a, b) {
          return Number(a.sort_order || 0) - Number(b.sort_order || 0);
        })
        .forEach(function (row) {
          group.appendChild(buildKnowledgeRow(row));
        });

      groupsBox.appendChild(group);
    });
  }

  function buildKnowledgeRow(row) {
    const wrapper = document.createElement('div');
    wrapper.className = 'knowledge-row';
    wrapper.dataset.knowledgeKey = row.knowledge_key;

    const head = document.createElement('div');
    head.className = 'knowledge-row-head';

    const copy = document.createElement('div');
    const label = document.createElement('div');
    label.className = 'knowledge-label';
    label.textContent = rowLabel(row);

    const note = document.createElement('div');
    note.className = 'knowledge-note';
    note.textContent = rowHint(row);

    copy.appendChild(label);
    copy.appendChild(note);

    const activeLabel = document.createElement('label');
    activeLabel.className = 'knowledge-active';

    const active = document.createElement('input');
    active.type = 'checkbox';
    active.checked = row.active !== false;
    active.dataset.role = 'active';

    activeLabel.appendChild(active);
    activeLabel.appendChild(document.createTextNode(' ให้บอทใช้ข้อมูลนี้'));

    head.appendChild(copy);
    head.appendChild(activeLabel);

    const input = document.createElement('textarea');
    input.className = 'knowledge-input';
    input.rows = row.knowledge_key === 'recruitment.ad' ? 4 : 2;
    input.dataset.role = 'value';
    input.placeholder = 'ยังไม่ได้ระบุ';
    input.value = String(row.value || '') === 'UNKNOWN' ? '' : String(row.value || '');

    const actions = document.createElement('div');
    actions.className = 'knowledge-row-actions';

    const meta = document.createElement('div');
    meta.className = 'knowledge-meta';
    meta.dataset.role = 'meta';
    meta.textContent = row.updated_at ? 'อัปเดตล่าสุด: ' + row.updated_at : '';

    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'knowledge-save';
    save.textContent = 'บันทึก';
    save.addEventListener('click', function () {
      saveKnowledgeRow(row.knowledge_key, wrapper, save);
    });

    actions.appendChild(meta);
    actions.appendChild(save);

    wrapper.appendChild(head);
    wrapper.appendChild(input);
    wrapper.appendChild(actions);
    return wrapper;
  }

  async function saveKnowledgeRow(knowledgeKey, wrapper, button) {
    if (!selectedPageReady()) {
      setKnowledgeStatus('กรุณาเชื่อมต่อ Facebook และเลือกเพจก่อน', 'error');
      return;
    }

    const input = wrapper.querySelector('[data-role="value"]');
    const active = wrapper.querySelector('[data-role="active"]');
    const meta = wrapper.querySelector('[data-role="meta"]');

    const value = input && input.value.trim() ? input.value.trim() : 'UNKNOWN';
    const activeValue = !!(active && active.checked);

    button.disabled = true;
    button.textContent = 'กำลังบันทึก...';
    setKnowledgeStatus('กำลังบันทึก “' + rowLabel({knowledge_key:knowledgeKey}) + '”...', 'loading');

    try {
      const result = await callApi(KNOWLEDGE_SAVE_API_URL, {
        page_id: currentSelectedPage.id,
        access_token: currentUserAccessToken,
        knowledge_key: knowledgeKey,
        value: value,
        active: activeValue
      });

      const saved = result.row || {};
      const index = knowledgeRows.findIndex(function (row) {
        return row.knowledge_key === knowledgeKey;
      });
      if (index >= 0) {
        knowledgeRows[index] = Object.assign({}, knowledgeRows[index], saved);
      }

      if (meta) {
        meta.textContent = saved.updated_at
          ? 'อัปเดตล่าสุด: ' + saved.updated_at
          : 'บันทึกแล้ว';
      }

      setKnowledgeStatus(
        'บันทึก “' + rowLabel({knowledge_key:knowledgeKey}) +
        '” สำเร็จ — บอทจะใช้ค่าล่าสุดในข้อความถัดไป',
        'success'
      );
      button.textContent = 'บันทึกแล้ว';
      window.setTimeout(function () {
        button.textContent = 'บันทึก';
      }, 1200);
    } catch (error) {
      console.error('Save knowledge error:', error);
      setKnowledgeStatus('บันทึกไม่สำเร็จ: ' + error.message, 'error');
      button.textContent = 'ลองใหม่';
    } finally {
      button.disabled = false;
    }
  }

  function installHooks() {
    injectStyles();
    injectUi();

    const originalSelectPage = selectPage;
    selectPage = async function (page, selectedCard) {
      const result = await originalSelectPage.apply(this, arguments);

      if (currentSelectedPage && currentSelectedPage.id) {
        const tabs = document.getElementById('knowledgeAdminTabs');
        if (tabs) tabs.classList.add('visible');

        knowledgeRows = [];
        switchAdminTab('messenger');
        setKnowledgeStatus(
          'พร้อมจัดการข้อมูลร้านของเพจ “' +
          String(currentSelectedPage.name || '') + '”',
          ''
        );
        loadKnowledge();
      }
      return result;
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installHooks, {once:true});
  } else {
    installHooks();
  }
})();
