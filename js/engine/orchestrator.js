/**
 * ORCHESTRATOR.JS - Autonomous Multi-Agent Coordination Engine
 * 
 * Mengatur alur kolaborasi 3 agen AI nyata (Nova -> Spark -> Echo):
 * 1. Nova (PM): Membedah tugas Bos menjadi 3 langkah teknis terstruktur.
 * 2. Spark (Dev): Mengimplementasikan kode program bersih & lengkap.
 * 3. Echo (QA): Mengaudit bug, validasi edge-cases, dan memberikan status APPROVED.
 * 
 * Terintegrasi penuh dengan Canvas 2D (kamera meluncur otomatis, balon dialog update real-time).
 */

window.AgentOrchestrator = class AgentOrchestrator {
  constructor(pixelEngine, geminiClient) {
    this.engine = pixelEngine;
    this.gemini = geminiClient;
    this.isRunning = false;
    this.abortController = null;

    // Personas & System Prompts
    this.personas = {
      nova: `Kamu adalah Nova, Lead Software Architect & PM di tim AI Office "Pixel Space Agency".
Peranmu:
1. Menganalisis instruksi tugas dari Bos secara mendalam.
2. Memecah tugas menjadi 3 poin spesifikasi teknis konkret yang jelas.
3. Menyapa Bos secara ramah, profesional, dan delegasikan implementasi kodenya ke Spark (Dev Builder).
Format jawaban: Gunakan Bahasa Indonesia profesional dan ringkas (maksimal 2-3 paragraf). Jangan langsung menulis kode lengkap, biarkan Spark yang mengoding.`,

      spark: `Kamu adalah Spark, Senior Full-Stack Developer di tim AI Office "Pixel Space Agency".
Peranmu:
1. Menerima spesifikasi dari Nova dan menulis kode program JavaScript lengkap yang bersih, efisien, dan siap pakai.
2. Pastikan menyertakan penanganan error dan komentar penjelas yang rapi.
3. Selalu sertakan kode utama di dalam blok markdown (\`\`\`javascript ... \`\`\`).
4. Berikan pengantar 1 kalimat ramah, lalu sajikan kodenya, dan minta Echo (QA) untuk mereview celah bug/edge-cases.`,

      echo: `Kamu adalah Echo, Senior QA & Security Reviewer di tim AI Office "Pixel Space Agency".
Peranmu:
1. Mengaudit kode JavaScript yang baru saja dibuat oleh Spark.
2. Periksa: validasi input (apakah bisa error jika input 0 / null / negatif), efisiensi logika, dan kerapian.
3. Berikan catatan audit singkat (1-2 paragraf) yang konstruktif dalam Bahasa Indonesia.
4. Akhiri ulasanmu dengan stempel resmi di baris baru:
[AUDIT VERDICT: APPROVED] (jika kode layak pakai) atau [AUDIT VERDICT: REVISIONS NEEDED]`
    };
  }

  abort() {
    if (this.isRunning) {
      this.isRunning = false;
      this.engine.setState('idle');
      this.engine.agents.nova.speech = 'Direktif dibatalkan.';
      this.engine.agents.spark.speech = 'Buffer koding dihentikan.';
      this.engine.agents.echo.speech = 'Audit siaga.';
      this.appendChatMessage('System', '⛔ Eksekusi direktif dihentikan oleh Bos.', 'system');
    }
  }

  async runDirective(bossPrompt) {
    if (this.isRunning) {
      alert("Tim sedang menyelesaikan tugas sebelumnya. Klik tombol Abort (⛔) jika ingin menghentikan.");
      return;
    }

    if (!this.gemini.isConfigured()) {
      alert("⚠️ Gemini API Key belum diisi!\nSilakan klik tombol '⚙️ Settings' di pojok kanan atas untuk memasukkan API Key gratis Anda.");
      const modal = document.getElementById('settingsModal');
      if (modal) modal.classList.add('open');
      return;
    }

    this.isRunning = true;

    try {
      // -------------------------------------------------------------
      // TAHAP 1: NOVA (LEAD PM / ARCHITECT)
      // -------------------------------------------------------------
      this.engine.jumpToAgent('nova');
      this.engine.setState('thinking');
      this.engine.agents.nova.speech = 'Thinking: Merancang arsitektur tugas...';
      
      const novaPrompt = `Instruksi dari Bos: "${bossPrompt}".\nSusun rencana kerja 3 langkah dan delegasikan ke Spark.`;
      const novaResponse = await this.gemini.generate(novaPrompt, this.personas.nova, 0.7);

      if (!this.isRunning) return;

      this.appendChatMessage('Nova (Lead PM)', novaResponse, 'nova');
      this.engine.setState('speaking');
      this.engine.agents.nova.speech = 'Rencana selesai! Mendelegasikan ke Spark...';

      // -------------------------------------------------------------
      // TAHAP 2: SPARK (FULL-STACK DEV BUILDER)
      // -------------------------------------------------------------
      await new Promise(r => setTimeout(r, 1500));
      if (!this.isRunning) return;

      this.engine.jumpToAgent('spark');
      this.engine.setState('typing');
      this.engine.agents.spark.speech = 'Working: Mengimplementasikan kode program...';

      const sparkPrompt = `Berikut rencana dari Nova:\n${novaResponse}\n\nInstruksi asli Bos: "${bossPrompt}".\nTolong buatkan implementasi kode JavaScript yang lengkap dan rapi!`;
      const sparkResponse = await this.gemini.generate(sparkPrompt, this.personas.spark, 0.3);

      if (!this.isRunning) return;

      this.appendChatMessage('Spark (Dev Builder)', sparkResponse, 'spark');
      this.engine.agents.spark.speech = 'Kode selesai! Mengoper ke Echo untuk audit.';

      // Ekstrak kode dan perbarui tab Deliverables
      const extractedCode = this.extractCodeBlock(sparkResponse);
      if (extractedCode) {
        this.updateDeliverables(extractedCode, bossPrompt, 'PENDING REVIEW');
      }

      // -------------------------------------------------------------
      // TAHAP 3: ECHO (QA & CODE REVIEWER)
      // -------------------------------------------------------------
      await new Promise(r => setTimeout(r, 1500));
      if (!this.isRunning) return;

      this.engine.jumpToAgent('echo');
      this.engine.setState('speaking');
      this.engine.agents.echo.speech = 'Auditing: Memeriksa validasi & edge-cases...';

      const echoPrompt = `Periksa kode dari Spark berikut ini untuk instruksi "${bossPrompt}":\n\n${sparkResponse}\n\nBerikan audit review dan stempel [AUDIT VERDICT].`;
      const echoResponse = await this.gemini.generate(echoPrompt, this.personas.echo, 0.4);

      if (!this.isRunning) return;

      this.appendChatMessage('Echo (QA Reviewer)', echoResponse, 'echo');
      
      const isApproved = echoResponse.includes('APPROVED');
      this.engine.agents.echo.speech = isApproved ? 'Audit complete: [APPROVED]!' : 'Audit complete: Review notes posted.';
      
      if (extractedCode) {
        this.updateDeliverables(extractedCode, bossPrompt, isApproved ? 'APPROVED' : 'REVIEWED');
      }

      // Selesai
      this.appendChatMessage('System', '🎉 Seluruh tim selesai bekerja! Hasil akhir telah disimpan di tab 📦 Deliverables.', 'system');

    } catch (err) {
      console.error("[Orchestrator Error]", err);
      this.appendChatMessage('System Error', `⚠️ Terjadi kendala: ${err.message}`, 'system');
      this.engine.setState('idle');
    } finally {
      this.isRunning = false;
    }
  }

  extractCodeBlock(text) {
    const codeMatch = text.match(/```(?:javascript|js)?\n([\s\S]*?)```/);
    if (codeMatch && codeMatch[1]) {
      return codeMatch[1].trim();
    }
    return null;
  }

  updateDeliverables(code, taskTitle, status) {
    const deliverableTitle = document.querySelector('.deliverable-title');
    const deliverableCode = document.querySelector('.deliverable-code code');
    const deliverablesBadge = document.querySelector('.drawer-tabs button[data-tab="tab-deliverables"] .tab-badge');

    if (deliverableTitle) {
      deliverableTitle.textContent = `📄 solution_${Date.now().toString().slice(-4)}.js (${status})`;
    }

    if (deliverableCode) {
      deliverableCode.textContent = `// ==========================================\n// PROJECT DELIVERABLE: ${taskTitle}\n// STATUS: ${status}\n// Generated by Spark & Audited by Echo\n// ==========================================\n\n${code}`;
    }

    if (deliverablesBadge) {
      deliverablesBadge.textContent = status;
      deliverablesBadge.style.color = status === 'APPROVED' ? 'var(--accent-green)' : 'var(--color-spark)';
    }
  }

  appendChatMessage(sender, text, roleClass) {
    const chatPane = document.getElementById('tab-chat');
    if (!chatPane) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const initial = sender.charAt(0);
    const msgEl = document.createElement('div');
    msgEl.className = 'chat-msg';

    let avatarClass = 'avatar-mini-boss';
    let senderClass = 'boss';

    if (roleClass === 'nova') {
      avatarClass = 'avatar-mini-nova';
      senderClass = 'nova';
    } else if (roleClass === 'spark') {
      avatarClass = 'avatar-mini-spark';
      senderClass = 'spark';
    } else if (roleClass === 'echo') {
      avatarClass = 'avatar-mini-echo';
      senderClass = 'echo';
    } else if (roleClass === 'system') {
      avatarClass = 'avatar-mini-boss';
      senderClass = 'boss';
    }

    msgEl.innerHTML = `
      <div class="chat-avatar-mini ${avatarClass}">${initial}</div>
      <div class="chat-body">
        <div class="chat-meta">
          <span class="chat-sender ${senderClass}">${sender}</span>
          <span class="chat-time">${timeStr}</span>
        </div>
        <div class="chat-text" style="white-space: pre-wrap;">${this.formatChatMarkdown(text)}</div>
      </div>
    `;

    chatPane.appendChild(msgEl);
    chatPane.scrollTop = chatPane.scrollHeight;

    // Update unread count badge
    const chatCount = document.getElementById('chatCount');
    if (chatCount) {
      const current = parseInt(chatCount.textContent || '0', 10);
      chatCount.textContent = (current + 1).toString();
    }
  }

  formatChatMarkdown(text) {
    // Sanitasi sederhana & formatting code blocks
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/```([\s\S]*?)```/g, '<pre style="background:#090d16; padding:8px; border-radius:4px; margin:6px 0; overflow-x:auto;"><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1); padding:2px 4px; border-radius:3px;">$1</code>');
  }
};
