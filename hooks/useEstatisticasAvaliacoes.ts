import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface EstatisticasAvaliacoes {
  mediaNotas: number;
  totalAvaliacoes: number;
  estrelas5: number;
  estrelas4: number;
  estrelas3: number;
  estrelas2: number;
  estrelas1: number;
  porcentagem5Estrelas: number;
}

/**
 * Hook para buscar estatísticas reais de avaliações do banco de dados
 */
export function useEstatisticasAvaliacoes() {
  const [estatisticas, setEstatisticas] = useState<EstatisticasAvaliacoes>({
    mediaNotas: 0,
    totalAvaliacoes: 0,
    estrelas5: 0,
    estrelas4: 0,
    estrelas3: 0,
    estrelas2: 0,
    estrelas1: 0,
    porcentagem5Estrelas: 0,
  });
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    buscarEstatisticas();
  }, []);

  const buscarEstatisticas = async () => {
    try {
      // Buscar avaliações públicas
      const { data: publicasData, error: publicasError } = await supabase
        .from('avaliacoes_publicas')
        .select('avaliacao')
        .eq('aprovado', true);

      if (publicasError) throw publicasError;

      // Buscar avaliações antigas (se existirem)
      const { data: antigasData } = await supabase
        .from('avaliacoes')
        .select('nota')
        .eq('aprovado', true);

      // Combinar avaliações
      const avaliacoesPublicas = (publicasData || []).map(av => av.avaliacao);
      const avaliacoesAntigas = (antigasData || []).map(av => av.nota);
      const todasNotas = [...avaliacoesPublicas, ...avaliacoesAntigas];

      if (todasNotas.length === 0) {
        // Se não houver avaliações, usar valores padrão
        setEstatisticas({
          mediaNotas: 0,
          totalAvaliacoes: 0,
          estrelas5: 0,
          estrelas4: 0,
          estrelas3: 0,
          estrelas2: 0,
          estrelas1: 0,
          porcentagem5Estrelas: 0,
        });
        return;
      }

      // Calcular estatísticas
      const totalAvaliacoes = todasNotas.length;
      const somaNotas = todasNotas.reduce((acc, nota) => acc + nota, 0);
      const mediaNotas = somaNotas / totalAvaliacoes;

      const estrelas5 = todasNotas.filter(n => n === 5).length;
      const estrelas4 = todasNotas.filter(n => n === 4).length;
      const estrelas3 = todasNotas.filter(n => n === 3).length;
      const estrelas2 = todasNotas.filter(n => n === 2).length;
      const estrelas1 = todasNotas.filter(n => n === 1).length;

      const porcentagem5Estrelas = Math.round((estrelas5 / totalAvaliacoes) * 100);

      setEstatisticas({
        mediaNotas: Number(mediaNotas.toFixed(1)),
        totalAvaliacoes,
        estrelas5,
        estrelas4,
        estrelas3,
        estrelas2,
        estrelas1,
        porcentagem5Estrelas,
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      // Em caso de erro, manter valores zerados
    } finally {
      setCarregando(false);
    }
  };

  return {
    estatisticas,
    carregando,
    recarregar: buscarEstatisticas,
  };
}
