import fetch from 'node-fetch';

// Simple Perplexity API wrapper mirroring ClaudeAPI shape
// Returns { content, usage: { inputTokens, outputTokens, totalTokens, cost, prompt } }
export class PerplexityAPI {
  constructor(apiKey, defaultModel = 'sonar-pro') {
    this.apiKey = apiKey;
    // Prefer environment override, then provided default, then recommended coding model
    this.model = process.env.PERPLEXITY_MODEL || defaultModel || 'llama-3.1-sonar-huge-128k-chat';
  }

  // Best-effort pricing estimates (USD per 1M tokens). Values are approximate.
  static modelRates() {
    return {
      'sonar-pro': { input: 3, output: 10 },
      'sonar': { input: 2, output: 8 },
      // Fallback if model not matched
      default: { input: 2, output: 8 }
    };
  }

  async sendPrompt(prompt, options = {}) {
    const model = options.model || this.model;
    const body = {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature ?? 0.2,
      max_tokens: options.max_tokens ?? 4096,
      // You can pass additional Perplexity params via options.extra if needed
      ...(options.extra || {})
    };

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(`Perplexity API error: ${response.status} ${errorText || ''}`.trim());
    }

    const result = await response.json();

    const content =
      result?.choices?.[0]?.message?.content ??
      result?.choices?.[0]?.text ??
      '[Perplexity returned empty response]';

    const usageRaw = result?.usage || {};
    const inputTokens = usageRaw.prompt_tokens || usageRaw.input_tokens || 0;
    const outputTokens = usageRaw.completion_tokens || usageRaw.output_tokens || 0;
    const totalTokens = usageRaw.total_tokens || inputTokens + outputTokens;

    const rates = PerplexityAPI.modelRates()[model] || PerplexityAPI.modelRates().default;
    const inputCost = (inputTokens / 1_000_000) * rates.input;
    const outputCost = (outputTokens / 1_000_000) * rates.output;
    const totalCost = inputCost + outputCost;

    return {
      content,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens,
        cost: totalCost,
        prompt
      }
    };
  }
}

async function safeReadText(response) {
  try {
    const text = await response.text();
    return text?.slice(0, 500);
  } catch {
    return '';
  }
}

 
