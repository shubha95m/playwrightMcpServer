import { ClaudeAPI } from '../../wrappers/claude-api-wrapper.js';
import { PerplexityAPI } from '../../wrappers/perplexity-api-wrapper.js';
import { GeminiAPI } from '../../wrappers/gemini-api-wrapper.js';
import { OpenAIAPI } from '../../wrappers/openai-api-wrapper.js';
import { GrokAPI } from '../../wrappers/grok-api-wrapper.js';
import { DeepSeekAPI } from '../../wrappers/deepseek-api-wrapper.js';

function normalizeLlmName(name) {
  const n = (name || '').toString().trim().toLowerCase();
  if (n === 'anthropic' || n === 'claude') return 'claude';
  if (n === 'perplexity' || n === 'pplx') return 'perplexity';
  if (n === 'gemini' || n === 'google') return 'gemini';
  if (n === 'openai' || n === 'chatgpt' || n === 'gpt') return 'openai';
  if (n === 'grok' || n === 'xai' || n === 'x.ai') return 'grok';
  if (n === 'deepseek' || n === 'deepseak') return 'deepseek';
  return 'perplexity';
}

function resolveApiKeyForProvider(provider, explicitKey) {
  if (explicitKey && explicitKey.trim()) return explicitKey.trim();
  if (provider === 'claude') {
    return process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '';
  }
  if (provider === 'perplexity') {
    return process.env.PERPLEXITY_API_KEY || process.env.PPLX_API_KEY || process.env.PERPLEXITY_KEY || '';
  }
  if (provider === 'gemini') {
    return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  }
  if (provider === 'openai') {
    return process.env.OPENAI_API_KEY || '';
  }
  if (provider === 'grok') {
    return process.env.GROK_API_KEY || process.env.XAI_API_KEY || '';
  }
  if (provider === 'deepseek') {
    return process.env.DEEPSEEK_API_KEY || '';
  }
  return '';
}

export function createLlmClient({ apiKey, llmName }) {
  const provider = normalizeLlmName(llmName || process.env.LLM || 'perplexity');
  const resolvedKey = resolveApiKeyForProvider(provider, apiKey);

  if (provider === 'claude') return { client: new ClaudeAPI(resolvedKey), provider };
  if (provider === 'perplexity') return { client: new PerplexityAPI(resolvedKey), provider };
  if (provider === 'gemini') return { client: new GeminiAPI(resolvedKey), provider };
  if (provider === 'openai') return { client: new OpenAIAPI(resolvedKey), provider };
  if (provider === 'grok') return { client: new GrokAPI(resolvedKey), provider };
  if (provider === 'deepseek') return { client: new DeepSeekAPI(resolvedKey), provider };
  return { client: new PerplexityAPI(resolvedKey), provider: 'perplexity' };
}

export function providerEnvHint(provider) {
  const p = normalizeLlmName(provider);
  if (p === 'claude') return 'ANTHROPIC_API_KEY';
  if (p === 'perplexity') return 'PERPLEXITY_API_KEY';
  if (p === 'gemini') return 'GEMINI_API_KEY';
  if (p === 'openai') return 'OPENAI_API_KEY';
  if (p === 'grok') return 'GROK_API_KEY';
  if (p === 'deepseek') return 'DEEPSEEK_API_KEY';
  return 'PERPLEXITY_API_KEY';
}


