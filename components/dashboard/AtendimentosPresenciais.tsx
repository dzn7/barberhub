"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Users, DollarSign, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { Button, Select, TextField } from "@radix-ui/themes";
import type { AtendimentoPresencial, FormaPagamento } from "@/types";
import { supabase } from "@/lib/supabase";
import { startOfDay, endOfDay } from "date-fns";

/**
 * Componente de Atendimentos Presenciais
 * Registro de clientes walk-in (sem agendamento)
 */
export function AtendimentosPresenciais() {
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteNome, setClienteNome] = useState("");
  const [clienteTelefone, setClienteTelefone] = useState("");
  const [barbeiroId, setBarbeiroId] = useState("");
  const [servicoId, setServicoId] = useState("");
  const [valor, setValor] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("dinheiro");
  const [carregando, setCarregando] = useState(false);
  const [barbeiros, setBarbeiros] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [atendimentos, setAtendimentos] = useState<any[]>([]);

  useEffect(() => {
    buscarDados();
    buscarAtendimentos();
  }, []);

  const buscarDados = async () => {
    try {
      // Buscar barbeiros
      const { data: barbeirosData, error: erroBarbeiros } = await supabase
        .from('barbeiros')
        .select('id, nome')
        .eq('ativo', true);

      if (erroBarbeiros) throw erroBarbeiros;

      // Buscar serviços
      const { data: servicosData, error: erroServicos } = await supabase
        .from('servicos')
        .select('id, nome, preco')
        .eq('ativo', true);

      if (erroServicos) throw erroServicos;

      setBarbeiros(barbeirosData || []);
      setServicos(servicosData || []);
      
      // Selecionar automaticamente o primeiro barbeiro
      if (barbeirosData && barbeirosData.length > 0) {
        setBarbeiroId(barbeirosData[0].id);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    }
  };

  const buscarAtendimentos = async () => {
    try {
      const hoje = new Date();
      const inicioHoje = startOfDay(hoje).toISOString();
      const fimHoje = endOfDay(hoje).toISOString();

      const { data, error } = await supabase
        .from('atendimentos_presenciais')
        .select(`
          *,
          barbeiros (nome),
          servicos (nome)
        `)
        .gte('data', inicioHoje)
        .lte('data', fimHoje)
        .order('data', { ascending: false });

      if (error) throw error;

      console.log('Atendimentos carregados:', data);
      setAtendimentos(data || []);
    } catch (error) {
      console.error('Erro ao buscar atendimentos:', error);
    }
  };

  const salvarAtendimento = async () => {
    // Validar campos obrigatórios
    if (!clienteNome.trim()) {
      alert("❌ Por favor, digite o nome do cliente");
      return;
    }
    
    if (!barbeiroId) {
      alert("❌ Por favor, selecione um barbeiro");
      return;
    }
    
    if (!servicoId) {
      alert("❌ Por favor, selecione um serviço");
      return;
    }
    
    if (!valor || parseFloat(valor) <= 0) {
      alert("❌ Por favor, digite um valor válido");
      return;
    }
    
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from('atendimentos_presenciais')
        .insert([{
          cliente_nome: clienteNome,
          cliente_telefone: clienteTelefone || null,
          barbeiro_id: barbeiroId,
          servico_id: servicoId,
          valor: parseFloat(valor),
          forma_pagamento: formaPagamento,
          data: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;

      console.log('Atendimento salvo:', data);
      
      // Limpar formulário
      setClienteNome("");
      setClienteTelefone("");
      setBarbeiroId(barbeiros.length > 0 ? barbeiros[0].id : "");
      setServicoId("");
      setValor("");
      setFormaPagamento("dinheiro");
      setModalAberto(false);

      // Recarregar atendimentos
      buscarAtendimentos();
      
      alert("✅ Atendimento registrado com sucesso!");
    } catch (error: any) {
      console.error('Erro ao salvar atendimento:', error);
      alert(`❌ Erro ao salvar: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Atendimentos Presenciais
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Registro de clientes walk-in
          </p>
        </div>
        <Button
          onClick={() => setModalAberto(true)}
          className="bg-zinc-900 dark:bg-white text-white dark:text-black cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Atendimento
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Total Hoje</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">{atendimentos.length}</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">atendimentos</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Receita Hoje</span>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            R$ {atendimentos.reduce((sum, a) => sum + a.valor, 0).toFixed(2)}
          </p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">em atendimentos</p>
        </motion.div>
      </div>

      {/* Lista de Atendimentos - Layout Responsivo */}
      {atendimentos.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <p className="text-zinc-500 dark:text-zinc-400">
            Nenhum atendimento registrado hoje
          </p>
        </div>
      ) : (
        <>
          {/* Versão Mobile - Cards */}
          <div className="block md:hidden space-y-4">
            {atendimentos.map((atendimento) => (
              <motion.div
                key={atendimento.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-zinc-900 dark:text-white">{atendimento.cliente_nome}</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        {new Date(atendimento.data).toLocaleString('pt-BR', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-400">
                      {atendimento.forma_pagamento}
                    </span>
                  </div>
                  
                  {atendimento.cliente_telefone && (
                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <Phone className="w-3 h-3" />
                      <span>{atendimento.cliente_telefone}</span>
                      <a
                        href={`https://wa.me/55${atendimento.cliente_telefone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400 transition-colors ml-auto"
                        title="Enviar WhatsApp"
                      >
                        <WhatsAppIcon size={16} />
                      </a>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">Barbeiro:</span>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white mt-1">
                        {atendimento.barbeiros?.nome || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">Serviço:</span>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white mt-1">
                        {atendimento.servicos?.nome || 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">Valor:</span>
                      <p className="text-lg font-bold text-zinc-900 dark:text-white">R$ {atendimento.valor.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Versão Desktop - Tabela */}
          <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
              <table className="w-full min-w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800">
              <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  Data/Hora
                </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  Cliente
                </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  Barbeiro
                </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  Serviço
                </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  Valor
                </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  Pagamento
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {atendimentos.map((atendimento) => (
                  <tr key={atendimento.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                      <td className="px-4 lg:px-6 py-4 text-sm text-zinc-900 dark:text-zinc-100">
                      {new Date(atendimento.data).toLocaleString('pt-BR')}
                    </td>
                      <td className="px-4 lg:px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {atendimento.cliente_nome}
                        </div>
                        {atendimento.cliente_telefone && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2 mt-1">
                            <Phone className="w-3 h-3" />
                            {atendimento.cliente_telefone}
                            <a
                              href={`https://wa.me/55${atendimento.cliente_telefone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400 transition-colors"
                              title="Enviar WhatsApp"
                            >
                              <WhatsAppIcon size={14} />
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-zinc-900 dark:text-zinc-100">
                      {atendimento.barbeiros?.nome || 'N/A'}
                    </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-zinc-900 dark:text-zinc-100">
                      {atendimento.servicos?.nome || 'N/A'}
                    </td>
                      <td className="px-4 lg:px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      R$ {atendimento.valor.toFixed(2)}
                    </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {atendimento.forma_pagamento}
                    </td>
                  </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* Modal de Novo Atendimento */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
              Novo Atendimento Presencial
            </h3>

            <div className="space-y-4">
              {/* Nome do Cliente */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Nome do Cliente
                </label>
                <TextField.Root
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  placeholder="Nome completo"
                  required
                />
              </div>

              {/* Telefone (opcional) */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Telefone (opcional)
                </label>
                <TextField.Root
                  type="tel"
                  value={clienteTelefone}
                  onChange={(e) => setClienteTelefone(e.target.value)}
                  placeholder="(86) 99999-9999"
                />
              </div>

              {/* Barbeiro */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Barbeiro
                </label>
                <Select.Root value={barbeiroId} onValueChange={setBarbeiroId}>
                  <Select.Trigger className="w-full" placeholder="Selecione o barbeiro" />
                  <Select.Content>
                    {barbeiros.map((barbeiro) => (
                      <Select.Item key={barbeiro.id} value={barbeiro.id}>
                        {barbeiro.nome}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>

              {/* Serviço */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Serviço
                </label>
                <Select.Root 
                  value={servicoId} 
                  onValueChange={(value) => {
                    setServicoId(value);
                    const servico = servicos.find(s => s.id === value);
                    if (servico) setValor(servico.preco.toString());
                  }}
                >
                  <Select.Trigger className="w-full" placeholder="Selecione o serviço" />
                  <Select.Content>
                    {servicos.map((servico) => (
                      <Select.Item key={servico.id} value={servico.id}>
                        {servico.nome} - R$ {servico.preco}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>

              {/* Valor */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Valor
                </label>
                <TextField.Root
                  type="number"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0,00"
                  required
                />
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Forma de Pagamento
                </label>
                <Select.Root value={formaPagamento} onValueChange={(v) => setFormaPagamento(v as FormaPagamento)}>
                  <Select.Trigger className="w-full" />
                  <Select.Content>
                    <Select.Item value="dinheiro">Dinheiro</Select.Item>
                    <Select.Item value="pix">PIX</Select.Item>
                    <Select.Item value="debito">Débito</Select.Item>
                    <Select.Item value="credito">Crédito</Select.Item>
                    <Select.Item value="transferencia">Transferência</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setModalAberto(false)}
                variant="outline"
                className="flex-1 cursor-pointer"
                disabled={carregando}
              >
                Cancelar
              </Button>
              <Button
                onClick={salvarAtendimento}
                className="flex-1 bg-zinc-900 dark:bg-white text-white dark:text-black cursor-pointer"
                disabled={carregando}
              >
                {carregando ? 'Salvando...' : 'Registrar'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
