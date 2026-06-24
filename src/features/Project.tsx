import type { PlantType, ZoneType } from '../api/types';
import { useGenerateProject } from '../hooks/queries';
import { useProfileStore } from '../state/profileStore';

const ZONE_CLASS: Record<ZoneType, string> = {
  horta: 'gz-horta', frutas: 'gz-frutas', aromas: 'gz-aromas', flores: 'gz-flores',
  composteira: 'gz-comp', lazer: 'gz-lazer', caminho: 'gz-caminho',
};
const ZONE_EMOJI: Record<ZoneType, string> = {
  horta: '🥬', frutas: '🍓', aromas: '🌿', flores: '🌸', composteira: '♻️', lazer: '🪑', caminho: '🛤️',
};
const TAG_CLASS: Record<PlantType, string> = {
  alimento: 'tag-alim', aroma: 'tag-aroma', flor: 'tag-flor', fruta: 'tag-fruta',
};

/** Project tab ("Projeto") — generates a tailored garden project via a mutation. */
export function Project() {
  const profile = useProfileStore((s) => s.profile);
  const mutation = useGenerateProject();
  const project = mutation.data;

  const subText = profile
    ? `${profile.area}m² · ${profile.city}`
    : 'Gerado por IA para sua propriedade';

  return (
    <div className="card">
      <div className="card-title">Seu projeto personalizado</div>
      <div className="card-sub">{subText}</div>

      <button
        className="action-btn primary"
        style={{ marginBottom: 14 }}
        disabled={mutation.isPending || !profile}
        onClick={() => profile && mutation.mutate(profile)}
      >
        {mutation.isPending ? (
          <>
            <span className="spinner" /> Gerando projeto...
          </>
        ) : mutation.isSuccess ? (
          '🔄 Regenerar projeto'
        ) : (
          '🤖 Gerar projeto com IA'
        )}
      </button>

      {mutation.isError && (
        <div className="alert-strip warn">
          <div className="as-body">
            <div className="ab-d">Erro ao gerar projeto. Tente novamente.</div>
          </div>
        </div>
      )}

      {project && (
        <>
          <div className="project-header">
            <div className="ph-title">{project.titulo}</div>
            <div className="ph-sub">{project.intro}</div>
          </div>

          <div className="section-title">Mapa do jardim</div>
          <div className="garden-map">
            {project.zonas.map((z) => (
              <div className={`gmap-zone ${ZONE_CLASS[z.tipo]}`} title={z.descricao} key={z.nome}>
                {ZONE_EMOJI[z.tipo]} {z.nome}
              </div>
            ))}
          </div>

          <div className="section-title">Plantas recomendadas</div>
          <div className="plant-grid">
            {project.plantas.map((p) => (
              <div className="plant-card" key={p.nome}>
                <div className="pc-icon">{p.emoji}</div>
                <div className="pc-body">
                  <div className="pc-name">{p.nome}</div>
                  <div className="pc-detail">{p.detalhe}</div>
                  <span className={`pc-tag ${TAG_CLASS[p.tipo]}`}>{p.ciclo}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
