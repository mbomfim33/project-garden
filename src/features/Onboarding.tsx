import type * as React from 'react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GardenProfile, SizePreset } from '../api/types';
import { readImage } from '../lib/readImage';
import { useProfileStore } from '../state/profileStore';

const SIZE_PRESETS: SizePreset[] = [
  { icon: '🌱', name: 'Jardim Compacto — até 20 m²', desc: 'Varanda, terraço ou canteiro urbano', eco: 'Economia estimada: R$ 1.000–2.000/ano', m2: 20, plants: 'temperos, ervas medicinais, folhosas e hortaliças de ciclo curto' },
  { icon: '🏡', name: 'Jardim Familiar — 50 m²', desc: 'Quintal familiar padrão', eco: 'Economia estimada: R$ 2.000–4.000/ano', m2: 50, plants: 'verduras, temperos, tomates, pepinos, morangos e frutas pequenas' },
  { icon: '🌳', name: 'Jardim Produtivo — 100 m²+', desc: 'Jardim produtivo completo', eco: 'Economia estimada: R$ 4.000–8.000/ano', m2: 100, plants: 'hortaliças, frutas, temperos, PANCs e flores comestíveis' },
];

const GOAL_LABELS = [
  '🥗 Produzir alimentos', '🌺 Jardim bonito', '⚡ Baixa manutenção', '🦋 Atrair polinizadores',
  '🐦 Atrair pássaros', '💰 Economizar nas compras', '🍓 Produzir frutas', '🌿 Produzir temperos',
  '♻️ Sustentabilidade', '🏠 Valorizar o imóvel',
];
const DEFAULT_SELECTED = new Set([0, 1, 5]);

