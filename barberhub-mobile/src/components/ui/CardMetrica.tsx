/**
 * Componente CardMetrica
 * Exibe métricas com ícone, valor e tendência
 * Design idêntico ao painel admin web
 */

import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { obterCores, TemaType } from '../../constants/cores';

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
  tema = 'escuro',
  corIcone,
}: CardMetricaProps) {
  const cores = obterCores(tema);

  return (
    <View
      style={{
        backgroundColor: cores.fundo.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: cores.borda.sutil,
        minWidth: 140,
      }}
    >
      {/* Ícone */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: tema === 'escuro' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <Ionicons
          name={icone}
          size={20}
          color={corIcone || cores.texto.secundario}
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
