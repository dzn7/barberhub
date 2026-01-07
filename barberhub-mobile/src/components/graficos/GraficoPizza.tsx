/**
 * Componente GraficoPizza
 * Gráfico de pizza/rosca elegante para visualização de proporções
 */

import React, { useMemo } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { obterCores, TemaType } from '../../constants/cores';
import { useTema } from '../../contexts/TemaContext';

const { width: LARGURA_TELA } = Dimensions.get('window');

interface FatiaDados {
  nome: string;
  valor: number;
  cor: string;
}

interface GraficoPizzaProps {
  dados: FatiaDados[];
  titulo?: string;
  subtitulo?: string;
  altura?: number;
  largura?: number;
  tema?: TemaType;
  tipoRosca?: boolean;
  mostrarLegenda?: boolean;
  mostrarPorcentagem?: boolean;
  formatarValor?: (valor: number) => string;
  valorCentral?: string;
  labelCentral?: string;
}

export function GraficoPizza({
  dados,
  titulo,
  subtitulo,
  altura = 200,
  largura = LARGURA_TELA - 40,
  tema,
  tipoRosca = true,
  mostrarLegenda = true,
  mostrarPorcentagem = true,
  formatarValor,
  valorCentral,
  labelCentral,
}: GraficoPizzaProps) {
  const { cores: coresContexto } = useTema();
  const cores = tema ? obterCores(tema) : coresContexto;

  const total = useMemo(() => dados.reduce((acc, d) => acc + d.valor, 0), [dados]);

  const dadosFormatados = useMemo(() => {
    return dados.map((d) => ({
      name: d.nome,
      population: d.valor,
      color: d.cor,
      legendFontColor: cores.texto.secundario,
      legendFontSize: 12,
    }));
  }, [dados, cores]);

  const formatador = formatarValor || ((valor: number) => {
    if (valor >= 1000) {
      return `R$ ${(valor / 1000).toFixed(1)}k`;
    }
    return `R$ ${valor.toFixed(0)}`;
  });

  const configuracaoGrafico = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: cores.fundo.card,
    backgroundGradientTo: cores.fundo.card,
    backgroundGradientFromOpacity: 0,
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: () => cores.texto.secundario,
  };

  if (dados.length === 0 || total === 0) {
    return (
      <View
        style={{
          backgroundColor: cores.fundo.card,
          borderRadius: 16,
          padding: 20,
          alignItems: 'center',
          justifyContent: 'center',
          height: altura + 60,
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
        <View style={{ marginBottom: 8 }}>
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

      <View style={{ alignItems: 'center', position: 'relative' }}>
        <PieChart
          data={dadosFormatados}
          width={largura}
          height={altura}
          chartConfig={configuracaoGrafico}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="0"
          absolute={!mostrarPorcentagem}
          hasLegend={false}
          center={[largura / 4, 0]}
        />

        {tipoRosca && (valorCentral || labelCentral) && (
          <View
            style={{
              position: 'absolute',
              top: altura / 2 - 30,
              left: largura / 2 - 50,
              width: 100,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {valorCentral && (
              <Text
                style={{
                  color: cores.texto.primario,
                  fontSize: 20,
                  fontWeight: '700',
                }}
              >
                {valorCentral}
              </Text>
            )}
            {labelCentral && (
              <Text
                style={{
                  color: cores.texto.terciario,
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                {labelCentral}
              </Text>
            )}
          </View>
        )}
      </View>

      {mostrarLegenda && (
        <View
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: cores.borda.sutil,
          }}
        >
          {dados.map((item, index) => {
            const porcentagem = ((item.valor / total) * 100).toFixed(1);
            return (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 8,
                  borderBottomWidth: index < dados.length - 1 ? 1 : 0,
                  borderBottomColor: cores.borda.sutil,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: item.cor,
                      marginRight: 10,
                    }}
                  />
                  <Text
                    style={{
                      color: cores.texto.primario,
                      fontSize: 14,
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {item.nome}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text
                    style={{
                      color: cores.texto.secundario,
                      fontSize: 13,
                    }}
                  >
                    {formatador(item.valor)}
                  </Text>
                  {mostrarPorcentagem && (
                    <View
                      style={{
                        backgroundColor: item.cor + '20',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        minWidth: 52,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: item.cor,
                          fontSize: 12,
                          fontWeight: '600',
                        }}
                      >
                        {porcentagem}%
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {mostrarLegenda && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: cores.borda.sutil,
          }}
        >
          <Text style={{ color: cores.texto.terciario, fontSize: 12 }}>
            Total
          </Text>
          <Text style={{ color: cores.texto.primario, fontSize: 14, fontWeight: '600' }}>
            {formatador(total)}
          </Text>
        </View>
      )}
    </View>
  );
}

export default GraficoPizza;
