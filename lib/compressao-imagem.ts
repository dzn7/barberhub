import imageCompression from "browser-image-compression";

/**
 * Opções padrão para compressão de imagens
 */
const OPCOES_COMPRESSAO_PADRAO = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: "image/webp" as const,
  initialQuality: 0.85,
};

/**
 * Opções para thumbnail
 */
const OPCOES_THUMBNAIL = {
  maxSizeMB: 0.1,
  maxWidthOrHeight: 400,
  useWebWorker: true,
  fileType: "image/webp" as const,
  initialQuality: 0.7,
};

export interface ResultadoCompressao {
  arquivoComprimido: File;
  tamanhoOriginal: number;
  tamanhoComprimido: number;
  percentualReducao: number;
}

/**
 * Comprime uma imagem para upload otimizado
 * @param arquivo - Arquivo de imagem original
 * @param opcoes - Opções de compressão personalizadas
 * @returns Arquivo comprimido com metadados
 */
export async function comprimirImagem(
  arquivo: File,
  opcoes?: Partial<typeof OPCOES_COMPRESSAO_PADRAO>
): Promise<ResultadoCompressao> {
  const opcoesFinais = { ...OPCOES_COMPRESSAO_PADRAO, ...opcoes };
  
  try {
    const arquivoComprimido = await imageCompression(arquivo, opcoesFinais);
    
    const tamanhoOriginal = arquivo.size;
    const tamanhoComprimido = arquivoComprimido.size;
    const percentualReducao = Math.round(
      ((tamanhoOriginal - tamanhoComprimido) / tamanhoOriginal) * 100
    );

    // Renomear para .webp se convertido
    const nomeBase = arquivo.name.replace(/\.[^/.]+$/, "");
    const novoArquivo = new File(
      [arquivoComprimido],
      `${nomeBase}.webp`,
      { type: "image/webp" }
    );

    return {
      arquivoComprimido: novoArquivo,
      tamanhoOriginal,
      tamanhoComprimido,
      percentualReducao,
    };
  } catch (erro) {
    console.error("Erro na compressão:", erro);
    throw new Error("Falha ao comprimir imagem");
  }
}

/**
 * Gera thumbnail de uma imagem
 * @param arquivo - Arquivo de imagem original
 * @returns Arquivo thumbnail comprimido
 */
export async function gerarThumbnail(arquivo: File): Promise<File> {
  try {
    const thumbnail = await imageCompression(arquivo, OPCOES_THUMBNAIL);
    
    const nomeBase = arquivo.name.replace(/\.[^/.]+$/, "");
    return new File(
      [thumbnail],
      `${nomeBase}_thumb.webp`,
      { type: "image/webp" }
    );
  } catch (erro) {
    console.error("Erro ao gerar thumbnail:", erro);
    throw new Error("Falha ao gerar thumbnail");
  }
}

/**
 * Converte um Blob para File
 * @param blob - Blob a ser convertido
 * @param nomeArquivo - Nome do arquivo
 * @returns File
 */
export function blobParaFile(blob: Blob, nomeArquivo: string): File {
  return new File([blob], nomeArquivo, { type: blob.type });
}

/**
 * Cria um blob URL a partir de um File
 * @param arquivo - Arquivo
 * @returns URL temporária do blob
 */
export function criarPreviewUrl(arquivo: File): string {
  return URL.createObjectURL(arquivo);
}

/**
 * Revoga um blob URL para liberar memória
 * @param url - URL do blob a ser revogada
 */
export function revogarPreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Formata o tamanho do arquivo em formato legível
 * @param bytes - Tamanho em bytes
 * @returns String formatada (ex: "1.5 MB")
 */
export function formatarTamanhoArquivo(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  
  const k = 1024;
  const tamanhos = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${tamanhos[i]}`;
}
