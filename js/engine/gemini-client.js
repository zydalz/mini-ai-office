/**
 * GEMINI-CLIENT.JS - Google Gemini API Client & Auto-Discovery Engine
 * 
 * Fitur:
 * - Direct Client-side REST call ke Google Generative Language API
 * - Auto-Discovery & Self-Healing: Jika model atau versi API 404 / tidak ditemukan,
 *   otomatis memanggil ModelService.ListModels untuk mendeteksi model yang aktif
 *   pada API Key pengguna (misal: gemini-2.0-flash, gemini-1.5-flash-latest, dll.)
 * - Multi-version Fallback: Mendukung v1beta dan v1
 * - Rate Limit Delay Safeguard: Jeda aman 3.2 detik antar panggilan (15 RPM)
 */

window.GeminiClient = class GeminiClient {
  constructor() {
    this.apiOrigin = 'https://generativelanguage.googleapis.com';
    this.minDelayMs = 3200; // 3.2 detik jeda aman untuk 15 RPM free tier
    this.lastCallTimestamp = 0;
  }

  getApiKey() {
    return localStorage.getItem('gemini_api_key') || '';
  }

  getModelName() {
    return localStorage.getItem('gemini_model_name') || 'gemini-1.5-flash';
  }

  getApiVersion() {
    return localStorage.getItem('gemini_api_version') || 'v1beta';
  }

  isConfigured() {
    const key = this.getApiKey().trim();
    return key.length > 10;
  }

  async waitForRateLimit() {
    const now = Date.now();
    const elapsed = now - this.lastCallTimestamp;
    if (elapsed < this.minDelayMs) {
      const waitTime = this.minDelayMs - elapsed;
      console.log(`[Rate Limit Safeguard] Menunggu ${waitTime}ms sebelum panggilan berikutnya...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastCallTimestamp = Date.now();
  }

  /**
   * Fetch list of available models for this API key via ModelService.ListModels
   * Menguji endpoint v1beta dan v1 untuk menemukan model yang valid
   */
  async listAvailableModels(providedKey = '') {
    const apiKey = (providedKey || this.getApiKey()).trim();
    if (!apiKey) {
      throw new Error("API Key belum diisi. Masukkan API Key terlebih dahulu.");
    }

    const versions = ['v1beta', 'v1'];
    let lastError = null;
    let foundModels = [];
    let workingVersion = 'v1beta';

    for (const ver of versions) {
      try {
        const url = `${this.apiOrigin}/${ver}/models?key=${apiKey}`;
        const resp = await fetch(url);
        if (resp.ok) {
          const data = await resp.json();
          if (data && Array.isArray(data.models)) {
            const compatible = data.models
              .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
              .map(m => ({
                id: m.name.replace(/^models\//, ''),
                displayName: m.displayName || m.name,
                description: m.description || '',
                version: ver
              }));

            if (compatible.length > 0) {
              workingVersion = ver;
              foundModels = compatible;
              break;
            }
          }
        } else {
          const errData = await resp.json().catch(() => ({}));
          lastError = errData.error?.message || `HTTP ${resp.status}`;
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    if (foundModels.length === 0) {
      throw new Error(`Tidak dapat mengambil model dari Google AI Studio: ${lastError || 'Key tidak memiliki izin atau endpoint terblokir'}`);
    }

    return {
      version: workingVersion,
      models: foundModels
    };
  }

  /**
   * Rekomendasi otomatis model terbaik dari daftar
   */
  pickBestModel(models) {
    if (!models || models.length === 0) return null;

    // Prioritas Flash model (hemat biaya & cepat):
    // 1. gemini-2.0-flash / gemini-2.0-flash-exp
    // 2. gemini-1.5-flash-latest / gemini-1.5-flash
    // 3. gemini-1.5-flash-002 / gemini-1.5-flash-001 / gemini-1.5-flash-8b
    // 4. gemini-pro
    const flashModels = models.filter(m => m.id.toLowerCase().includes('flash'));
    if (flashModels.length > 0) {
      return (
        flashModels.find(m => m.id === 'gemini-1.5-flash-latest') ||
        flashModels.find(m => m.id === 'gemini-2.0-flash') ||
        flashModels.find(m => m.id === 'gemini-2.0-flash-exp') ||
        flashModels.find(m => m.id === 'gemini-1.5-flash') ||
        flashModels.find(m => m.id.includes('flash-002')) ||
        flashModels.find(m => m.id.includes('flash-001')) ||
        flashModels.find(m => m.id.includes('8b')) ||
        flashModels[0]
      );
    }

    const proModel = models.find(m => m.id.toLowerCase().includes('pro'));
    if (proModel) return proModel;

    return models[0];
  }

  /**
   * Panggilan API generateContent ke Gemini dengan Auto-Healing Retry
   * @param {string} prompt - Prompt dari pengguna / agen sebelumnya
   * @param {string} systemPrompt - Persona / instruksi sistem peran agen
   * @param {number} temperature - Kreativitas model (0.2 untuk kode presisi, 0.7 untuk PM)
   * @param {boolean} isRetry - Status rekursi internal
   */
  async generate(prompt, systemPrompt = '', temperature = 0.7, isRetry = false) {
    const apiKey = this.getApiKey().trim();
    if (!apiKey) {
      throw new Error("API Key belum dikonfigurasi. Silakan buka menu ⚙️ Settings di header untuk memasukkan Gemini API Key gratis Anda.");
    }

    await this.waitForRateLimit();

    let model = this.getModelName().trim().replace(/^models\//, '');
    let apiVersion = this.getApiVersion();
    let url = `${this.apiOrigin}/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;

    const contents = [];
    let combinedPrompt = prompt;
    if (systemPrompt) {
      combinedPrompt = `[INSTRUKSI SISTEM PERAN]\n${systemPrompt}\n\n[TUGAS / INPUT]\n${prompt}`;
    }

    contents.push({
      role: 'user',
      parts: [{ text: combinedPrompt }]
    });

    const requestBody = {
      contents: contents,
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: 2048,
        topP: 0.95
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || `HTTP Error ${response.status} (${response.statusText})`;

        // AUTO-HEALING: Jika 404 / model tidak ditemukan di versi API saat ini,
        // jalankan discovery untuk mencari model yang didukung secara otomatis!
        if (response.status === 404 || errorMsg.includes('not found') || errorMsg.includes('not supported for generateContent')) {
          if (!isRetry) {
            console.warn(`[GeminiClient] Model ${model} (${apiVersion}) tidak cocok. Mencoba Auto-Discovery via ListModels...`);
            try {
              const discovery = await this.listAvailableModels(apiKey);
              const best = this.pickBestModel(discovery.models);
              if (best) {
                console.log(`[GeminiClient Auto-Discovery] Berhasil menemukan model aktif: ${best.id} (API: ${discovery.version}). Menyimpan & mencoba ulang...`);
                localStorage.setItem('gemini_model_name', best.id);
                localStorage.setItem('gemini_api_version', discovery.version);
                
                // Coba ulang permintaan dengan model baru yang valid
                return await this.generate(prompt, systemPrompt, temperature, true);
              }
            } catch (discoveryErr) {
              console.error("[GeminiClient Auto-Discovery Failed]", discoveryErr);
            }
          }
        }

        if (response.status === 429) {
          throw new Error("Batas kecepatan (Rate Limit 15 RPM) tercapai. Mohon tunggu beberapa detik sebelum mencoba lagi.");
        } else if (response.status === 400 || response.status === 403) {
          throw new Error(`API Key tidak valid atau izin ditolak: ${errorMsg}`);
        } else {
          throw new Error(`Gagal menghubungi Gemini API: ${errorMsg}`);
        }
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      const textOutput = candidate?.content?.parts?.[0]?.text;

      if (!textOutput) {
        throw new Error("Gemini tidak mengembalikan teks output. Coba formulasi instruksi lain.");
      }

      return textOutput;
    } catch (err) {
      console.error("[GeminiClient Error]", err);
      throw err;
    }
  }
};
