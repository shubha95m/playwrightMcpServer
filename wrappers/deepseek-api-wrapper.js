import fetch from 'node-fetch';

// DeepSeek API (OpenAI-compatible route per docs)
export class DeepSeekAPI {
  constructor(apiKey, defaultModel = 'deepseek-chat') {
    this.apiKey = apiKey;
    this.model = process.env.DEEPSEEK_MODEL || defaultModel || 'deepseek-chat';
    this.baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  }

  static modelRates() {
    return {
      'deepseek-chat': { input: 1, output: 4 },
      default: { input: 1, output: 4 }
    };
  }

  async sendPrompt(prompt, options = {}) {
    const model = options.model || this.model;
    const body = {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature ?? 0.2,
      max_tokens: options.max_tokens ?? 4096
    };

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await safeReadText(response);
      throw new Error(`DeepSeek API error: ${response.status} ${text || ''}`.trim());
    }

    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content || '[DeepSeek returned empty response]';

    const usageRaw = result?.usage || {};
    const inputTokens = usageRaw.prompt_tokens || usageRaw.input_tokens || 0;
    const outputTokens = usageRaw.completion_tokens || usageRaw.output_tokens || 0;
    const totalTokens = usageRaw.total_tokens || inputTokens + outputTokens;

    const rates = DeepSeekAPI.modelRates()[model] || DeepSeekAPI.modelRates().default;
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


