/**
 * Componente CardMetrica
 * Exibe métricas com ícone, valor e tendência
 * Design idêntico ao painel admin web
 */

import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { obterCores, TemaType } from '../../constants/cores';
import { useTema } from '../../contexts/TemaContext';

function converterHexParaRgba(corHex: string, opacidade: number): string {
  const valor = corHex.replace('#', '').trim();
  const alpha = Math.max(0, Math.min(1, opacidade));

  if (valor.length === 3) {
    const r = parseInt(valor[0] + valor[0], 16);
    const g = parseInt(valor[1] + valor[1], 16);
    const b = parseInt(valor[2] + valor[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  if (valor.length === 6) {
    const r = parseInt(valor.slice(0, 2), 16);
    const g = parseInt(valor.slice(2, 4), 16);
    const b = parseInt(valor.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return corHex;
}

interface Tendencia {
  valor: number;
  positiva: boolean;
}

interface CardMetricaProps {
  titulo: string;
  valor: string;
  icone: keyof typeof Ionicons.glyphMap;
  tendencia?: Tendencia;
  carregando?: boolean;
  tema?: TemaType;
  corIcone?: string;
}

export function CardMetrica({
  titulo,
  valor,
  icone,
  tendencia,
  carregando = false,
  tema,
  corIcone,
}: CardMetricaProps) {
  const { tema: temaContexto, cores: coresContexto } = useTema();
  const temaFinal = tema || temaContexto;
  const cores = tema ? obterCores(tema) : coresContexto;
  const ehEscuro = temaFinal === 'escuro';

  const corBaseIcone = corIcone || cores.texto.secundario;
  const fundoIcone = ehEscuro
    ? converterHexParaRgba(corBaseIcone, 0.2)
    : converterHexParaRgba(corBaseIcone, 0.12);

  return (
    <View
      style={{
        backgroundColor: cores.fundo.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: cores.borda.sutil,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
        minWidth: 140,
      }}
    >
      {/* Ícone */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: fundoIcone,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <Ionicons
          name={icone}
          size={20}
          color={corBaseIcone}
        />
      </View>

      {/* Título */}
      <Text
        style={{
          fontSize: 12,
          color: cores.texto.terciario,
          marginBottom: 4,
        }}
      >
        {titulo}
      </Text>

      {/* Valor */}
      {carregando ? (
        <ActivityIndicator size="small" color={cores.texto.secundario} />
      ) : (
        <Text
          style={{
            fontSize: 20,
            fontWeight: '700',
            color: cores.texto.primario,
          }}
          numberOfLines={1}
        >
          {valor}
        </Text>
      )}

      {/* Tendência */}
      {tendencia && tendencia.valor > 0 && !carregando && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 8,
            gap: 4,
          }}
        >
          <Ionicons
            name={tendencia.positiva ? 'trending-up' : 'trending-down'}
            size={14}
            color={tendencia.positiva ? '#22c55e' : '#ef4444'}
          />
          <Text
            style={{
              fontSize: 12,
              color: tendencia.positiva ? '#22c55e' : '#ef4444',
              fontWeight: '500',
            }}
          >
            {tendencia.valor.toFixed(1)}%
          </Text>
        </View>
      )}
    </View>
  );
}

export default CardMetrica;
