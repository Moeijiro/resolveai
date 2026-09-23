/**
 * One fetch wrapper for the dashboard. The session is an HttpOnly cookie, so
 * requests only need `credentials: "include"`; no API key ever lives here.
 */

import type {
  Answer,
  ApiKey,
  Article,
  ArticleSummary,
  ConversationPage,
  CreatedApiKey,
  KnowledgeBase,
  Overview,
  User,
  WidgetConfig,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string; fields?: { field: string; message: string }[] };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = init.body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: init.body && !isForm ? { "Content-Type": "application/json" } : undefined,
    cache: "no-store",
    ...init,
  });
  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const body = payload as ErrorBody | null;
    const fields = body?.error?.fields?.map((f) => `${f.field}: ${f.message}`).join("; ");
    throw new ApiError(response.status, body?.error?.code ?? "error", fields || body?.error?.message || response.statusText);
  }
  return payload as T;
}

function query(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

const json = (body: unknown) => JSON.stringify(body);

export const api = {
  config: () => request<{ registration_enabled: boolean; ai_provider: string }>("/api/auth/config"),
  me: () => request<User>("/api/me"),
  login: (email: string, password: string) =>
    request<User>("/api/auth/login", { method: "POST", body: json({ email, password }) }),
  register: (email: string, password: string, name?: string) =>
    request<User>("/api/auth/register", { method: "POST", body: json({ email, password, name: name || null }) }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),

  overview: () => request<Overview>("/api/overview"),

  knowledgeBases: () => request<KnowledgeBase[]>("/api/knowledge-bases"),
  knowledgeBase: (id: number) => request<KnowledgeBase>(`/api/knowledge-bases/${id}`),
  createKnowledgeBase: (name: string, description?: string) =>
    request<KnowledgeBase>("/api/knowledge-bases", { method: "POST", body: json({ name, description: description || null }) }),
  updateKnowledgeBase: (id: number, body: Partial<{ name: string; description: string | null; status: "active" | "paused" }>) =>
    request<KnowledgeBase>(`/api/knowledge-bases/${id}`, { method: "PATCH", body: json(body) }),
  deleteKnowledgeBase: (id: number) => request<void>(`/api/knowledge-bases/${id}`, { method: "DELETE" }),

  articles: (kbId: number, params: { q?: string; category?: string } = {}) =>
    request<ArticleSummary[]>(`/api/knowledge-bases/${kbId}/articles${query(params)}`),
  allArticles: (q?: string) => request<ArticleSummary[]>(`/api/articles${query({ q })}`),
  article: (id: number) => request<Article>(`/api/articles/${id}`),
  createArticle: (kbId: number, body: { title: string; content: string; category?: string | null }) =>
    request<Article>(`/api/knowledge-bases/${kbId}/articles`, { method: "POST", body: json(body) }),
  updateArticle: (id: number, body: Partial<{ title: string; content: string; category: string | null }>) =>
    request<Article>(`/api/articles/${id}`, { method: "PATCH", body: json(body) }),
  deleteArticle: (id: number) => request<void>(`/api/articles/${id}`, { method: "DELETE" }),
  uploadArticle: (kbId: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<Article>(`/api/knowledge-bases/${kbId}/upload`, { method: "POST", body: form });
  },

  chat: (knowledgeBaseId: number, question: string) =>
    request<Answer>("/api/chat", { method: "POST", body: json({ knowledge_base_id: knowledgeBaseId, question }) }),
  conversations: (params: { limit?: number; offset?: number; status?: string; knowledge_base_id?: number; channel?: string } = {}) =>
    request<ConversationPage>(`/api/conversations${query(params)}`),
  unresolved: (limit = 50) => request<ConversationPage>(`/api/unresolved${query({ limit })}`),

  widget: (kbId: number) => request<WidgetConfig>(`/api/knowledge-bases/${kbId}/widget`),
  saveWidget: (kbId: number, body: Partial<WidgetConfig>) =>
    request<WidgetConfig>(`/api/knowledge-bases/${kbId}/widget`, { method: "PUT", body: json(body) }),

  keys: () => request<ApiKey[]>("/api/keys"),
  createKey: (name: string) => request<CreatedApiKey>("/api/keys", { method: "POST", body: json({ name }) }),
  revokeKey: (id: number) => request<ApiKey>(`/api/keys/${id}/revoke`, { method: "POST" }),
  deleteKey: (id: number) => request<void>(`/api/keys/${id}`, { method: "DELETE" }),
};
