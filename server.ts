/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {GoogleGenAI} from '@google/genai';
import dns from 'dns/promises';
import express from 'express';
import fs from 'fs';
import net from 'net';
import path from 'path';
import {fileURLToPath} from 'url';

const ownedFiles = new Set<string>();
function recordOwnedFile(name: string) {
  if (!ownedFiles.has(name) && ownedFiles.size >= 500) {
    const oldest = ownedFiles.values().next().value;
    if (oldest !== undefined) ownedFiles.delete(oldest);
  }
  ownedFiles.add(name);
}


function stripHttpOptions(val: any): any {
  if (!val || typeof val !== "object") return val;
  if (Array.isArray(val)) return val.map(stripHttpOptions);
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(val)) {
    if (
      k === "httpOptions" ||
      k === "http_options" ||
      k === "__proto__" ||
      k === "constructor" ||
      k === "prototype" ||
      k === "cachedContent" ||
      k === "cached_content" ||
      k === "fileSearch" ||
      k === "file_search" ||
      k === "corpora" ||
      k === "semanticRetriever" ||
      k === "semantic_retriever"
    ) continue;
    if ((k === "fileData" || k === "file_data") && v && typeof v === "object") {
      const rawU = (v as any).fileUri ?? (v as any).file_uri;
      const u = typeof rawU === "string" ? rawU.trim() : "";
      if (!/^https:\/\/(?:www\.|m\.)?(?:youtube\.com|youtu\.be)\//i.test(u)) continue;
    }
    out[k] = stripHttpOptions(v);
  }
  return out;
}


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!key) {
    throw new Error(
      'GEMINI_API_KEY or API_KEY environment variable is required on the server.',
    );
  }
  return key;
}

const MODEL_UPGRADES: Record<string, string> = {
  'gemini-2.5-flash': 'gemini-4-hydrogen',
  'gemini-2.5-pro': 'gemini-4-hydrogen',
  'gemini-2.5-pro-exp-03-25': 'gemini-4-hydrogen',
  'gemini-3-pro-preview': 'gemini-4-hydrogen',
  'gemini-3.1-pro-preview': 'gemini-4-hydrogen',
  'gemini-3-flash-preview': 'gemini-4-hydrogen',
  'gemini-2.0-flash': 'gemini-4-hydrogen',
  'gemini-2.0-flash-exp': 'gemini-4-hydrogen',
  'gemini-2.0-flash-preview-image-generation': 'gemini-4-hydrogen',
  'gemini-2.5-flash-image': 'gemini-4-hydrogen',
};

const ALLOWED_MODEL_RE = /^(?!.*\.\.)(?:models\/)?(?:gemini-|imagen-|veo-|lyria-|learnlm-|text-embedding-|gemini-embedding-)[a-zA-Z0-9._-]+$/;

function resolveModel(model?: string): string {
  const candidate = !model ? 'gemini-4-hydrogen' : MODEL_UPGRADES[model] || model;
  if (!ALLOWED_MODEL_RE.test(candidate)) {
    throw new Error(`Disallowed model: ${candidate}`);
  }
  return candidate;
}

function sanitizeConfigForModel(model: string, config: any): any {
  if (!config || typeof config !== 'object') return config;
  const copy = {...config};
  if (model.startsWith('gemini-4-')) {
    delete copy.temperature;
    delete copy.topP;
    delete copy.topK;
    delete copy.candidateCount;
    delete copy.thinkingBudget;
  }
  return Object.keys(copy).length > 0 ? copy : undefined;
}

