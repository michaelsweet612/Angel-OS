/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {GoogleGenAI} from '@google/genai';
import express from 'express';
import fs from 'fs';
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
  'gemini-2.5-flash': 'gemini-3-flash-preview',
  'gemini-2.5-pro': 'gemini-3.1-pro-preview',
  'gemini-2.5-pro-exp-03-25': 'gemini-3.1-pro-preview',
  'gemini-3-pro-preview': 'gemini-3.1-pro-preview',
  'gemini-2.0-flash': 'gemini-3-flash-preview',
  'gemini-2.0-flash-exp': 'gemini-3-flash-preview',
  'gemini-2.0-flash-preview-image-generation': 'gemini-2.5-flash-image',
};

const ALLOWED_MODEL_RE = /^(?!.*\.\.)(?:models\/)?(?:gemini-|imagen-|veo-|lyria-|learnlm-|text-embedding-|gemini-embedding-)[a-zA-Z0-9._-]+$/;

function resolveModel(model?: string): string {
  const candidate = !model ? "gemini-3-flash-preview" : MODEL_UPGRADES[model] || model;
  if (!ALLOWED_MODEL_RE.test(candidate)) {
    throw new Error(`Disallowed model: ${candidate}`);
  }
  return candidate;
}

function getAI(): GoogleGenAI {
  return new GoogleGenAI({apiKey: getApiKey()});
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

  app.post('/api/generate-content', async (req, res) => {
    try {
      const ai = getAI();
      const {model: rawModel, contents, config} = req.body;
      const response = await ai.models.generateContent({
        model: resolveModel(rawModel),
        contents,
        config,
      });
      res.json(serializeResponse(response));
    } catch (error: any) {
      console.error('Error in /api/generate-content:', error);
      res
        .status(error?.status || 500)
        .json({error: error.message || String(error)});
    }
  });

  app.post('/api/generate-content-stream', async (req, res) => {
    try {
      const ai = getAI();
      const {model: rawModel, contents, config} = req.body;
      const responseStream = await ai.models.generateContentStream({
        model: resolveModel(rawModel),
        contents,
        config,
      });

      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache');

      for await (const chunk of responseStream) {
        res.write(JSON.stringify(serializeResponse(chunk)) + '\n');
      }
      res.end();
    } catch (error: any) {
      console.error('Error in /api/generate-content-stream:', error);
      if (!res.headersSent) {
        res
          .status(error?.status || 500)
          .json({error: error.message || String(error)});
      } else {
        res.write(
          JSON.stringify({error: error.message || String(error)}) + '\n',
        );
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
      console.error('Error in /api/generate-images:', error);
      res
        .status(error?.status || 500)
        .json({error: error.message || String(error)});
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
      const chat = ai.chats.create({
        model: resolveModel(rawModel),
        config,
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
      console.error('Error in /api/chat:', error);
      res
        .status(error?.status || 500)
        .json({error: error.message || String(error)});
    }
  });

  app.post('/api/chat-stream', async (req, res) => {
    try {
      const ai = getAI();
      const {model: rawModel, config, history, message} = req.body;
      const chat = ai.chats.create({
        model: resolveModel(rawModel),
        config,
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
      console.error('Error in /api/chat-stream:', error);
      if (!res.headersSent) {
        res
          .status(error?.status || 500)
          .json({error: error.message || String(error)});
      } else {
        res.write(
          JSON.stringify({error: error.message || String(error)}) + '\n',
        );
        res.end();
      }
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
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
