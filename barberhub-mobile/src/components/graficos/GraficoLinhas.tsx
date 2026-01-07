/**
 * Componente GraficoLinhas
 * Gráfico de linhas elegante para visualização de tendências
 */

import React, { useMemo } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { obterCores, TemaType } from '../../constants/cores';

const { width: LARGURA_TELA } = Dimensions.get('window');

interface PontoDados {
  rotulo: string;
  valor: number;
}

interface SeriesDados {
  nome: string;
  cor: string;
  dados: number[];
}

interface GraficoLinhasProps {
  dados: PontoDados[];
  series?: SeriesDados[];
  titulo?: string;
  subtitulo?: string;
  altura?: number;
  largura?: number;
  tema?: TemaType;
  corLinha?: string;
  preenchido?: boolean;
  mostrarPontos?: boolean;
  mostrarLegenda?: boolean;
  formatarValor?: (valor: number) => string;
  sufixo?: string;
  prefixo?: string;
}

export function GraficoLinhas({
  dados,
  series,
  titulo,
  subtitulo,
  altura = 220,
  largura = LARGURA_TELA - 40,
  tema = 'escuro',
  corLinha,
  preenchido = true,
  mostrarPontos = true,
  mostrarLegenda = true,
  formatarValor,
  sufixo = '',
  prefixo = '',
}: GraficoLinhasProps) {
  const cores = obterCores(tema);

  const dadosFormatados = useMemo(() => {
    if (series && series.length > 0) {
      return {
        labels: dados.map(d => d.rotulo),
        datasets: series.map(s => ({
          data: s.dados,
          color: (opacity = 1) => s.cor,
          strokeWidth: 2,
        })),
        legend: series.map(s => s.nome),
      };
    }

    return {
      labels: dados.map(d => d.rotulo),
      datasets: [{
        data: dados.map(d => d.valor),
        color: (opacity = 1) => corLinha || `rgba(255, 255, 255, ${opacity})`,
        strokeWidth: 2,
      }],
    };
  }, [dados, series, corLinha]);

  const formatador = formatarValor || ((valor: number) => {
    if (valor >= 1000) {
      return `${prefixo}${(valor / 1000).toFixed(1)}k${sufixo}`;
    }
    return `${prefixo}${valor.toFixed(0)}${sufixo}`;
  });

  const configuracaoGrafico = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: cores.fundo.card,
    backgroundGradientTo: cores.fundo.card,
    backgroundGradientFromOpacity: 0,
    backgroundGradientToOpacity: 0,
    decimalPlaces: 0,
    color: (opacity = 1) => corLinha || `rgba(255, 255, 255, ${opacity})`,
    labelColor: () => cores.texto.secundario,
    style: {
      borderRadius: 16,
    },
    propsForBackgroundLines: {
      strokeDasharray: '5,5',
      stroke: cores.borda.sutil,
      strokeWidth: 1,
    },
    propsForDots: {
      r: mostrarPontos ? '4' : '0',
      strokeWidth: '2',
      stroke: corLinha || cores.primaria.DEFAULT,
    },
    fillShadowGradientFrom: corLinha || cores.primaria.DEFAULT,
    fillShadowGradientFromOpacity: preenchido ? 0.3 : 0,
    fillShadowGradientTo: corLinha || cores.primaria.DEFAULT,
    fillShadowGradientToOpacity: preenchido ? 0.05 : 0,
  };

  const valorMaximo = useMemo(() => {
    if (series && series.length > 0) {
      return Math.max(...series.flatMap(s => s.dados));
    }
    return Math.max(...dados.map(d => d.valor));
  }, [dados, series]);

  const valorMinimo = useMemo(() => {
    if (series && series.length > 0) {
      return Math.min(...series.flatMap(s => s.dados));
    }
    return Math.min(...dados.map(d => d.valor));
  }, [dados, series]);

  const valorTotal = useMemo(() => {
    if (series && series.length > 0) {
      return series[0].dados.reduce((acc, val) => acc + val, 0);
    }
    return dados.reduce((acc, d) => acc + d.valor, 0);
  }, [dados, series]);

  if (dados.length === 0) {
    return (
      <View
        style={{
          backgroundColor: cores.fundo.card,
          borderRadius: 16,
          padding: 20,
          alignItems: 'center',
          justifyContent: 'center',
          height: altura,
        }}
      >
        <Text style={{ color: cores.texto.terciario, fontSize: 14 }}>
          Sem dados para exibir
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: cores.fundo.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: cores.borda.sutil,
      }}
    >
      {(titulo || subtitulo) && (
        <View style={{ marginBottom: 16 }}>
          {titulo && (
            <Text
              style={{
                color: cores.texto.primario,
                fontSize: 16,
                fontWeight: '600',
              }}
            >
              {titulo}
            </Text>
          )}
          {subtitulo && (
            <Text
              style={{
                color: cores.texto.secundario,
                fontSize: 13,
                marginTop: 4,
              }}
            >
              {subtitulo}
            </Text>
          )}
        </View>
      )}

      <LineChart
        data={dadosFormatados}
        width={largura}
        height={altura}
        yAxisLabel={prefixo}
        yAxisSuffix={sufixo}
        chartConfig={configuracaoGrafico}
        bezier
        style={{
          marginLeft: -16,
          borderRadius: 16,
        }}
        withInnerLines
        withOuterLines={false}
        withVerticalLines={false}
        withHorizontalLines
        withVerticalLabels
        withHorizontalLabels
        fromZero
        segments={4}
      />

      {mostrarLegenda && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 16,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: cores.borda.sutil,
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: cores.texto.terciario, fontSize: 11 }}>
              Mínimo
            </Text>
            <Text style={{ color: cores.texto.primario, fontSize: 14, fontWeight: '600', marginTop: 2 }}>
              {formatador(valorMinimo)}
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: cores.texto.terciario, fontSize: 11 }}>
              Total
            </Text>
            <Text style={{ color: cores.texto.primario, fontSize: 14, fontWeight: '600', marginTop: 2 }}>
              {formatador(valorTotal)}
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: cores.texto.terciario, fontSize: 11 }}>
              Máximo
            </Text>
            <Text style={{ color: cores.texto.primario, fontSize: 14, fontWeight: '600', marginTop: 2 }}>
              {formatador(valorMaximo)}
            </Text>
          </View>
        </View>
      )}

      {series && series.length > 1 && (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginTop: 12,
            gap: 16,
          }}
        >
          {series.map((s, index) => (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <View
                style={{
                  width: 12,
                  height: 3,
                  borderRadius: 1.5,
                  backgroundColor: s.cor,
                }}
              />
              <Text style={{ color: cores.texto.secundario, fontSize: 12 }}>
                {s.nome}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default GraficoLinhas;
