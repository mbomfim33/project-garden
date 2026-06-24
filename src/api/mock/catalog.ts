import type { CommunityEntry, Plan, Product } from '../types';

export const MOCK_PLANS: Plan[] = [
  {
    id: 'digital',
    name: 'Digital',
    price: 14.9,
    period: '/mês',
    featured: false,
    outlineCta: true,
    ctaLabel: 'Começar grátis por 7 dias',
    features: [
      'IA completa + projeto personalizado',
      'Planejamento e cronograma',
      'Diagnóstico por foto',
      'Conteúdo educacional',
      'Acesso à comunidade',
    ],
  },
  {
    id: 'familia',
    name: 'Família 🌟',
    price: 49.9,
    period: '/mês',
    featured: true,
    outlineCta: false,
    ctaLabel: 'Assinar agora',
    features: [
      'Tudo do plano Digital',
      'Envio trimestral de sementes selecionadas',
      'Mudas sazonais',
      'Biofertilizantes orgânicos',
      'Calendário físico de plantio',
      'Kits sazonais surpresa',
    ],
  },
];

export const MOCK_PRODUCTS: Product[] = [
  { id: 'kit-sementes-temperos', emoji: '🌱', name: 'Kit Sementes Temperos', description: '10 variedades: manjericão, coentro, salsinha, cebolinha e mais', price: 29.9 },
  { id: 'composteira-domestica', emoji: '🪱', name: 'Composteira Doméstica', description: '20L, com minhocas californianas. Transforma resíduos em adubo.', price: 149.0 },
  { id: 'kit-irrigacao-gotejamento', emoji: '💧', name: 'Kit Irrigação por Gotejamento', description: 'Para até 30 plantas. Economiza 60% de água.', price: 89.0 },
  { id: 'humus-minhoca-premium', emoji: '🌿', name: 'Húmus de Minhoca Premium', description: '5kg. Substitui adubos químicos. Rico em NPK natural.', price: 39.9 },
];

export const MOCK_COMMUNITY: CommunityEntry[] = [
  { rank: 1, medal: '🥇', name: 'Ana Claudia — SP', detail: 'Jardim 80m² · 147 kg produzidos', savings: 6800 },
  { rank: 2, medal: '🥈', name: 'Família Souza — MG', detail: 'Jardim 60m² · 98 kg produzidos', savings: 4200 },
  { rank: 3, medal: '🥉', name: 'Roberto — RS', detail: 'Jardim 45m² · 76 kg produzidos', savings: 3100 },
  { rank: 4, name: 'Condomínio Verde — RJ', detail: 'Horta comunitária 120m²', savings: 9400 },
  { rank: 5, name: 'Mariana — PR', detail: 'Jardim 30m² · iniciante', savings: 1900 },
];
