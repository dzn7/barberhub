/**
 * Tela de Serviços
 * Gestão de serviços oferecidos pela barbearia
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  Pressable,
  Modal,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Botao, Input, Card } from '../../src/components/ui';
import { useAutenticacao } from '../../src/stores/autenticacao';
import { useTerminologia } from '../../src/hooks/useTerminologia';
import { supabase } from '../../src/services/supabase';
import { useTema } from '../../src/contexts/TemaContext';
import type { Servico } from '../../src/types';

export default function TelaServicos() {
  const insets = useSafeAreaInsets();
  const { tenant } = useAutenticacao();
  const { profissional, ehNailDesigner } = useTerminologia();
  
  const { cores: CORES } = useTema();

  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [servicoEditando, setServicoEditando] = useState<Servico | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    duracao: '30',
    preco: '',
    categoria: 'geral',
    ativo: true,
  });

  const carregarServicos = useCallback(async () => {
    if (!tenant?.id) return;

    try {
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('ordem_exibicao', { ascending: true });

      if (error) throw error;
      setServicos(data || []);
    } catch (erro) {
      console.error('Erro ao carregar serviços:', erro);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [tenant?.id]);

  useEffect(() => {
    carregarServicos();
  }, [carregarServicos]);

  const onRefresh = () => {
    setAtualizando(true);
    carregarServicos();
  };

  const abrirModal = (servico?: Servico) => {
    if (servico) {
      setServicoEditando(servico);
      setFormData({
        nome: servico.nome,
        descricao: servico.descricao || '',
        duracao: String(servico.duracao),
        preco: String(servico.preco),
        categoria: servico.categoria || 'geral',
        ativo: servico.ativo,
      });
    } else {
      setServicoEditando(null);
      setFormData({
        nome: '',
        descricao: '',
        duracao: '30',
        preco: '',
        categoria: 'geral',
        ativo: true,
      });
    }
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setServicoEditando(null);
  };

  const salvarServico = async () => {
    if (!tenant?.id || !formData.nome || !formData.preco) return;

    setSalvando(true);
    try {
      const dadosServico = {
        tenant_id: tenant.id,
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim() || null,
        duracao: parseInt(formData.duracao) || 30,
        preco: parseFloat(formData.preco.replace(',', '.')) || 0,
        categoria: formData.categoria,
        ativo: formData.ativo,
      };

      if (servicoEditando) {
        const { error } = await supabase
          .from('servicos')
          .update(dadosServico)
          .eq('id', servicoEditando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('servicos')
          .insert(dadosServico);
        if (error) throw error;
      }

      fecharModal();
      carregarServicos();
    } catch (erro) {
      console.error('Erro ao salvar serviço:', erro);
    } finally {
      setSalvando(false);
    }
  };

  const toggleAtivo = async (servico: Servico) => {
    try {
      const { error } = await supabase
        .from('servicos')
        .update({ ativo: !servico.ativo })
        .eq('id', servico.id);

      if (error) throw error;
      carregarServicos();
    } catch (erro) {
      console.error('Erro ao alterar status:', erro);
    }
  };

  const renderServico = ({ item }: { item: Servico }) => (
    <Card pressionavel onPress={() => abrirModal(item)} style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: item.ativo ? 'rgba(255,255,255,0.15)' : CORES.borda.sutil,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name="cut"
            size={24}
            color={item.ativo ? '#ffffff' : CORES.texto.terciario}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: item.ativo ? CORES.texto.primario : CORES.texto.terciario,
              fontSize: 16,
              fontWeight: '600',
            }}
          >
            {item.nome}
          </Text>
          <Text style={{ color: CORES.texto.secundario, fontSize: 14 }}>
            {item.duracao} min • {item.categoria}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={{
              color: item.ativo ? '#10b981' : CORES.texto.terciario,
              fontSize: 18,
              fontWeight: '700',
            }}
          >
            R$ {item.preco.toFixed(2)}
          </Text>
          <Switch
            value={item.ativo}
            onValueChange={() => toggleAtivo(item)}
            trackColor={{ false: CORES.borda.sutil, true: '#10b98150' }}
            thumbColor={item.ativo ? '#10b981' : CORES.texto.terciario}
          />
        </View>
      </View>
    </Card>
  );

  return (
    <View style={{ flex: 1, backgroundColor: CORES.fundo.primario }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 16,
          backgroundColor: CORES.fundo.secundario,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: CORES.texto.primario,
            fontSize: 24,
            fontWeight: '700',
          }}
        >
          Serviços
        </Text>

        <Pressable
          onPress={() => abrirModal()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#ffffff',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="add" size={24} color="#18181b" />
        </Pressable>
      </View>

      {/* Lista */}
      {carregando ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={CORES.primaria.DEFAULT} />
        </View>
      ) : (
        <FlatList
          data={servicos}
          keyExtractor={(item) => item.id}
          renderItem={renderServico}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={atualizando}
              onRefresh={onRefresh}
              tintColor={CORES.primaria.DEFAULT}
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Ionicons name="cut-outline" size={64} color={CORES.texto.terciario} />
              <Text
                style={{
                  color: CORES.texto.secundario,
                  fontSize: 16,
                  marginTop: 16,
                  textAlign: 'center',
                }}
              >
                Nenhum serviço cadastrado
              </Text>
              <Botao
                titulo="Adicionar Serviço"
                variante="primario"
                onPress={() => abrirModal()}
                style={{ marginTop: 20 }}
              />
            </View>
          }
        />
      )}

      {/* Modal */}
      <Modal
        visible={modalAberto}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={fecharModal}
      >
        <View style={{ flex: 1, backgroundColor: CORES.fundo.primario }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: CORES.borda.sutil,
            }}
          >
            <Pressable onPress={fecharModal}>
              <Text style={{ color: CORES.texto.secundario, fontSize: 16 }}>
                Cancelar
              </Text>
            </Pressable>
            <Text
              style={{
                color: CORES.texto.primario,
                fontSize: 18,
                fontWeight: '600',
              }}
            >
              {servicoEditando ? 'Editar Serviço' : 'Novo Serviço'}
            </Text>
            <Pressable onPress={salvarServico} disabled={salvando}>
              <Text
                style={{
                  color: salvando ? CORES.texto.terciario : '#10b981',
                  fontSize: 16,
                  fontWeight: '600',
                }}
              >
                Salvar
              </Text>
            </Pressable>
          </View>

          <View style={{ padding: 20, gap: 16 }}>
            <Input
              rotulo="Nome do Serviço"
              placeholder="Ex: Corte Masculino"
              value={formData.nome}
              onChangeText={(v) => setFormData({ ...formData, nome: v })}
            />
            <Input
              rotulo="Descrição (opcional)"
              placeholder="Descrição do serviço"
              value={formData.descricao}
              onChangeText={(v) => setFormData({ ...formData, descricao: v })}
              multiline
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Input
                  rotulo="Duração (min)"
                  placeholder="30"
                  value={formData.duracao}
                  onChangeText={(v) => setFormData({ ...formData, duracao: v })}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  rotulo="Preço (R$)"
                  placeholder="50,00"
                  value={formData.preco}
                  onChangeText={(v) => setFormData({ ...formData, preco: v })}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 12,
              }}
            >
              <Text style={{ color: CORES.texto.primario, fontSize: 16 }}>
                Serviço ativo
              </Text>
              <Switch
                value={formData.ativo}
                onValueChange={(v) => setFormData({ ...formData, ativo: v })}
                trackColor={{ false: CORES.borda.sutil, true: '#10b98150' }}
                thumbColor={formData.ativo ? '#10b981' : CORES.texto.terciario}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
