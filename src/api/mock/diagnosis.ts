import type { PlantDiagnosis } from '../types';

const DIAGNOSIS_POOL: PlantDiagnosis[] = [
  {
    diagnostico: 'Deficiência de nitrogênio',
    confianca: 88,
    causa: 'Amarelamento das folhas mais velhas indica falta de nitrogênio no solo, comum em canteiros muito colhidos.',
    recomendacoes: [
      'Aplique húmus de minhoca ou composto rico em nitrogênio na base da planta.',
      'Faça uma adubação foliar com biofertilizante diluído a cada 15 dias.',
      'Mantenha cobertura morta (mulch) para reter nutrientes no solo.',
    ],
    urgencia: 'média',
  },
  {
    diagnostico: 'Infestação de pulgões',
    confianca: 82,
    causa: 'Pequenos insetos verdes na parte de baixo das folhas, sugando a seiva e deformando os brotos novos.',
    recomendacoes: [
      'Borrife calda de sabão neutro (1 colher por litro de água) no fim da tarde.',
      'Introduza joaninhas ou plante calêndula por perto como controle biológico.',
      'Repita a aplicação a cada 3 dias até o controle total.',
    ],
    urgencia: 'alta',
  },
  {
    diagnostico: 'Excesso de rega (encharcamento)',
    confianca: 79,
    causa: 'Folhas murchas com solo encharcado sugerem raízes sufocadas por falta de drenagem.',
    recomendacoes: [
      'Suspenda a rega até o solo secar alguns centímetros na superfície.',
      'Melhore a drenagem adicionando areia grossa ou perlita ao substrato.',
      'Regue apenas pela manhã, verificando a umidade com o dedo antes.',
    ],
    urgencia: 'média',
  },
  {
    diagnostico: 'Oídio (fungo branco)',
    confianca: 85,
    causa: 'Manchas brancas pulverulentas nas folhas, favorecidas por umidade alta e pouca ventilação.',
    recomendacoes: [
      'Remova e descarte as folhas mais afetadas para conter o avanço.',
      'Pulverize calda de bicarbonato de sódio (1 colher de chá por litro).',
      'Aumente o espaçamento entre as plantas para melhorar a circulação de ar.',
    ],
    urgencia: 'média',
  },
  {
    diagnostico: 'Planta saudável',
    confianca: 94,
    causa: 'Folhagem verde e vigorosa, sem sinais de pragas, doenças ou deficiências nutricionais.',
    recomendacoes: [
      'Mantenha a rega regular pela manhã, conforme a necessidade da espécie.',
      'Faça adubação de manutenção mensal com composto orgânico.',
      'Continue monitorando semanalmente para identificar problemas cedo.',
    ],
    urgencia: 'baixa',
  },
];

/** Pick a diagnosis deterministically from the image payload length. */
export function pickMockDiagnosis(imageBase64: string): PlantDiagnosis {
  return DIAGNOSIS_POOL[imageBase64.length % DIAGNOSIS_POOL.length];
}