function getAI(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: getApiKey(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function serializeResponse(response: any) {
  return {
    text: response?.text ?? '',
    candidates: response?.candidates ?? [],
    functionCalls: response?.functionCalls ?? undefined,
    groundingMetadata:
      response?.candidates?.[0]?.groundingMetadata ?? undefined,
    usageMetadata: response?.usageMetadata ?? undefined,
    promptFeedback: response?.promptFeedback ?? undefined,
  };
}

function normalizeMessage(msg: any): any {
  if (Array.isArray(msg)) {
    return msg.map((item) => {
      if (
        item &&
        typeof item === 'object' &&
        'role' in item &&
        'text' in item &&
        !('parts' in item)
      ) {
        return {text: item.text};
      }
      return item;
    });
  }
  return msg;
}

function formatGeminiError(error: any): {status: number; message: string} {
  const rawMessage = String(error?.message || error || 'Gemini API request failed');
  let status = Number(error?.status) || 500;
  let parsedMessage = rawMessage;

  try {
    const jsonMatch = rawMessage.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed?.error?.code) {
        status = Number(parsed.error.code) || status;
      }
      if (parsed?.error?.message) {
        parsedMessage = String(parsed.error.message);
      }
    }
  } catch {
    // Keep original message string if not JSON
  }

  if (
    status === 403 ||
    status === 400 ||
    rawMessage.includes('PERMISSION_DENIED') ||
    rawMessage.includes('API_KEY_INVALID') ||
    rawMessage.includes('free tier is not available')
  ) {
    return {
      status: status === 500 ? 403 : status,
      message: `${parsedMessage} Please check or select a valid billing-enabled API key in the AI Studio Settings > Secrets panel.`,
    };
  }

  if (status === 429 || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: `${parsedMessage} Quota exceeded—please check or upgrade your API key in the Settings > Secrets panel.`,
    };
  }

  return {status, message: parsedMessage};
}

