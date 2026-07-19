import * as vscode from 'vscode';
import * as https from 'https';

export interface AIProviderConfig {
  provider: 'anthropic' | 'openai' | 'none';
  apiKey: string;
}

export function getAIConfig(): AIProviderConfig {
  const config = vscode.workspace.getConfiguration('devguard');
  return {
    provider: config.get<'anthropic' | 'openai' | 'none'>('ai.provider', 'none'),
    apiKey: config.get<string>('ai.apiKey', '')
  };
}

export function isAIEnabled(): boolean {
  const config = vscode.workspace.getConfiguration('devguard');
  const enabled = config.get<boolean>('ai.enabled', false);
  const { provider, apiKey } = getAIConfig();
  return enabled && provider !== 'none' && apiKey.length > 0;
}

/**
 * Sends a single prompt to the configured provider and returns the plain-text
 * response. All static-analysis features work without ever calling this —
 * it's used only for the explicitly AI-flagged commands (explain error,
 * suggest fix, generate docs).
 */
export async function askAI(prompt: string): Promise<string> {
  const { provider, apiKey } = getAIConfig();

  if (provider === 'none' || !apiKey) {
    throw new Error('AI features are disabled. Set devguard.ai.enabled, devguard.ai.provider, and devguard.ai.apiKey in Settings.');
  }

  if (provider === 'anthropic') {
    return callAnthropic(prompt, apiKey);
  }
  return callOpenAI(prompt, apiKey);
}

function callAnthropic(prompt: string, apiKey: string): Promise<string> {
  const body = JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  });

  return httpsPost({
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-length': Buffer.byteLength(body)
    }
  }, body).then((raw) => {
    const parsed = JSON.parse(raw);
    return parsed.content?.map((c: any) => c.text).join('\n') ?? '';
  });
}

function callOpenAI(prompt: string, apiKey: string): Promise<string> {
  const body = JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1000
  });

  return httpsPost({
    hostname: 'api.openai.com',
    path: '/v1/chat/completions',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
      'content-length': Buffer.byteLength(body)
    }
  }, body).then((raw) => {
    const parsed = JSON.parse(raw);
    return parsed.choices?.[0]?.message?.content ?? '';
  });
}

function httpsPost(options: https.RequestOptions, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request({ ...options, method: 'POST' }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if ((res.statusCode ?? 500) >= 400) {
          reject(new Error(`AI provider request failed (${res.statusCode}): ${data}`));
        } else {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
