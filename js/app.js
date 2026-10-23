/**
 * APP.JS - Main Controller & Interactivity Driver
 * Menghubungkan PixelOfficeEngine dengan UI controls, camera navigation,
 * dan slide-over comm drawer. (Standalone script, 100% kompatibel file:///)
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize 16-Bit Pixel Art Office Engine from window
  if (!window.PixelOfficeEngine) {
    console.error("PixelOfficeEngine is not loaded yet.");
    return;
  }
  const engine = new window.PixelOfficeEngine('officeCanvas');

  // 2. Camera Navigation Controls
  const btnZoomIn = document.getElementById('btnZoomIn');
  const btnZoomOut = document.getElementById('btnZoomOut');
  const btnResetView = document.getElementById('btnResetView');
  const btnJumpNova = document.getElementById('btnJumpNova');
  const btnJumpSpark = document.getElementById('btnJumpSpark');
  const btnJumpEcho = document.getElementById('btnJumpEcho');
  const btnJumpCat = document.getElementById('btnJumpCat');

  if (btnZoomIn) btnZoomIn.addEventListener('click', () => engine.setZoom(0.2));
  if (btnZoomOut) btnZoomOut.addEventListener('click', () => engine.setZoom(-0.2));
  if (btnResetView) btnResetView.addEventListener('click', () => engine.resetView());

  if (btnJumpNova) btnJumpNova.addEventListener('click', () => engine.jumpToAgent('nova'));
  if (btnJumpSpark) btnJumpSpark.addEventListener('click', () => engine.jumpToAgent('spark'));
  if (btnJumpEcho) btnJumpEcho.addEventListener('click', () => engine.jumpToAgent('echo'));
  if (btnJumpCat) btnJumpCat.addEventListener('click', () => engine.jumpToAgent('cat'));

  // 3. Status Preview State Buttons
  const previewBtns = document.querySelectorAll('.btn-pill[data-state]');
  previewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      previewBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const stateName = btn.dataset.state;
      engine.setState(stateName);
    });
  });

  // 4. Slide-Over Comm Drawer Controls
  const btnToggleComm = document.getElementById('btnToggleComm');
  const btnCloseDrawer = document.getElementById('btnCloseDrawer');
  const commDrawer = document.getElementById('commDrawer');
  const drawerBackdrop = document.getElementById('drawerBackdrop');

  const openDrawer = () => {
    commDrawer.classList.add('open');
    drawerBackdrop.classList.add('open');
    const input = document.getElementById('bossInput');
    if (input) setTimeout(() => input.focus(), 300);
  };

  const closeDrawer = () => {
    commDrawer.classList.remove('open');
    drawerBackdrop.classList.remove('open');
  };

  if (btnToggleComm) btnToggleComm.addEventListener('click', openDrawer);
  if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && commDrawer.classList.contains('open')) {
      closeDrawer();
    }
  });

  // 5. Drawer Tab Navigation (Discussion vs Deliverables)
  const tabButtons = document.querySelectorAll('.drawer-tabs .tab-btn');
  const tabPanes = document.querySelectorAll('.drawer-body .tab-pane');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetTab = document.getElementById(btn.dataset.tab);
      if (targetTab) targetTab.classList.add('active');
    });
  });

  // 6. Integrated Directive Console in Chat Drawer
  const directiveForm = document.getElementById('directiveForm');
  const bossInput = document.getElementById('bossInput');
  const chatPane = document.getElementById('tab-chat');

  if (directiveForm) {
    directiveForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = bossInput.value.trim();
      if (!text) return;

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Append Boss Message
      const bossMsg = document.createElement('div');
      bossMsg.className = 'chat-msg';
      bossMsg.innerHTML = `
        <div class="chat-avatar-mini avatar-mini-boss">B</div>
        <div class="chat-body">
          <div class="chat-meta">
            <span class="chat-sender boss">Boss (Directive)</span>
            <span class="chat-time">${timeStr}</span>
          </div>
          <div class="chat-text">${text}</div>
        </div>
      `;
      chatPane.appendChild(bossMsg);

      // Trigger Canvas Engine Thinking State
      engine.setState('thinking');
      previewBtns.forEach(b => {
        b.classList.toggle('active', b.dataset.state === 'thinking');
      });

      // Jump camera to Nova
      engine.jumpToAgent('nova');

      // Scroll to bottom
      chatPane.scrollTop = chatPane.scrollHeight;

      // Mock Response
      setTimeout(() => {
        const novaMsg = document.createElement('div');
        novaMsg.className = 'chat-msg';
        novaMsg.innerHTML = `
          <div class="chat-avatar-mini avatar-mini-nova">N</div>
          <div class="chat-body">
            <div class="chat-meta">
              <span class="chat-sender nova">Nova (Architect & PM)</span>
              <span class="chat-time">${timeStr}</span>
            </div>
            <div class="chat-text">Instruksi diterima di Meja 1! Menguraikan arsitektur dan mendelegasikan tugas ke Spark...</div>
          </div>
        `;
        chatPane.appendChild(novaMsg);
        chatPane.scrollTop = chatPane.scrollHeight;
        engine.setState('typing');
        previewBtns.forEach(b => {
          b.classList.toggle('active', b.dataset.state === 'typing');
        });
      }, 1200);

      bossInput.value = '';
    });
  }

  // 7. Settings Modal
  const btnOpenSettings = document.getElementById('btnOpenSettings');
  const btnCloseSettings = document.getElementById('btnCloseSettings');
  const btnCancelSettings = document.getElementById('btnCancelSettings');
  const btnSaveSettings = document.getElementById('btnSaveSettings');
  const settingsModal = document.getElementById('settingsModal');
  const apiKeyInput = document.getElementById('apiKeyInput');

  const savedKey = localStorage.getItem('gemini_api_key') || '';
  if (apiKeyInput) apiKeyInput.value = savedKey;

  const toggleModal = (open) => {
    settingsModal.classList.toggle('open', open);
  };

  if (btnOpenSettings) btnOpenSettings.addEventListener('click', () => toggleModal(true));
  if (btnCloseSettings) btnCloseSettings.addEventListener('click', () => toggleModal(false));
  if (btnCancelSettings) btnCancelSettings.addEventListener('click', () => toggleModal(false));

  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', () => {
      const key = apiKeyInput.value.trim();
      if (key) {
        localStorage.setItem('gemini_api_key', key);
        alert('✅ Gemini API Key berhasil disimpan di browser!');
      } else {
        localStorage.removeItem('gemini_api_key');
        alert('ℹ️ API Key dihapus.');
      }
      toggleModal(false);
    });
  }

  // 8. Copy Code Button
  const btnCopyCode = document.getElementById('btnCopyCode');
  if (btnCopyCode) {
    btnCopyCode.addEventListener('click', () => {
      const code = document.querySelector('.deliverable-code code').textContent;
      navigator.clipboard.writeText(code).then(() => {
        const originalText = btnCopyCode.textContent;
        btnCopyCode.textContent = '✅ Copied!';
        setTimeout(() => {
          btnCopyCode.textContent = originalText;
        }, 1500);
      });
    });
  }
});