async function startServer() {
  const app = express();
  app.set("trust proxy", 2);
  app.use(express.json({limit: '50mb'}));
  app.use((req, _res, next) => {
    if (req.body && typeof req.body === "object") {
      req.body = stripHttpOptions(req.body);
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      hasKey: Boolean(process.env.GEMINI_API_KEY || process.env.API_KEY),
    });
  });

  function isPrivateOrReservedIp(ip: string): boolean {
    const clean = ip.replace(/^::ffff:/i, '');
    if (net.isIPv4(clean)) {
      const parts = clean.split('.').map(Number);
      const [a, b] = parts;
      if (a === 0 || a === 10 || a === 127) return true;
      if (a === 100 && b >= 64 && b <= 127) return true;
      if (a === 169 && b === 254) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 0) return true;
      if (a === 192 && b === 168) return true;
      if (a >= 224) return true;
      return false;
    }
    if (net.isIPv6(ip)) {
      const lower = ip.toLowerCase();
      if (lower === '::' || lower === '::1') return true;
      if (lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('ff')) {
        return true;
      }
      return false;
    }
    return true;
  }

  async function validatePublicHttpUrl(rawUrl: string): Promise<URL> {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Only HTTP and HTTPS URLs are supported.');
    }
    const host = parsed.hostname.replace(/^\[|\]$/g, '');
    if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
      throw new Error('Local or internal hostnames are blocked.');
    }
    if (net.isIP(host)) {
      if (isPrivateOrReservedIp(host)) {
        throw new Error('Private or reserved IP addresses are blocked.');
      }
      return parsed;
    }
    try {
      const records = await dns.lookup(host, {all: true});
      if (!records || records.length === 0) {
        throw new Error(`Host not found: ${host}`);
      }
      for (const rec of records) {
        if (isPrivateOrReservedIp(rec.address)) {
          throw new Error('Target resolved to a private or reserved network address.');
        }
      }
    } catch (err: any) {
      if (err?.message?.includes('blocked') || err?.message?.includes('private')) {
        throw err;
      }
      // Note: if direct DNS lookup fails behind an upstream HTTP proxy, let fetch attempt proxy resolution unless explicitly private
    }
    return parsed;
  }

  app.get('/api/browse', async (req, res) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    if (!rawUrl) {
      res.status(400).json({ok: false, error: 'Missing ?url= parameter.'});
      return;
    }

    try {
      let currentUrl = (await validatePublicHttpUrl(rawUrl)).toString();
      let response: Response | null = null;

      for (let hops = 0; hops < 8; hops++) {
        response = await fetch(currentUrl, {
          redirect: 'manual',
          signal: AbortSignal.timeout(12000),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
          },
        });

        if (response.status >= 300 && response.status < 400) {
          const loc = response.headers.get('location');
          if (!loc) break;
          const nextUrl = new URL(loc, currentUrl).toString();
          currentUrl = (await validatePublicHttpUrl(nextUrl)).toString();
          continue;
        }
        break;
      }

      if (!response) {
        res.status(502).json({ok: false, error: 'No response from upstream server.'});
        return;
      }

      const contentType = (response.headers.get('content-type') || 'text/html').toLowerCase();
      if (contentType.startsWith('image/')) {
        const html = `<!DOCTYPE html><html><head><title>${currentUrl}</title></head><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh;"><img src="${currentUrl.replace(/"/g, '&quot;')}" style="max-width:100%;max-height:100vh;object-fit:contain;" /></body></html>`;
        res.json({ok: true, finalUrl: currentUrl, status: response.status, title: currentUrl, html});
        return;
      }

      const MAX_BYTES = 2 * 1024 * 1024;
      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      if (reader) {
        while (true) {
          const {done, value} = await reader.read();
          if (done || !value) break;
          total += value.byteLength;
          if (total > MAX_BYTES) {
            chunks.push(value.slice(0, Math.max(0, value.byteLength - (total - MAX_BYTES))));
            try { await reader.cancel(); } catch {}
            break;
          }
          chunks.push(value);
        }
      }
      const rawText = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');

      if (!response.ok) {
        res.json({
          ok: false,
          finalUrl: currentUrl,
          status: response.status,
          error: `Upstream returned HTTP ${response.status} ${response.statusText || ''}`.trim(),
        });
        return;
      }

      let html = rawText;
      if (contentType.includes('application/json')) {
        let formatted = rawText;
        try {
          formatted = JSON.stringify(JSON.parse(rawText), null, 2);
        } catch {
          // keep raw text if invalid JSON
        }
        const esc = formatted.replace(/[&<>]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c] || c));
        html = `<!DOCTYPE html><html><head><title>${currentUrl}</title></head><body style="font-family:ui-monospace,Consolas,monospace;white-space:pre-wrap;padding:18px;background:#0f172a;color:#e2e8f0;line-height:1.5;">${esc}</body></html>`;
      } else if (!contentType.includes('html') && !contentType.includes('xml')) {
        const esc = rawText.replace(/[&<>]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c] || c));
        html = `<!DOCTYPE html><html><head><title>${currentUrl}</title></head><body style="font-family:ui-monospace,Consolas,monospace;white-space:pre-wrap;padding:18px;background:#ffffff;color:#111827;line-height:1.5;">${esc}</body></html>`;
      } else {
        // Strip framing/CSP/refresh meta restrictions and inject <base href="...">
        html = html
          .replace(/<meta\b[^>]*http-equiv\s*=\s*["']?(?:Content-Security-Policy|Content-Security-Policy-Report-Only|X-Frame-Options)[^>]*>/gi, '')
          .replace(/<base\b[^>]*>/gi, '');
        const safeBase = currentUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
        const baseTag = `<base href="${safeBase}" target="_self">`;
        if (/<head\b[^>]*>/i.test(html)) {
          html = html.replace(/<head\b[^>]*>/i, (m) => `${m}\n${baseTag}`);
        } else {
          html = `<!DOCTYPE html><html><head>${baseTag}</head><body>${html}</body></html>`;
        }
      }

      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : currentUrl;

      res.json({ok: true, finalUrl: currentUrl, status: response.status, title, html});
    } catch (error: any) {
      res.status(200).json({
        ok: false,
        finalUrl: rawUrl,
        status: 0,
        error: error?.name === 'TimeoutError' ? 'Request timed out after 12 seconds.' : (error?.message || String(error)),
      });
    }
  });

  app.post('/api/generate-content', async (req, res) => {
    try {
      const ai = getAI();
      const {model: rawModel, contents, config} = req.body;
      const model = resolveModel(rawModel);
      const response = await ai.models.generateContent({
        model,
        contents,
        config: sanitizeConfigForModel(model, config),
      });
      res.json(serializeResponse(response));
    } catch (error: any) {
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json({error: formatted.message});
    }
  });

  app.post('/api/generate-content-stream', async (req, res) => {
    try {
      const ai = getAI();
      const {model: rawModel, contents, config} = req.body;
      const model = resolveModel(rawModel);
      const responseStream = await ai.models.generateContentStream({
        model,
        contents,
        config: sanitizeConfigForModel(model, config),
      });

      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache');

      for await (const chunk of responseStream) {
        res.write(JSON.stringify(serializeResponse(chunk)) + '\n');
      }
      res.end();
    } catch (error: any) {
      const formatted = formatGeminiError(error);
      if (!res.headersSent) {
        res.status(formatted.status).json({error: formatted.message});
      } else {
        res.write(JSON.stringify({error: formatted.message}) + '\n');
        res.end();
      }
    }
  });

  app.post('/api/generate-images', async (req, res) => {
    try {
      const ai = getAI();
      const {model, prompt, config} = req.body;
      const response = await ai.models.generateImages({
        model: resolveModel(model),
        prompt,
        config,
      });
      res.json(response);
    } catch (error: any) {
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json({error: formatted.message});
    }
  });

  app.post('/api/files-upload', (_req, res) => {
    res.status(403).json({error: 'File upload is not enabled for this applet.'});
  });

  app.post('/api/files-get', (_req, res) => {
    res.status(403).json({error: 'File lookup is not enabled for this applet.'});
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const ai = getAI();
      const {model: rawModel, config, history, message} = req.body;
      const model = resolveModel(rawModel);
      const chat = ai.chats.create({
        model,
        config: sanitizeConfigForModel(model, config),
        history: history || [],
      });
      const rawMsg =
        typeof message === 'object' && message !== null && 'message' in message
          ? message.message
          : message;
      const msgPayload = normalizeMessage(rawMsg);
      const response = await chat.sendMessage({message: msgPayload});
      res.json({
        ...serializeResponse(response),
        history: await chat.getHistory(),
      });
    } catch (error: any) {
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json({error: formatted.message});
    }
  });

  app.post('/api/chat-stream', async (req, res) => {
    try {
      const ai = getAI();
      const {model: rawModel, config, history, message} = req.body;
      const model = resolveModel(rawModel);
      const chat = ai.chats.create({
        model,
        config: sanitizeConfigForModel(model, config),
        history: history || [],
      });
      const rawMsg =
        typeof message === 'object' && message !== null && 'message' in message
          ? message.message
          : message;
      const msgPayload = normalizeMessage(rawMsg);
      const responseStream = await chat.sendMessageStream({
        message: msgPayload,
      });

      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache');

      for await (const chunk of responseStream) {
        res.write(JSON.stringify(serializeResponse(chunk)) + '\n');
      }
      res.end();
    } catch (error: any) {
      const formatted = formatGeminiError(error);
      if (!res.headersSent) {
        res.status(formatted.status).json({error: formatted.message});
      } else {
        res.write(JSON.stringify({error: formatted.message}) + '\n');
        res.end();
      }
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    // Serve a self-unregistering worker for any browser still holding an old dev-sw.js / sw.js cache
    const clearSwScript = `
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        client.navigate(client.url);
      }
    } catch {}
  })());
});
`;
    app.get(['/dev-sw.js', '/sw.js'], (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.send(clearSwScript);
    });
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api/')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      }
      next();
    });

    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true, hmr: false, ws: false},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
