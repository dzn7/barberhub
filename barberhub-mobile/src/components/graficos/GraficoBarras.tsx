/**
 * Componente GraficoBarras
 * Gráfico de barras completo e elegante para visualização de dados
 */

import React, { useMemo } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { obterCores, TemaType } from '../../constants/cores';

const { width: LARGURA_TELA } = Dimensions.get('window');

interface DadosGrafico {
  rotulo: string;
  valor: number;
}

interface GraficoBarrasProps {
  dados: DadosGrafico[];
  titulo?: string;
  subtitulo?: string;
  altura?: number;
  largura?: number;
  tema?: TemaType;
  corBarra?: string;
  mostrarValores?: boolean;
  formatarValor?: (valor: number) => string;
  sufixo?: string;
  prefixo?: string;
}

export function GraficoBarras({
  dados,
  titulo,
  subtitulo,
  altura = 220,
  largura = LARGURA_TELA - 40,
  tema = 'escuro',
  corBarra,
  mostrarValores = true,
  formatarValor,
  sufixo = '',
  prefixo = '',
}: GraficoBarrasProps) {
  const cores = obterCores(tema);

  const dadosFormatados = useMemo(() => ({
    labels: dados.map(d => d.rotulo),
    datasets: [{
      data: dados.map(d => d.valor),
    }],
  }), [dados]);

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
    color: (opacity = 1) => corBarra || `rgba(255, 255, 255, ${opacity})`,
    labelColor: () => cores.texto.secundario,
    style: {
      borderRadius: 16,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: cores.borda.sutil,
      strokeWidth: 1,
    },
    barPercentage: 0.6,
    fillShadowGradient: corBarra || cores.primaria.DEFAULT,
    fillShadowGradientOpacity: 1,
  };

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

      <BarChart
        data={dadosFormatados}
        width={largura}
        height={altura}
        yAxisLabel={prefixo}
        yAxisSuffix={sufixo}
        chartConfig={configuracaoGrafico}
        style={{
          marginLeft: -16,
          borderRadius: 16,
        }}
        showValuesOnTopOfBars={mostrarValores}
        fromZero
        withInnerLines
        withHorizontalLabels
        segments={4}
      />

      {mostrarValores && (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginTop: 12,
            gap: 12,
          }}
        >
          {dados.map((item, index) => (
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
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: corBarra || cores.primaria.DEFAULT,
                }}
              />
              <Text style={{ color: cores.texto.terciario, fontSize: 12 }}>
                {item.rotulo}: {formatador(item.valor)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default GraficoBarras;
