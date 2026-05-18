export type Severity = "low" | "medium" | "high";

export interface RiskItem {
  code: string;
  severity: Severity;
  message: string;
  excerpt: string | null;
  policy_hint: string | null;
}

export interface CriticOutput {
  risks: RiskItem[];
  summary: string;
  human_review_required: boolean;
}

export interface EditorOutput {
  revised_title: string;
  revised_description: string;
  changelog: string[];
  remaining_risks: string[];
}

export interface ArbiterOutput {
  decision: "approved" | "needs_revision" | "rejected";
  reasoning: string;
  final_title: string;
  final_description: string;
  human_review_required: boolean;
  consensus_notes: string[];
}

export interface GeoLaw {
  code: string;
  name: string;
  relevant_articles: string[];
  url: string;
  note: string;
}

export interface GeoRegulation {
  region: string;
  region_name: string;
  flag_emoji: string;
  applicable_laws: GeoLaw[];
  compliance_score: number;
  risk_summary: string;
  recommendations: string[];
}

export interface TokenUsage {
  critic_tokens: number;
  editor_tokens: number;
  arbiter_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
}

export interface PipelineStep {
  step: string;
  label: string;
  status: "pending" | "running" | "done" | "skipped" | "error";
  duration_ms: number;
  message: string;
}

export interface ApiResponse {
  mode: "llm" | "mock";
  critic: CriticOutput;
  editor: EditorOutput;
  arbiter: ArbiterOutput | null;
  geo_regulations: GeoRegulation[];
  policy_snippets_used: string[];
  token_usage: TokenUsage | null;
  pipeline_steps: PipelineStep[];
  overall_compliance_score: number;
  error_message?: string | null;
}

