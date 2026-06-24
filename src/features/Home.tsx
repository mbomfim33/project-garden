import { WEEK_TASKS } from '../lib/eco';
import { useAlerts, useEcoSummary, useProfileStore } from '../state/profileStore';

const fmt = (value: number) => value.toLocaleString('pt-BR');

/** Home dashboard ("Início") — pure read-model from the profile store. */
export function Home() {
  const profile = useProfileStore((s) => s.profile);
  const eco = useEcoSummary();
  const alerts = useAlerts();
  if (!profile || !eco) return null;

  const cityShort = profile.city.split(',')[0]?.trim() ?? '';

  return (
    <>
      <div className="profile-bar">
        <div className="pb-ava">🏡</div>
        <div className="pb-info">
          <div className="pb-name">
            {cityShort} · {profile.area}m²
          </div>
          <div className="pb-detail">
            {profile.propertyType} · {profile.residents} moradores
          </div>
        </div>
        <div className="pb-eco">
          <div className="pe-val">R$ {fmt(eco.ecoMid)}</div>
          <div className="pe-lbl">economia/ano</div>
        </div>
      </div>

      <div className="eco-hero">
        <div className="eco-label">Potencial do seu jardim</div>
        <div className="eco-value">
          R$ {fmt(eco.ecoMin)}–{fmt(eco.ecoMax)}
        </div>
        <div className="eco-desc">
          Economia anual estimada em alimentação para {profile.residents} moradores
        </div>
        <div className="eco-metrics">
          <div className="eco-m">
            <div className="em-val">{eco.itens}</div>
            <div className="em-lbl">itens plantados/ano</div>
          </div>
          <div className="eco-m">
            <div className="em-val">{eco.valorizacao}</div>
            <div className="em-lbl">valorização imóvel</div>
          </div>
          <div className="eco-m">
            <div className="em-val">{eco.roi}</div>
            <div className="em-lbl">ROI anual</div>
          </div>
        </div>
      </div>

      <div className="section-title">Alertas do jardim</div>
      <div>
        {alerts.map((a) => (
          <div className={`alert-strip ${a.type}`} key={a.text}>
            <div className="as-icon">{a.icon}</div>
            <div className="as-body">
              {a.title && <div className="ab-t">{a.title}</div>}
              <div className="ab-d">{a.text}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="section-title" style={{ marginTop: 4 }}>
        Esta semana no jardim
      </div>
      <div>
        {WEEK_TASKS.map((t) => (
          <div className="alert-strip success" key={t.text}>
            <div className="as-icon">{t.icon}</div>
            <div className="as-body">
              <div className="ab-d">{t.text}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
