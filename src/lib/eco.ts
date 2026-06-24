import type { EcoSummary, GardenAlert, GardenProfile } from '../api/types';

/** Pure economic projection from garden area (ported from the prototype). */
export function computeEcoSummary(area: number): EcoSummary {
  const ecoMin = area <= 20 ? 1000 : area <= 50 ? 2000 : 4000;
  const ecoMax = area <= 20 ? 2000 : area <= 50 ? 4000 : 8000;
  const ecoMid = Math.round((ecoMin + ecoMax) / 2);
  const valorizacao = area >= 100 ? '8–12%' : area >= 50 ? '5–8%' : '3–5%';
  const itens = area <= 20 ? '15–20' : area <= 50 ? '25–35' : '40–60';
  const roi = area <= 20 ? '180%' : area <= 50 ? '220%' : '280%';
  return { ecoMin, ecoMax, ecoMid, valorizacao, itens, roi };
}

/** Home-dashboard alerts derived from the profile (ported from renderAlerts). */
export function buildAlerts(profile: GardenProfile): GardenAlert[] {
  const alerts: GardenAlert[] = [];
  if (profile.sun.includes('Sombra')) {
    alerts.push({
      type: 'warn',
      icon: '☁️',
      title: 'Pouca luz solar detectada',
      text: 'Para espaços com menos de 4h de sol, priorizaremos plantas adaptadas à meia sombra como hortelã, salsa e algumas folhosas.',
    });
  }
  if (profile.experience === 'Nunca tentei' || profile.experience === 'Iniciante') {
    alerts.push({
      type: 'info',
      icon: '🌱',
      title: 'Perfil iniciante',
      text: 'Vamos começar com plantas de ciclo curto e fácil manutenção. Você verá resultados nas primeiras 4 semanas!',
    });
  }
  if (profile.composting.includes('Sim')) {
    alerts.push({
      type: 'success',
      icon: '♻️',
      title: 'Compostagem incluída no projeto',
      text: 'Incluímos uma composteira no planejamento. Ela vai reduzir lixo orgânico e produzir adubo gratuito para o jardim.',
    });
  }
  alerts.push({
    type: 'success',
    icon: '✅',
    title: 'Projeto pronto para gerar',
    text: 'Acesse a aba Projeto para ver o planejamento completo com mapa do jardim, plantas recomendadas e cronograma.',
  });
  return alerts;
}

export const WEEK_TASKS: { icon: string; text: string }[] = [
  { icon: '💧', text: 'Regar canteiro de folhosas (manhã cedo)' },
  { icon: '🌿', text: 'Verificar sinais de pragas nas mudas novas' },
  { icon: '🪱', text: 'Virar o composto se houver composteira' },
];
