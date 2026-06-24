import type { ChatMessage, GardenProfile } from '../types';

interface ChatRule {
  keywords: string[];
  answer: string;
}

const RULES: ChatRule[] = [
  {
    keywords: ['amarel', 'alface'],
    answer:
      'Folhas amarelando geralmente indicam falta de nitrogênio ou excesso de água. ' +
      'Verifique se o solo está encharcado e reduza a rega se necessário. ' +
      'Reforce a nutrição com húmus de minhoca ou um biofertilizante diluído a cada 15 dias. ' +
      'Se o amarelamento começar pelas folhas mais velhas, é quase certo que seja nitrogênio. 🌱',
  },
  {
    keywords: ['inverno', 'frio'],
    answer:
      'No inverno brasileiro, aposte em folhosas e raízes que gostam de clima ameno: ' +
      'alface, rúcula, couve, espinafre, cenoura, beterraba, ervilha e brócolis. ' +
      'Temperos como salsa, cebolinha e coentro também vão bem. ' +
      'Proteja as mudas de geadas em regiões mais frias e prefira o plantio em locais com boa luz. ❄️🥬',
  },
  {
    keywords: ['compost', 'adubo'],
    answer:
      'Compostagem é simples: alterne camadas de restos verdes (cascas, folhas, borra de café) com ' +
      'restos secos (folhas secas, papelão picado). Mantenha úmido como uma esponja e revolva a cada 1–2 semanas. ' +
      'Evite carnes, laticínios e óleos. Em 2–3 meses você terá um adubo escuro e cheiroso para o jardim. ♻️',
  },
  {
    keywords: ['pouco sol', 'sombra', 'meia-sombra', 'meia sombra'],
    answer:
      'Para áreas com pouca luz, as melhores escolhas são hortelã, salsa, cebolinha, couve, alface e espinafre — ' +
      'todas toleram meia-sombra. Folhas comestíveis costumam aceitar menos sol do que frutos e raízes. ' +
      'Vasos móveis ajudam a perseguir as poucas horas de luz ao longo do dia. 🌿',
  },
  {
    keywords: ['pulg', 'praga', 'inseto'],
    answer:
      'Contra pulgões, borrife calda de sabão neutro (1 colher por litro de água) no fim da tarde, repetindo a cada 3 dias. ' +
      'Plantar calêndula e atrair joaninhas faz um ótimo controle biológico. ' +
      'Evite excesso de adubo nitrogenado, que deixa os brotos mais atrativos para as pragas. 🐞',
  },
  {
    keywords: ['regar', 'rega', 'água', 'tomate'],
    answer:
      'O tomate gosta de rega regular e profunda, de preferência pela manhã, mantendo o solo úmido mas nunca encharcado. ' +
      'No calor, regue 1x ao dia; em clima ameno, dias alternados. ' +
      'Molhe a base, não as folhas, para evitar fungos, e use cobertura morta para conservar a umidade. 💧🍅',
  },
];

/** Helpful canned reply for the latest user turn, with a profile-aware fallback. */
export function answerMockChat(history: ChatMessage[], profile: GardenProfile): string {
  const lastUser = [...history].reverse().find((m) => m.role === 'user');
  const text = (lastUser?.content ?? '').toLowerCase();

  for (const rule of RULES) {
    if (rule.keywords.some((k) => text.includes(k))) return rule.answer;
  }

  const city = profile.city.split(',')[0].trim() || 'sua região';
  return (
    `Ótima pergunta! Para o seu jardim de ${profile.area} m² em ${city} (${profile.sun.toLowerCase()}), ` +
    'o ideal é começar com plantas adaptadas à sua luz e fáceis de manter. ' +
    'Conte um pouco mais sobre o que pretende cultivar — alimentos, temperos, frutas ou flores — ' +
    'que eu monto recomendações específicas para o seu espaço e clima. 🌿\n\n' +
    '(Esta é uma resposta simulada — conecte o backend de IA para respostas reais.)'
  );
}
