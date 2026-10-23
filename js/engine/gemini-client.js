/**
 * GEMINI-CLIENT.JS - Google Gemini 1.5 Flash API Wrapper
 * 
 * Fitur:
 * - Direct Client-side REST call ke Google Generative Language API
 * - Model dinamis (default: gemini-1.5-flash, bisa diganti ke model lain di Settings)
 * - Rate Limit Delay Safeguard (jeda aman 3 detik antar panggilan agar bebas limit 15 RPM)
 * - Error Handling cerdas (kunci belum diisi, kunci tidak valid, kuota terlampaui)
 */

window.GeminiClient = class GeminiClient {
  constructor() {
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    this.minDelayMs = 3200; // 3.2 detik jeda aman untuk 15 RPM free tier
    this.lastCallTimestamp = 0;
  }

  getApiKey() {
    return localStorage.getItem('gemini_api_key') || '';
  }

  getModelName() {
    return localStorage.getItem('gemini_model_name') || 'gemini-1.5-flash';
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
   * Panggilan API generateContent ke Gemini
   * @param {string} prompt - Prompt dari pengguna / agen sebelumnya
   * @param {string} systemPrompt - Persona / instruksi sistem peran agen
   * @param {number} temperature - Kreativitas model (0.2 untuk kode presisi, 0.7 untuk PM)
   */
  async generate(prompt, systemPrompt = '', temperature = 0.7) {
    const apiKey = this.getApiKey().trim();
    if (!apiKey) {
      throw new Error("API Key belum dikonfigurasi. Silakan buka menu ⚙️ Settings di header untuk memasukkan Gemini API Key gratis Anda.");
    }

    await this.waitForRateLimit();

    const model = this.getModelName().trim();
    const url = `${this.baseUrl}/${model}:generateContent?key=${apiKey}`;

    const contents = [];
    
    // Format prompt dengan menyertakan instruksi persona
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
