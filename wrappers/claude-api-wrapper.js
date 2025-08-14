import fetch from 'node-fetch';

export class ClaudeAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async sendPrompt(prompt) {
    const requestBody = {
      model: 'claude-opus-4-1-20250805',
      max_tokens: 10000,
      messages: [{ role: 'user', content: prompt }]
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) throw new Error(`Claude API error: ${response.status}`);
    const result = await response.json();
    
    // Extract usage information
    const usage = result.usage || {};
    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;
    const totalTokens = inputTokens + outputTokens;
    
    // Calculate approximate cost (Claude Opus rates as of 2024)
    const inputCost = (inputTokens / 1000000) * 15; // $15 per million input tokens
    const outputCost = (outputTokens / 1000000) * 75; // $75 per million output tokens
    const totalCost = inputCost + outputCost;
    
    const responseData = {
      content: result?.content?.[0]?.text || '[Claude returned empty response]',
      usage: {
        inputTokens,
        outputTokens,
        totalTokens,
        cost: totalCost,
        prompt: prompt
      }
    };
    
    
    return responseData;
  }
}
