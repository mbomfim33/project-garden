// ─── Profile ───────────────────────────────────────────────────────────
export interface GardenProfile {
  city: string;
  propertyType: string;
  residents: number;
  area: number;
  sun: string;
  goals: string[];
  budget: string;
  weeklyTime: string;
  experience: string;
  composting: string;
  plants: string;
  photo?: string | null;
}

export interface SizePreset {
  icon: string;
  name: string;
  desc: string;
  eco: string;
  m2: number;
  plants: string;
}

// ─── Project ───────────────────────────────────────────────────────────
export type ZoneType =
  | 'horta'
  | 'frutas'
  | 'aromas'
  | 'flores'
  | 'composteira'
  | 'lazer'
  | 'caminho';

export type PlantType = 'alimento' | 'aroma' | 'flor' | 'fruta';

export interface GardenZone {
  nome: string;
  tipo: ZoneType;
  descricao: string;
}

export interface PlantRecommendation {
  nome: string;
  emoji: string;
  tipo: PlantType;
  detalhe: string;
  ciclo: string;
}

export interface GardenProject {
  titulo: string;
  intro: string;
  zonas: GardenZone[];
  plantas: PlantRecommendation[];
}

// ─── Schedule ──────────────────────────────────────────────────────────
export type TimelineType = 'plantar' | 'colher' | 'cuidar';

export interface TimelineItem {
  mes: string;
  tipo: TimelineType;
  titulo: string;
  descricao: string;
}

// ─── Diagnosis ─────────────────────────────────────────────────────────
export type Urgency = 'baixa' | 'média' | 'alta';

export interface PlantDiagnosis {
  diagnostico: string;
  confianca: number;
  causa: string;
  recomendacoes: string[];
  urgencia: Urgency;
}

// ─── Chat ──────────────────────────────────────────────────────────────
export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

// ─── Catalog ───────────────────────────────────────────────────────────
export interface Product {
  id: string;
  emoji: string;
  name: string;
  description: string;
  price: number;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  featured: boolean;
  features: string[];
  ctaLabel: string;
  outlineCta: boolean;
}

export interface CommunityEntry {
  rank: number;
  name: string;
  detail: string;
  savings: number;
  medal?: string;
}

// ─── Derived ───────────────────────────────────────────────────────────
export interface EcoSummary {
  ecoMin: number;
  ecoMax: number;
  ecoMid: number;
  valorizacao: string;
  itens: string;
  roi: string;
}

export interface GardenAlert {
  type: 'warn' | 'info' | 'success';
  icon: string;
  title?: string;
  text: string;
}
