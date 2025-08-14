import fetch from 'node-fetch';

// X.ai Grok API - approximate compatibility with OpenAI chat format
export class GrokAPI {
  constructor(apiKey, defaultModel = 'grok-2-latest') {
    this.apiKey = apiKey;
    this.model = process.env.GROK_MODEL || defaultModel || 'grok-2-latest';
  }

  static modelRates() {
    return {
      'grok-2-latest': { input: 2, output: 8 },
      default: { input: 2, output: 8 }
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

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await safeReadText(response);
      throw new Error(`Grok API error: ${response.status} ${text || ''}`.trim());
    }

    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content || '[Grok returned empty response]';

    const usageRaw = result?.usage || {};
    const inputTokens = usageRaw.prompt_tokens || usageRaw.input_tokens || 0;
    const outputTokens = usageRaw.completion_tokens || usageRaw.output_tokens || 0;
    const totalTokens = usageRaw.total_tokens || inputTokens + outputTokens;

    const rates = GrokAPI.modelRates()[model] || GrokAPI.modelRates().default;
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


