/**
 * @license
 * SPDX-License-Identifier: LicenseRef-AngelOS-Personal-Use
 *
 * Angel-OS Static Live Web Engine (v1.8.1)
 * ----------------------------------------
 * Browser-only Live Web loader used when the Express `/api/browse` proxy is not
 * available (GitHub Pages, `vite preview`, the portable ZIP, or `file://`).
 *
 * Load order:
 *   1. Wikipedia (any language) via the CORS-enabled MediaWiki Action API.
 *      Plain search queries also land here, with a "no results" page that
 *      still offers web search shortcuts instead of a dead end.
 *   2. Direct `fetch()` for hosts that already send CORS headers.
 *   3. A rotating chain of public CORS relays (HTML).
 *   4. A Reader-View relay (r.jina.ai) that returns readable text/markdown.
 */

export interface StaticWebResult {
  ok: boolean;
  html: string;
  finalUrl: string;
  title: string;
  via: string;
  error?: string;
}

const FETCH_TIMEOUT_MS = 9000;

function esc(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
}

async function timedFetch(url: string, init: RequestInit = {}, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
  } finally {
    window.clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Backend detection (Express /api/browse)
// ---------------------------------------------------------------------------
let backendState: 'unknown' | 'present' | 'missing' = 'unknown';

/** Returns true once a request proved `/api/browse` is not served by this host. */
export function isBrowseBackendMissing(): boolean {
  return backendState === 'missing';
}

export function markBrowseBackend(state: 'present' | 'missing'): void {
  backendState = state;
}

// ---------------------------------------------------------------------------
// Shared page chrome
// ---------------------------------------------------------------------------
const PAGE_CSS = `
  body { margin: 0; font-family: 'Segoe UI', Roboto, Arial, sans-serif; background: #fff; color: #202124; line-height: 1.55; }
  .sw-bar { position: sticky; top: 0; z-index: 9; display: flex; gap: 8px; align-items: center; background: #f1f3f4; border-bottom: 1px solid #dadce0; padding: 6px 12px; font-size: 11.5px; color: #5f6368; }
  .sw-bar b { color: #188038; }
  .sw-bar a { color: #1a73e8; text-decoration: none; margin-left: auto; }
  main { max-width: 820px; margin: 0 auto; padding: 14px 20px 40px; }
  h1 { font-size: 24px; font-weight: 600; margin: 8px 0 12px; font-family: Georgia, 'Times New Roman', serif; }
  a { color: #1a0dab; }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; max-width: 100%; }
  .infobox { float: right; clear: right; margin: 0 0 12px 16px; border: 1px solid #a2a9b1; background: #f8f9fa; font-size: 12px; max-width: 290px; }
  .infobox td, .infobox th { padding: 3px 6px; vertical-align: top; }
  .thumb, figure { margin: 8px 0; font-size: 12px; color: #54595d; }
  .mw-editsection, .reference, .noprint, .navbox, .mw-empty-elt, .metadata, .ambox, .hatnote + .hatnote { display: none !important; }
  .hatnote { font-style: italic; color: #54595d; font-size: 13px; }
  .result { margin: 0 0 18px; }
  .result a.t { font-size: 18px; color: #1a0dab; text-decoration: none; }
  .result a.t:hover { text-decoration: underline; }
  .result .u { color: #188038; font-size: 12.5px; }
  .result .s { font-size: 13.5px; color: #4d5156; }
  .searchmatch { font-weight: 700; }
  .pill { display: inline-block; margin: 4px 6px 4px 0; padding: 7px 14px; border-radius: 999px; border: 1px solid #dadce0; background: #fff; color: #1a73e8; text-decoration: none; font-size: 13px; font-weight: 600; }
  .pill:hover { background: #f1f3f4; }
  .reader pre { white-space: pre-wrap; word-break: break-word; font-family: inherit; font-size: 14px; }
  form.sw-search { display: flex; gap: 8px; margin: 6px 0 18px; }
  form.sw-search input { flex: 1; padding: 9px 14px; border: 1px solid #dfe1e5; border-radius: 999px; font-size: 14px; }
  form.sw-search button { padding: 8px 16px; border: none; border-radius: 999px; background: #1a73e8; color: #fff; font-weight: 600; cursor: pointer; }
`;

function wrapPage(opts: { title: string; baseHref?: string; via: string; sourceUrl: string; body: string }): string {
  const base = opts.baseHref ? `<base href="${esc(opts.baseHref)}" target="_self">` : '';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${base}<title>${esc(opts.title)}</title><style>${PAGE_CSS}</style></head><body>
<div class="sw-bar">🌐 <b>Live Web</b> · ${esc(opts.via)}<a href="${esc(opts.sourceUrl)}">${esc(opts.sourceUrl.slice(0, 70))}</a></div>
<main>${opts.body}</main></body></html>`;
}

function searchShortcuts(query: string): string {
  const q = encodeURIComponent(query);
  return `<div style="margin:10px 0 18px;">
    <a class="pill" href="https://lite.duckduckgo.com/lite/?q=${q}">🦆 Search the web (DuckDuckGo)</a>
    <a class="pill" href="https://www.bing.com/search?q=${q}">🔎 Bing</a>
    <a class="pill" href="https://en.wiktionary.org/wiki/${encodeURIComponent(query.trim().replace(/\s+/g, '_'))}">📖 Wiktionary</a>
    <a class="pill" href="ai://${esc(query)}">✨ Build it with AI Web</a>
  </div>`;
}

function searchForm(query: string, wikiHost: string): string {
  return `<form class="sw-search" action="https://${esc(wikiHost)}/w/index.php" method="get">
    <input name="search" value="${esc(query)}" placeholder="Search Wikipedia or type a URL" />
    <button type="submit">Search</button>
  </form>`;
}

// ---------------------------------------------------------------------------
// 1. Wikipedia via MediaWiki Action API (sends Access-Control-Allow-Origin: *)
// ---------------------------------------------------------------------------
function parseWikipediaTarget(u: URL): { host: string; title?: string; search?: string } | null {
  if (!/(^|\.)wikipedia\.org$/i.test(u.hostname)) return null;
  // Normalise mobile hosts (en.m.wikipedia.org -> en.wikipedia.org)
  const host = u.hostname.replace(/\.m\.wikipedia\.org$/i, '.wikipedia.org').replace(/^wikipedia\.org$/i, 'en.wikipedia.org').replace(/^www\.wikipedia\.org$/i, 'en.wikipedia.org');
  const search = u.searchParams.get('search') || (u.pathname.startsWith('/wiki/Special:Search') ? u.searchParams.get('search') || decodeURIComponent(u.pathname.split('/').slice(3).join('/')) : '');
  if (search) return { host, search };
  const titleParam = u.searchParams.get('title');
  if (titleParam) return { host, title: titleParam };
  if (u.pathname.startsWith('/wiki/')) {
    const title = decodeURIComponent(u.pathname.slice('/wiki/'.length)).replace(/_/g, ' ');
    return { host, title: title || 'Main Page' };
  }
  return { host, title: 'Main Page' };
}

async function wikiApi(host: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params });
  const resp = await timedFetch(`https://${host}/w/api.php?${qs.toString()}`);
  if (!resp.ok) throw new Error(`Wikipedia API HTTP ${resp.status}`);
  return resp.json();
}

async function loadWikipediaArticle(host: string, title: string): Promise<StaticWebResult | null> {
  const data = await wikiApi(host, { action: 'parse', page: title, redirects: '1', prop: 'text|displaytitle', disableeditsection: '1', disabletoc: '1' });
  if (data?.error || !data?.parse) return null;
  const realTitle: string = data.parse.title || title;
  const pageUrl = `https://${host}/wiki/${encodeURIComponent(realTitle.replace(/ /g, '_'))}`;
  const displayTitle: string = data.parse.displaytitle || esc(realTitle);
  const body = `${searchForm('', host)}<h1>${displayTitle}</h1>${data.parse.text || ''}`;
  return {
    ok: true,
    html: wrapPage({ title: `${realTitle} - Wikipedia`, baseHref: pageUrl, via: 'Wikipedia API (static mode)', sourceUrl: pageUrl, body }),
    finalUrl: pageUrl,
    title: realTitle,
    via: 'wikipedia',
  };
}

async function loadWikipediaSearch(host: string, query: string, sourceUrl: string): Promise<StaticWebResult> {
  // "Go" behaviour: exact/redirected title match opens the article directly.
  try {
    const exact = await wikiApi(host, { action: 'query', titles: query, redirects: '1' });
    const page = exact?.query?.pages?.[0];
    if (page && !page.missing && !page.invalid && page.title) {
      const article = await loadWikipediaArticle(host, page.title);
      if (article) return article;
    }
  } catch {
    /* fall through to full-text search */
  }

  const data = await wikiApi(host, { action: 'query', list: 'search', srsearch: query, srlimit: '20', srinfo: 'suggestion|totalhits', srprop: 'snippet|timestamp|wordcount' });
  const hits: any[] = data?.query?.search || [];
  const suggestion: string | undefined = data?.query?.searchinfo?.suggestion;
  const total: number = data?.query?.searchinfo?.totalhits || hits.length;

  const results = hits
    .map((h) => {
      const href = `https://${host}/wiki/${encodeURIComponent(String(h.title).replace(/ /g, '_'))}`;
      return `<div class="result"><a class="t" href="${esc(href)}">${esc(h.title)}</a><div class="u">${esc(host)} › wiki › ${esc(h.title)}</div><div class="s">${h.snippet || ''}…</div></div>`;
    })
    .join('');

  const suggestHtml = suggestion
    ? `<p>Did you mean: <a href="https://${esc(host)}/w/index.php?search=${encodeURIComponent(suggestion)}"><b><i>${esc(suggestion)}</i></b></a>?</p>`
    : '';

  const body = hits.length
    ? `${searchForm(query, host)}<p style="color:#70757a;font-size:12.5px;">About ${total.toLocaleString()} results for <b>${esc(query)}</b></p>${suggestHtml}${searchShortcuts(query)}${results}`
    : `${searchForm(query, host)}<h1 style="font-family:inherit;font-size:20px;">No Wikipedia articles matched “${esc(query)}”</h1>${suggestHtml}
       <p style="color:#5f6368;">The search ran live, it just found nothing. Try different spelling, or search the wider web:</p>${searchShortcuts(query)}`;

  return {
    ok: true,
    html: wrapPage({ title: `${query} - Search`, via: 'Wikipedia Search API (static mode)', sourceUrl, body }),
    finalUrl: sourceUrl,
    title: `${query} - Search`,
    via: 'wikipedia-search',
  };
}

// ---------------------------------------------------------------------------
// 2-4. Generic pages: direct CORS fetch -> CORS relays -> reader view
// ---------------------------------------------------------------------------
const HTML_RELAYS: Array<{ name: string; build: (u: string) => string }> = [
  { name: 'AllOrigins relay', build: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}` },
  { name: 'corsproxy.io relay', build: (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}` },
  { name: 'CodeTabs relay', build: (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}` },
  { name: 'ThingProxy relay', build: (u) => `https://thingproxy.freeboard.io/fetch/${u}` },
];

function sanitiseRemoteHtml(raw: string, finalUrl: string): { html: string; title: string } {
  let html = raw.replace(/<meta\b[^>]*http-equiv\s*=\s*["']?(?:Content-Security-Policy|X-Frame-Options|refresh)[^>]*>/gi, '');
  html = html.replace(/<base\b[^>]*>/gi, '');
  const baseTag = `<base href="${esc(finalUrl)}" target="_self">`;
  if (/<head\b[^>]*>/i.test(html)) html = html.replace(/<head\b[^>]*>/i, (m) => `${m}${baseTag}`);
  else if (/<html\b[^>]*>/i.test(html)) html = html.replace(/<html\b[^>]*>/i, (m) => `${m}<head>${baseTag}</head>`);
  else html = `<!DOCTYPE html><html><head>${baseTag}</head><body>${html}</body></html>`;
  const t = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || '';
  return { html, title: t };
}

function looksLikeHtml(text: string, contentType: string): boolean {
  return contentType.includes('html') || /<(?:!doctype|html|head|body)\b/i.test(text.slice(0, 2000));
}

function textToPage(text: string, finalUrl: string, via: string): StaticWebResult {
  const t = text.slice(0, 400000);
  const title = t.match(/^Title:\s*(.+)$/m)?.[1]?.trim() || finalUrl;
  const content = (t.split(/^Markdown Content:\s*$/m)[1] ?? t).trim();
  // Minimal markdown: links, images, headings, bold.
  const rendered = esc(content)
    .replace(/!\[([^\]]*)\]\((https?:[^)\s]+)\)/g, '<img alt="$1" src="$2" style="max-width:100%;">')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/^#{1,2}\s+(.+)$/gm, '<h2>$1</h2>')
    .replace(/^#{3,6}\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  return {
    ok: true,
    html: wrapPage({ title, baseHref: finalUrl, via, sourceUrl: finalUrl, body: `<h1>${esc(title)}</h1><div class="reader"><pre>${rendered}</pre></div>` }),
    finalUrl,
    title,
    via: 'reader',
  };
}

async function tryHtmlFetch(fetchUrl: string, finalUrl: string, via: string): Promise<StaticWebResult | null> {
  const resp = await timedFetch(fetchUrl);
  if (!resp.ok) return null;
  const ct = (resp.headers.get('content-type') || '').toLowerCase();
  if (ct.startsWith('image/')) {
    return {
      ok: true,
      html: `<!DOCTYPE html><html><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh;"><img src="${esc(finalUrl)}" style="max-width:100%;max-height:100vh;"></body></html>`,
      finalUrl,
      title: finalUrl,
      via,
    };
  }
  const text = await resp.text();
  if (!text || text.length < 40) return null;
  if (!looksLikeHtml(text, ct)) {
    return {
      ok: true,
      html: `<!DOCTYPE html><html><head><title>${esc(finalUrl)}</title></head><body style="font-family:monospace;white-space:pre-wrap;padding:16px;">${esc(text.slice(0, 400000))}</body></html>`,
      finalUrl,
      title: finalUrl,
      via,
    };
  }
  const { html, title } = sanitiseRemoteHtml(text, finalUrl);
  const barCss = `<style>.__aos_sw_bar{position:fixed;right:8px;bottom:8px;z-index:2147483647;background:rgba(32,33,36,.85);color:#fff;font:11px Segoe UI,Arial,sans-serif;padding:4px 9px;border-radius:999px;pointer-events:none;}</style>`;
  const badge = `${barCss}<div class="__aos_sw_bar">🌐 Live Web · ${esc(via)}</div>`;
  const withBadge = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${badge}</body>`) : html + badge;
  return { ok: true, html: withBadge, finalUrl, title: title || finalUrl, via };
}

/**
 * Loads a real web page entirely from the browser, without the Express backend.
 */
export async function fetchLivePageClientSide(url: string, onProgress?: (msg: string) => void): Promise<StaticWebResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, html: '', finalUrl: url, title: url, via: 'none', error: 'Invalid URL' };
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    return { ok: false, html: '', finalUrl: url, title: url, via: 'none', error: `Unsupported protocol ${parsed.protocol}` };
  }

  const errors: string[] = [];

  // 1. Wikipedia
  const wiki = parseWikipediaTarget(parsed);
  if (wiki) {
    try {
      onProgress?.('Querying Wikipedia API…');
      if (wiki.search) return await loadWikipediaSearch(wiki.host, wiki.search, url);
      const article = await loadWikipediaArticle(wiki.host, wiki.title || 'Main Page');
      if (article) return article;
      return await loadWikipediaSearch(wiki.host, wiki.title || '', url);
    } catch (e: any) {
      errors.push(`Wikipedia API: ${e?.message || e}`);
    }
  }

  // 2. Direct CORS fetch (works for CORS-enabled hosts)
  try {
    onProgress?.('Trying direct connection…');
    const direct = await tryHtmlFetch(url, url, 'direct connection');
    if (direct) return direct;
  } catch (e: any) {
    errors.push(`direct: ${e?.name === 'AbortError' ? 'timeout' : 'blocked by CORS'}`);
  }

  // 3. Public CORS relays
  for (const relay of HTML_RELAYS) {
    try {
      onProgress?.(`Routing through ${relay.name}…`);
      const res = await tryHtmlFetch(relay.build(url), url, relay.name);
      if (res) return res;
      errors.push(`${relay.name}: empty/blocked response`);
    } catch (e: any) {
      errors.push(`${relay.name}: ${e?.name === 'AbortError' ? 'timeout' : e?.message || 'failed'}`);
    }
  }

  // 4. Reader view relay
  try {
    onProgress?.('Opening Reader View relay…');
    const resp = await timedFetch(`https://r.jina.ai/${url}`, { headers: { Accept: 'text/plain' } }, 12000);
    if (resp.ok) {
      const text = await resp.text();
      if (text && text.length > 40) return textToPage(text, url, 'Reader View relay');
    }
    errors.push(`Reader View: HTTP ${resp.status}`);
  } catch (e: any) {
    errors.push(`Reader View: ${e?.name === 'AbortError' ? 'timeout' : e?.message || 'failed'}`);
  }

  return { ok: false, html: '', finalUrl: url, title: url, via: 'none', error: errors.join(' · ') || 'All static Live Web routes failed' };
}
