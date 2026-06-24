export interface ReadImageResult {
  /** Full `data:` URL for an <img src> preview. */
  dataUrl: string;
  /** Just the base64 payload (no prefix), for the API. */
  base64: string;
}

/** Promise wrapper around FileReader — mirrors the Angular ImageUploadService. */
export function readImage(file: File): Promise<ReadImageResult> {
  return new Promise<ReadImageResult>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve({ dataUrl, base64: dataUrl.split(',')[1] ?? '' });
    };
    reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}
