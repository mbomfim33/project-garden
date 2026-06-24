import type {
  GardenProfile,
  GardenProject,
  GardenZone,
  PlantRecommendation,
} from '../types';

interface PoolPlant extends PlantRecommendation {
  sun: ('pleno' | 'parcial' | 'sombra')[];
}

const PLANT_POOL: PoolPlant[] = [
  { nome: 'Alface', emoji: '🥬', tipo: 'alimento', detalhe: 'Folhosa de ciclo curto, colhe em 40–60 dias', ciclo: 'Ciclo curto', sun: ['pleno', 'parcial'] },
  { nome: 'Rúcula', emoji: '🥬', tipo: 'alimento', detalhe: 'Pronta para colher em ~30 dias', ciclo: 'Ciclo curto', sun: ['pleno', 'parcial'] },
  { nome: 'Couve', emoji: '🥬', tipo: 'alimento', detalhe: 'Colheita contínua de folhas o ano todo', ciclo: 'Perene', sun: ['parcial', 'sombra'] },
  { nome: 'Espinafre', emoji: '🥬', tipo: 'alimento', detalhe: 'Folhosa nutritiva que tolera meia-sombra', ciclo: 'Ciclo médio', sun: ['parcial', 'sombra'] },
  { nome: 'Coentro', emoji: '🌿', tipo: 'aroma', detalhe: 'Tempero de ciclo curto que aprecia meia-sombra', ciclo: 'Ciclo curto', sun: ['parcial', 'sombra'] },
  { nome: 'Tomate-cereja', emoji: '🍅', tipo: 'alimento', detalhe: 'Produtivo com sol pleno e tutoramento', ciclo: 'Médio prazo', sun: ['pleno'] },
  { nome: 'Cenoura', emoji: '🥕', tipo: 'alimento', detalhe: 'Raiz doce de ciclo médio', ciclo: 'Ciclo médio', sun: ['pleno', 'parcial'] },
  { nome: 'Pimenta', emoji: '🌶️', tipo: 'alimento', detalhe: 'Gosta de calor e sol pleno', ciclo: 'Perene', sun: ['pleno'] },
  { nome: 'Manjericão', emoji: '🌿', tipo: 'aroma', detalhe: 'Tempero versátil que ainda repele pragas', ciclo: 'Perene', sun: ['pleno', 'parcial'] },
  { nome: 'Cebolinha', emoji: '🧅', tipo: 'aroma', detalhe: 'Rebrota após cada colheita', ciclo: 'Perene', sun: ['pleno', 'parcial'] },
  { nome: 'Salsa', emoji: '🌿', tipo: 'aroma', detalhe: 'Resistente, tolera meia-sombra', ciclo: 'Ciclo médio', sun: ['parcial', 'sombra'] },
  { nome: 'Hortelã', emoji: '🌿', tipo: 'aroma', detalhe: 'Cresce bem à meia-sombra; plante em vaso', ciclo: 'Perene', sun: ['parcial', 'sombra'] },
  { nome: 'Morango', emoji: '🍓', tipo: 'fruta', detalhe: 'Frutifica em vasos, canteiros e jardineiras', ciclo: 'Perene', sun: ['pleno', 'parcial'] },
  { nome: 'Limão-taiti', emoji: '🍋', tipo: 'fruta', detalhe: 'Frutífera compacta para vaso grande', ciclo: 'Longo prazo', sun: ['pleno'] },
  { nome: 'Calêndula', emoji: '🌼', tipo: 'flor', detalhe: 'Flor comestível que afasta pragas da horta', ciclo: 'Sazonal', sun: ['pleno', 'parcial'] },
  { nome: 'Girassol', emoji: '🌻', tipo: 'flor', detalhe: 'Atrai polinizadores e pássaros', ciclo: 'Sazonal', sun: ['pleno'] },
  { nome: 'Lavanda', emoji: '💜', tipo: 'flor', detalhe: 'Aromática perene que atrai abelhas', ciclo: 'Perene', sun: ['pleno'] },
];

function sunBucket(sun: string): 'pleno' | 'parcial' | 'sombra' {
  if (sun.includes('Sol pleno')) return 'pleno';
  if (sun.includes('Sombra')) return 'sombra';
  return 'parcial';
}

const goalText = (p: GardenProfile) => p.goals.join(' ').toLowerCase();

function titleFor(area: number): string {
  if (area <= 20) return 'Jardim Compacto Produtivo';
  if (area <= 50) return 'Jardim Familiar Produtivo';
  return 'Jardim Produtivo Completo';
}

function buildZones(profile: GardenProfile): GardenZone[] {
  const goals = goalText(profile);
  const wantsFlowers =
    goals.includes('bonito') || goals.includes('poliniz') || goals.includes('ssaro');
  const wantsFruit = goals.includes('fruta') || profile.area >= 50;
  const zones: GardenZone[] = [
    { nome: 'Horta de folhosas', tipo: 'horta', descricao: 'Canteiro principal para verduras e hortaliças de ciclo curto.' },
    { nome: 'Canteiro de temperos', tipo: 'aromas', descricao: 'Ervas aromáticas próximas à cozinha para uso diário.' },
  ];
  if (wantsFruit) zones.push({ nome: 'Pomar compacto', tipo: 'frutas', descricao: 'Frutíferas adaptadas ao espaço e ao clima local.' });
  if (wantsFlowers) zones.push({ nome: 'Bordadura de flores', tipo: 'flores', descricao: 'Flores que atraem polinizadores e valorizam o visual.' });
  if (profile.composting.includes('Sim')) zones.push({ nome: 'Composteira', tipo: 'composteira', descricao: 'Transforma resíduos orgânicos em adubo gratuito.' });
  if (profile.area >= 100) {
    zones.push({ nome: 'Área de convivência', tipo: 'lazer', descricao: 'Espaço de descanso integrado ao verde.' });
    zones.push({ nome: 'Caminho principal', tipo: 'caminho', descricao: 'Circulação que conecta as zonas do jardim.' });
  } else if (profile.area >= 50) {
    zones.push({ nome: 'Caminho de acesso', tipo: 'caminho', descricao: 'Passagem entre os canteiros para manejo fácil.' });
  }
  return zones;
}

function buildPlants(profile: GardenProfile): PlantRecommendation[] {
  const bucket = sunBucket(profile.sun);
  const goals = goalText(profile);
  const wantsFlowers =
    goals.includes('bonito') || goals.includes('poliniz') || goals.includes('ssaro');
  let candidates = PLANT_POOL.filter((p) => p.sun.includes(bucket));
  if (!wantsFlowers) candidates = candidates.filter((p) => p.tipo !== 'flor');
  const target = profile.area <= 20 ? 5 : profile.area <= 50 ? 6 : 8;
  const picked = candidates.slice(0, Math.min(target, candidates.length));
  return picked.map(({ sun: _sun, ...rest }) => rest);
}

export function buildMockProject(profile: GardenProfile): GardenProject {
  const city = profile.city.split(',')[0].trim() || profile.city;
  return {
    titulo: titleFor(profile.area),
    intro:
      `Projeto desenhado para ${profile.area} m² em ${city}, sob ${profile.sun.toLowerCase()}. ` +
      `Combina produção de alimentos, baixo custo de manutenção e bom aproveitamento do espaço para ${profile.residents} morador(es).`,
    zonas: buildZones(profile),
    plantas: buildPlants(profile),
  };
}
