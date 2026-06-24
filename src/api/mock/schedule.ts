import type { GardenProfile, TimelineItem, TimelineType } from '../types';

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface TimelineSeed {
  offset: number;
  tipo: TimelineType;
  titulo: string;
  descricao: string;
}

const SEEDS: TimelineSeed[] = [
  { offset: 0, tipo: 'plantar', titulo: 'Preparo de canteiros e folhosas', descricao: 'Prepare o solo com composto orgânico e plante alface, rúcula e couve.' },
  { offset: 1, tipo: 'plantar', titulo: 'Temperos e aromáticas', descricao: 'Plante manjericão, cebolinha e salsa próximos à cozinha para uso diário.' },
  { offset: 2, tipo: 'cuidar', titulo: 'Controle preventivo de pragas', descricao: 'Inspecione as folhas, aplique calda natural e mantenha a rega regular pela manhã.' },
  { offset: 3, tipo: 'colher', titulo: 'Primeira colheita de folhosas', descricao: 'Colha alface e rúcula no início da manhã para mais frescor.' },
  { offset: 4, tipo: 'plantar', titulo: 'Frutíferas e morangos', descricao: 'Plante mudas de morango e frutíferas compactas em vasos ou canteiros.' },
  { offset: 5, tipo: 'cuidar', titulo: 'Adubação de cobertura', descricao: 'Reforce com húmus de minhoca e mantenha cobertura morta (mulch) no solo.' },
  { offset: 6, tipo: 'colher', titulo: 'Colheita de temperos', descricao: 'Colha manjericão e cebolinha deixando parte da planta para rebrotar.' },
  { offset: 7, tipo: 'plantar', titulo: 'Rotação de cultura', descricao: 'Replante folhosas em novos canteiros para preservar a saúde do solo.' },
  { offset: 8, tipo: 'colher', titulo: 'Colheita de frutas', descricao: 'Comece a colher os primeiros morangos maduros e avalie a produção.' },
];

/** ~9-month planting/harvest timeline starting from `startDate` (defaults to today). */
export function buildMockSchedule(
  profile: GardenProfile,
  startDate: Date = new Date(),
): TimelineItem[] {
  const startMonth = startDate.getMonth();
  const first = SEEDS[0];
  const tailored: TimelineSeed = {
    ...first,
    descricao: `Em ${profile.city.split(',')[0].trim()}, prepare o solo com composto e plante folhosas de ciclo curto (${profile.plants.split(',')[0].trim()}).`,
  };
  const seeds = [tailored, ...SEEDS.slice(1)];
  return seeds.map((s) => ({
    mes: MONTHS_PT[(startMonth + s.offset) % 12],
    tipo: s.tipo,
    titulo: s.titulo,
    descricao: s.descricao,
  }));
}
