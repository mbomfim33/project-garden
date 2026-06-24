import type { TimelineType } from '../api/types';
import { useGenerateSchedule } from '../hooks/queries';
import { useProfileStore } from '../state/profileStore';

const ICON_MAP: Record<TimelineType, string> = { plantar: '🌱', colher: '🥬', cuidar: '💧' };
const CLASS_MAP: Record<TimelineType, string> = { plantar: 'plant', colher: 'harvest', cuidar: 'care' };

/** Schedule tab ("Cronograma"/"Plantio") — generates a planting calendar via a mutation. */
export function Schedule() {
  const profile = useProfileStore((s) => s.profile);
  const mutation = useGenerateSchedule();
  const timeline = mutation.data;

  return (
    <div className="card">
      <div className="card-title">Cronograma de plantio</div>
      <div className="card-sub">O que plantar, quando e quando colher</div>

      <button
        className="action-btn primary"
        style={{ marginBottom: 16 }}
        disabled={mutation.isPending || !profile}
        onClick={() => profile && mutation.mutate(profile)}
      >
        {mutation.isPending ? (
          <>
            <span className="spinner" /> Gerando cronograma...
          </>
        ) : mutation.isSuccess ? (
          '🔄 Atualizar cronograma'
        ) : (
          '📅 Gerar cronograma com IA'
        )}
      </button>

      {mutation.isError && (
        <div className="alert-strip warn">
          <div className="as-body">
            <div className="ab-d">Erro ao gerar cronograma.</div>
          </div>
        </div>
      )}

      {timeline && (
        <div className="timeline">
          {timeline.map((item) => (
            <div className="tl-item" key={item.titulo}>
              <div className="tl-left">
                <div className={`tl-dot ${CLASS_MAP[item.tipo]}`}>{ICON_MAP[item.tipo]}</div>
                <div className="tl-line" />
              </div>
              <div className="tl-body">
                <div className="tl-month">{item.mes}</div>
                <div className="tl-title">{item.titulo}</div>
                <div className="tl-desc">{item.descricao}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
