import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useDiagnosePlant } from '../hooks/queries';
import { readImage } from '../lib/readImage';
import { useProfileStore } from '../state/profileStore';

/** Diagnosis tab ("Diagnóstico") — upload a photo, get a structured diagnosis. */
export function Diagnosis() {
  const profile = useProfileStore((s) => s.profile);
  const mutation = useDiagnosePlant();
  const fileInput = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [barWidth, setBarWidth] = useState(0);

  const diagnosis = mutation.data;

  // Animate the confidence bar from 0 once a diagnosis arrives.
  // The reset is deferred into a rAF so we never call setState synchronously
  // in the effect body (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!diagnosis) return;
    let timer: ReturnType<typeof setTimeout>;
    const raf = requestAnimationFrame(() => {
      setBarWidth(0);
      timer = setTimeout(() => setBarWidth(diagnosis.confianca), 80);
    });
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [diagnosis]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const { dataUrl, base64 } = await readImage(file);
    setPreviewUrl(dataUrl);
    setImageBase64(base64);
    mutation.reset();
  }

  function analyze() {
    if (!imageBase64 || !profile) return;
    mutation.mutate({ image: imageBase64, profile });
  }

  return (
    <div className="card">
      <div className="card-title">Diagnóstico por foto</div>
      <div className="card-sub">A IA identifica pragas, doenças e deficiências nutricionais</div>

      {previewUrl && <img className="preview-img show" src={previewUrl} alt="preview" />}

      {!previewUrl && (
        <div className="upload-zone" onClick={() => fileInput.current?.click()}>
          <div className="uz-icon">🔍</div>
          <div className="uz-text">Fotografar planta com problema</div>
          <div className="uz-hint">JPG ou PNG — análise em segundos</div>
        </div>
      )}

      <input ref={fileInput} type="file" className="hidden-file" accept="image/*" onChange={onFile} />

      <button
        className="action-btn primary"
        style={{ marginTop: 2 }}
        disabled={!imageBase64 || mutation.isPending}
        onClick={analyze}
      >
        {mutation.isPending ? (
          <>
            <span className="spinner" /> Analisando...
          </>
        ) : mutation.isSuccess ? (
          '🔬 Analisar novamente'
        ) : (
          '🔬 Analisar com IA'
        )}
      </button>

      {mutation.isError && (
        <div className="result-box show">
          <div className="rb-title">⚠️ Erro</div>
          <div className="rb-text">Verifique sua conexão.</div>
        </div>
      )}

      {diagnosis && (
        <div className="result-box show">
          <div className="rb-title">🔬 {diagnosis.diagnostico}</div>
          <div className="rb-text" style={{ whiteSpace: 'pre-line' }}>
            {diagnosis.causa}
          </div>
          <div className="rb-text">Recomendações:</div>
          <ol className="rb-text">
            {diagnosis.recomendacoes.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ol>
          <div className="rb-text">Urgência: {diagnosis.urgencia}</div>
          <div className="conf-row">
            <span>Confiança da IA</span>
            <span>{diagnosis.confianca}%</span>
          </div>
          <div className="bar-bg">
            <div className="bar-fill" style={{ width: `${barWidth}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
