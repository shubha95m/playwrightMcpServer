import fetch from 'node-fetch';

export class OpenAIAPI {
  constructor(apiKey, defaultModel = 'gpt-4o-mini') {
    this.apiKey = apiKey;
    this.model = process.env.OPENAI_MODEL || defaultModel || 'gpt-4o-mini';
  }

  static modelRates() {
    return {
      'gpt-4o': { input: 5, output: 15 },
      'gpt-4o-mini': { input: 1.5, output: 6 },
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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await safeReadText(response);
      throw new Error(`OpenAI API error: ${response.status} ${text || ''}`.trim());
    }

    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content || '[OpenAI returned empty response]';

    const usageRaw = result?.usage || {};
    const inputTokens = usageRaw.prompt_tokens || usageRaw.input_tokens || 0;
    const outputTokens = usageRaw.completion_tokens || usageRaw.output_tokens || 0;
    const totalTokens = usageRaw.total_tokens || inputTokens + outputTokens;

    const rates = OpenAIAPI.modelRates()[model] || OpenAIAPI.modelRates().default;
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


