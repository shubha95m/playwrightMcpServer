import fetch from 'node-fetch';

export class GeminiAPI {
  constructor(apiKey, defaultModel = 'gemini-1.5-pro') {
    this.apiKey = apiKey;
    this.model = process.env.GEMINI_MODEL || defaultModel || 'gemini-1.5-pro';
  }

  static modelRates() {
    // Approximate USD per 1M tokens (rough order-of-magnitude)
    return {
      'gemini-1.5-pro': { input: 3, output: 15 },
      default: { input: 3, output: 12 }
    };
  }

  async sendPrompt(prompt, options = {}) {
    const model = options.model || this.model;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.max_tokens ?? 4096
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await safeReadText(response);
      throw new Error(`Gemini API error: ${response.status} ${text || ''}`.trim());
    }

    const result = await response.json();
    const content =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      result?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('\n') ||
      '[Gemini returned empty response]';

    const usageMeta = result?.usageMetadata || {};
    const inputTokens = usageMeta.promptTokenCount || 0;
    const outputTokens = usageMeta.candidatesTokenCount || 0;
    const totalTokens = usageMeta.totalTokenCount || inputTokens + outputTokens;

    const rates = GeminiAPI.modelRates()[model] || GeminiAPI.modelRates().default;
    const inputCost = (inputTokens / 1_000_000) * rates.input;
    const outputCost = (outputTokens / 1_000_000) * rates.output;
    const totalCost = inputCost + outputCost;

    return {
      content,
      usage: { inputTokens, outputTokens, totalTokens, cost: totalCost, prompt }
    };
  }
}

async function safeReadText(response) {
  try {
    return (await response.text())?.slice(0, 500);
  } catch {
    return '';
  }
}


