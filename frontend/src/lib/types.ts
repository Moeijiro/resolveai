/** Mirrors the Pydantic schemas served by the FastAPI backend. */

export interface User {
  id: number;
  email: string;
  name: string | null;
  is_demo: boolean;
  created_at: string;
}

export interface KnowledgeBase {
  id: number;
  name: string;
  description: string | null;
  status: "active" | "paused";
  public_id: string;
  created_at: string;
  updated_at: string;
  article_count: number;
  categories: string[];
  last_article_update: string | null;
  questions: number;
  unresolved: number;
}

export interface Article {
  id: number;
  knowledge_base_id: number;
  title: string;
  content: string;
  category: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface ArticleSummary {
  id: number;
  knowledge_base_id: number;
  title: string;
  category: string | null;
  source: string;
  excerpt: string;
  created_at: string;
  updated_at: string;
}

export interface Source {
  id: number;
  title: string;
  score?: number | null;
}

export interface Answer {
  answer: string;
  sources: Source[];
  status: "answered" | "unresolved" | "error";
  confidence: number;
  response_ms: number;
  conversation_id: number | null;
  provider: string;
}

export interface Conversation {
  id: number;
  knowledge_base_id: number;
  knowledge_base_name: string | null;
  channel: "preview" | "widget" | "api";
  question: string;
  answer: string | null;
  sources: Source[];
  status: "answered" | "unresolved" | "error";
  confidence: number | null;
  provider: string;
  response_ms: number | null;
  error: string | null;
  created_at: string;
}

export interface ConversationPage {
  items: Conversation[];
  total: number;
  limit: number;
  offset: number;
}

export interface Overview {
  knowledge_bases: number;
  articles: number;
  questions_total: number;
  questions_today: number;
  answered: number;
  unresolved: number;
  errors: number;
  answer_rate: number | null;
  avg_response_ms: number | null;
  series: { day: string; answered: number; unresolved: number; error: number }[];
  top_articles: { id: number; title: string; uses: number }[];
}

export interface WidgetConfig {
  title: string;
  welcome_message: string;
  accent_color: string;
  position: "bottom-right" | "bottom-left";
  allowed_domains: string[];
  enabled: boolean;
  public_id: string;
  embed_code: string;
}

export interface ApiKey {
  id: number;
  name: string;
  prefix: string;
  enabled: boolean;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export interface CreatedApiKey extends ApiKey {
  key: string;
  warning: string;
}