/** Full-screen 5-step onboarding wizard, rendered outside the app shell. */
export function Onboarding() {
  const setProfile = useProfileStore((s) => s.setProfile);
  const navigate = useNavigate();
  const photoInput = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [sizeIndex, setSizeIndex] = useState(1);
  const [goals, setGoals] = useState(
    GOAL_LABELS.map((label, i) => ({ label, selected: DEFAULT_SELECTED.has(i) })),
  );
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

  const [city, setCity] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [residents, setResidents] = useState('');
  const [area, setArea] = useState('');
  const [sun, setSun] = useState('Sol pleno (+6h)');
  const [budget, setBudget] = useState('R$ 800–2.000');
  const [weeklyTime, setWeeklyTime] = useState('1–3 horas');
  const [experience, setExperience] = useState('Iniciante');
  const [composting, setComposting] = useState('Sim, quero incluir');

  const toggleGoal = (i: number) =>
    setGoals((list) => list.map((g, idx) => (idx === i ? { ...g, selected: !g.selected } : g)));

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const { dataUrl, base64 } = await readImage(file);
    setPhotoPreview(dataUrl);
    setPhotoBase64(base64);
  }

  function finish() {
    const preset = SIZE_PRESETS[sizeIndex];
    const selectedGoals = goals.filter((g) => g.selected).map((g) => g.label);
    const profile: GardenProfile = {
      city: city || 'São Paulo, SP',
      propertyType: propertyType || 'Casa com quintal',
      residents: Number(residents) || 4,
      area: Number(area) || preset.m2,
      sun: sun || 'Sol pleno (+6h)',
      goals: selectedGoals.length ? selectedGoals : ['🥗 Produzir alimentos', '🌺 Jardim bonito'],
      budget: budget || 'R$ 800–2.000',
      weeklyTime: weeklyTime || '1–3 horas',
      experience: experience || 'Iniciante',
      composting: composting || 'Sim, quero incluir',
      plants: preset.plants,
      photo: photoBase64,
    };
    setProfile(profile);
    navigate('/inicio');
  }

  return (
    <div id="onboarding">
      <div className="ob-bg" />
      <div className="ob-header">
        <div className="ob-logo">
          🌿 Plant<span>AI</span>
        </div>
        <div className="ob-tagline">Transformamos jardins em espaços que alimentam pessoas.</div>
      </div>
      <div className="ob-progress">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={i <= step ? 'ob-dot done' : 'ob-dot'} />
        ))}
      </div>

      {step === 0 && (
        <div className="ob-step active">
          <div className="ob-step-chip">Passo 1 de 5</div>
          <div className="ob-step-title">Onde fica seu jardim?</div>
          <div className="ob-step-hint">
            A IA usa sua localização para adaptar o projeto ao seu clima e região.
          </div>
          <div className="ob-field">
            <label>Estado / Cidade</label>
            <input className="ob-input" placeholder="Ex: São Paulo, SP" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="ob-field">
            <label>Tipo de imóvel</label>
            <select className="ob-input" value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
              <option value="">Selecione</option>
              <option>Apartamento com varanda / terraço</option>
              <option>Casa em condomínio</option>
              <option>Casa com quintal</option>
              <option>Chácara</option>
              <option>Sítio / Fazenda</option>
              <option>Espaço comunitário / condomínio</option>
            </select>
          </div>
          <div className="ob-field">
            <label>Número de moradores</label>
            <input className="ob-input" type="number" placeholder="Ex: 4" value={residents} onChange={(e) => setResidents(e.target.value)} />
          </div>
          <button className="ob-next" onClick={() => setStep(1)}>Continuar →</button>
        </div>
      )}

      {step === 1 && (
        <div className="ob-step active">
          <div className="ob-step-chip">Passo 2 de 5</div>
          <div className="ob-step-title">Qual o tamanho do espaço?</div>
          <div className="ob-step-hint">Escolha o perfil mais próximo da sua área disponível.</div>
          <div className="size-cards">
            {SIZE_PRESETS.map((preset, i) => (
              <div
                key={preset.name}
                className={i === sizeIndex ? 'size-card sel' : 'size-card'}
                onClick={() => setSizeIndex(i)}
              >
                <div className="sc-icon">{preset.icon}</div>
                <div className="sc-body">
                  <div className="sc-name">{preset.name}</div>
                  <div className="sc-desc">{preset.desc}</div>
                  <div className="sc-eco">{preset.eco}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="ob-grid2">
            <div className="ob-field">
              <label>Área exata (m²)</label>
              <input className="ob-input" type="number" placeholder="Ex: 60" value={area} onChange={(e) => setArea(e.target.value)} />
            </div>
            <div className="ob-field">
              <label>Insolação</label>
              <select className="ob-input" value={sun} onChange={(e) => setSun(e.target.value)}>
                <option>Sol pleno (+6h)</option>
                <option>Sol parcial (4–6h)</option>
                <option>Meia sombra (2–4h)</option>
                <option>Sombra</option>
              </select>
            </div>
          </div>
          <button className="ob-next" onClick={() => setStep(2)}>Continuar →</button>
        </div>
      )}

      {step === 2 && (
        <div className="ob-step active">
          <div className="ob-step-chip">Passo 3 de 5</div>
          <div className="ob-step-title">O que você quer do seu jardim?</div>
          <div className="ob-step-hint">Selecione todos que se aplicam — a IA vai equilibrar os objetivos.</div>
          <div className="ob-goal-grid">
            {goals.map((goal, i) => (
              <div
                key={goal.label}
                className={goal.selected ? 'ob-goal sel' : 'ob-goal'}
                onClick={() => toggleGoal(i)}
              >
                {goal.label}
              </div>
            ))}
          </div>
          <button className="ob-next" onClick={() => setStep(3)}>Continuar →</button>
        </div>
      )}

      {step === 3 && (
        <div className="ob-step active">
          <div className="ob-step-chip">Passo 4 de 5</div>
          <div className="ob-step-title">Foto do seu espaço</div>
          <div className="ob-step-hint">
            Opcional mas poderoso — a IA analisa sol, sombra, solo e potencial do espaço.
          </div>
          {photoPreview && <img className="ob-preview show" src={photoPreview} alt="preview" />}
          <div className="photo-upload" onClick={() => photoInput.current?.click()}>
            <div className="pu-icon">📸</div>
            <p>
              Fotografar ou escolher da galeria
              <br />
              <span style={{ fontSize: 11, opacity: 0.4 }}>JPG ou PNG</span>
            </p>
          </div>
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={onPhoto}
          />
          <button className="ob-next" onClick={() => setStep(4)}>Continuar →</button>
        </div>
      )}

      {step === 4 && (
        <div className="ob-step active">
          <div className="ob-step-chip">Passo 5 de 5</div>
          <div className="ob-step-title">Últimos detalhes</div>
          <div className="ob-step-hint">A IA vai criar um projeto realista dentro da sua realidade.</div>
          <div className="ob-field">
            <label>Orçamento inicial para o jardim</label>
            <select className="ob-input" value={budget} onChange={(e) => setBudget(e.target.value)}>
              <option>Até R$ 300</option>
              <option>R$ 300–800</option>
              <option>R$ 800–2.000</option>
              <option>R$ 2.000–5.000</option>
              <option>Acima de R$ 5.000</option>
            </select>
          </div>
          <div className="ob-field">
            <label>Tempo disponível por semana</label>
            <select className="ob-input" value={weeklyTime} onChange={(e) => setWeeklyTime(e.target.value)}>
              <option>30 min a 1h</option>
              <option>1–3 horas</option>
              <option>3–6 horas</option>
              <option>6+ horas</option>
            </select>
          </div>
          <div className="ob-field">
            <label>Experiência com jardins</label>
            <select className="ob-input" value={experience} onChange={(e) => setExperience(e.target.value)}>
              <option>Nunca tentei</option>
              <option>Iniciante</option>
              <option>Intermediário</option>
              <option>Experiente</option>
            </select>
          </div>
          <div className="ob-field">
            <label>Interesse em compostagem?</label>
            <select className="ob-input" value={composting} onChange={(e) => setComposting(e.target.value)}>
              <option>Sim, quero incluir</option>
              <option>Talvez futuramente</option>
              <option>Não por enquanto</option>
            </select>
          </div>
          <button className="ob-next" onClick={finish}>🌿 Gerar meu projeto</button>
        </div>
      )}
    </div>
  );
}
