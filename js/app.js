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

  // 2. Initialize Gemini Client & Multi-Agent Orchestrator
  const gemini = window.GeminiClient ? new window.GeminiClient() : null;
  const orchestrator = (window.AgentOrchestrator && gemini) ? new window.AgentOrchestrator(engine, gemini) : null;

  // 3. Camera Navigation Controls
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

  // 4. Status Preview State Buttons
  const previewBtns = document.querySelectorAll('.btn-pill[data-state]');
  previewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      previewBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const stateName = btn.dataset.state;
      engine.setState(stateName);
    });
  });

  // 5. Slide-Over Comm Drawer Controls
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

  // 6. Drawer Tab Navigation (Discussion vs Deliverables)
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

  // 7. Integrated Directive Console & Orchestrator Execution
  const directiveForm = document.getElementById('directiveForm');
  const bossInput = document.getElementById('bossInput');
  const btnAbort = document.getElementById('btnAbort');

  if (directiveForm) {
    directiveForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = bossInput.value.trim();
      if (!text) return;

      if (!gemini || !gemini.isConfigured()) {
        alert("⚠️ Gemini API Key belum diisi!\nSilakan masukkan API Key gratis Anda pada modal pengaturan.");
        toggleModal(true);
        return;
      }

      if (orchestrator) {
        orchestrator.appendChatMessage('Boss (Directive)', text, 'boss');
        orchestrator.runDirective(text);
      }

      bossInput.value = '';
    });
  }

  if (btnAbort && orchestrator) {
    btnAbort.addEventListener('click', () => {
      orchestrator.abort();
    });
  }

  // 8. Settings Modal (API Key & Model Endpoint)
  const btnOpenSettings = document.getElementById('btnOpenSettings');
  const btnCloseSettings = document.getElementById('btnCloseSettings');
  const btnCancelSettings = document.getElementById('btnCancelSettings');
  const btnSaveSettings = document.getElementById('btnSaveSettings');
  const btnDetectModels = document.getElementById('btnDetectModels');
  const settingsModal = document.getElementById('settingsModal');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const modelNameInput = document.getElementById('modelNameInput');
  const modelSelect = document.getElementById('modelSelect');
  const modelHelpText = document.getElementById('modelHelpText');

  if (apiKeyInput && gemini) apiKeyInput.value = gemini.getApiKey();
  if (modelNameInput && gemini) modelNameInput.value = gemini.getModelName();

  const toggleModal = (open) => {
    if (settingsModal) settingsModal.classList.toggle('open', open);
  };

  if (btnOpenSettings) btnOpenSettings.addEventListener('click', () => toggleModal(true));
  if (btnCloseSettings) btnCloseSettings.addEventListener('click', () => toggleModal(false));
  if (btnCancelSettings) btnCancelSettings.addEventListener('click', () => toggleModal(false));

  // Dynamic Model Detection Button
  if (btnDetectModels && gemini) {
    btnDetectModels.addEventListener('click', async () => {
      const key = apiKeyInput ? apiKeyInput.value.trim() : '';
      if (!key) {
        alert('⚠️ Masukkan Google Gemini API Key Anda terlebih dahulu pada kolom di atas!');
        if (apiKeyInput) apiKeyInput.focus();
        return;
      }

      const origText = btnDetectModels.textContent;
      btnDetectModels.textContent = '⏳ Mencari...';
      btnDetectModels.disabled = true;

      try {
        const result = await gemini.listAvailableModels(key);
        const models = result.models;

        if (modelSelect) {
          modelSelect.innerHTML = '';
          models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = `${m.id} (${m.displayName || m.id})`;
            modelSelect.appendChild(opt);
          });

          // Pilih rekomendasi model terbaik
          const best = gemini.pickBestModel(models);
          if (best) {
            modelSelect.value = best.id;
            if (modelNameInput) modelNameInput.value = best.id;
          }

          modelSelect.style.display = 'block';
          modelSelect.onchange = () => {
            if (modelNameInput) modelNameInput.value = modelSelect.value;
          };
        }

        if (modelHelpText) {
          modelHelpText.innerHTML = `✅ Ditemukan <b>${models.length} model</b> aktif untuk API Key Anda (Versi API: <code>${result.version}</code>).`;
          modelHelpText.style.color = 'var(--accent-green)';
        }

      } catch (err) {
        alert(`❌ Gagal mendeteksi model: ${err.message}`);
      } finally {
        btnDetectModels.textContent = origText;
        btnDetectModels.disabled = false;
      }
    });
  }

  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', () => {
      const key = apiKeyInput ? apiKeyInput.value.trim() : '';
      const model = modelNameInput ? modelNameInput.value.trim() : 'gemini-3.8-flash';

      if (key) {
        localStorage.setItem('gemini_api_key', key);
      } else {
        localStorage.removeItem('gemini_api_key');
      }

      localStorage.setItem('gemini_model_name', model || 'gemini-3.8-flash');
      alert('✅ Pengaturan Gemini API (Key & Model Endpoint) berhasil disimpan!');
      toggleModal(false);
    });
  }

  // 9. Copy Code Button
  const btnCopyCode = document.getElementById('btnCopyCode');
  if (btnCopyCode) {
    btnCopyCode.addEventListener('click', () => {
      const codeEl = document.querySelector('.deliverable-code code');
      if (!codeEl) return;
      navigator.clipboard.writeText(codeEl.textContent).then(() => {
        const originalText = btnCopyCode.textContent;
        btnCopyCode.textContent = '✅ Copied!';
        setTimeout(() => {
          btnCopyCode.textContent = originalText;
        }, 1500);
      });
    });
  }
});
