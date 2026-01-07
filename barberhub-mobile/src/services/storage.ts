/**
 * Serviço de Storage para upload de imagens
 * Integração com Cloudflare R2 via API do web
 */

import { CONFIG } from '../constants/config';

// URL base da API web
const API_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://barberhub.online';

interface ResultadoUpload {
  sucesso: boolean;
  url?: string;
  erro?: string;
}

/**
 * Faz upload de uma imagem para o Cloudflare R2 via API
 */
export async function uploadImagem(
  arquivo: {
    uri: string;
    type: string;
    name: string;
  },
  tipo: string,
  tenantId: string
): Promise<ResultadoUpload> {
  try {
    // Criar FormData para enviar o arquivo
    const formData = new FormData();
    
    // Adicionar arquivo ao FormData
    formData.append('file', {
      uri: arquivo.uri,
      type: arquivo.type || 'image/jpeg',
      name: arquivo.name || `${Date.now()}.jpg`,
    } as any);
    
    formData.append('tenant_id', tenantId);
    formData.append('tipo', tipo);

    // Fazer upload via API
    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Erro HTTP ${response.status}`);
    }

    const data = await response.json();

    return {
      sucesso: true,
      url: data.url,
    };
  } catch (erro: any) {
    console.error('Erro no upload:', erro);
    return {
      sucesso: false,
      erro: erro.message || 'Erro ao fazer upload',
    };
  }
}

/**
 * Faz upload da logo da barbearia
 */
export async function uploadLogo(
  arquivo: { uri: string; type: string; name: string },
  tenantId: string
): Promise<ResultadoUpload> {
  return uploadImagem(arquivo, 'logos', tenantId);
}

/**
 * Faz upload da foto de um barbeiro
 */
export async function uploadFotoBarbeiro(
  arquivo: { uri: string; type: string; name: string },
  tenantId: string,
  barbeiroId: string
): Promise<ResultadoUpload> {
  return uploadImagem(
    { ...arquivo, name: `${barbeiroId}.jpg` },
    'barbeiros',
    tenantId
  );
}

/**
 * Faz upload de imagem de trabalho/portfólio
 */
export async function uploadTrabalho(
  arquivo: { uri: string; type: string; name: string },
  tenantId: string
): Promise<ResultadoUpload> {
  return uploadImagem(arquivo, 'trabalhos', tenantId);
}

/**
 * Remove uma imagem do storage via API
 */
export async function removerImagem(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/upload?url=${encodeURIComponent(url)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}`);
    }

    return true;
  } catch (erro) {
    console.error('Erro ao remover imagem:', erro);
    return false;
  }
}
