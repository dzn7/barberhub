"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { DollarSign, CheckCircle, Clock, Loader2, User, Calendar, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ComissaoCompleta {
  id: string;
  barbeiro_id: string;
  agendamento_id: string | null;
  valor_servico: number;
  percentual_comissao: number;
  valor_comissao: number;
  pago: boolean;
  data_pagamento: string | null;
  mes: number;
  ano: number;
  criado_em: string;
  barbeiros?: { nome: string };
}

const MESES = [
  { valor: 1, nome: "Janeiro" },
  { valor: 2, nome: "Fevereiro" },
  { valor: 3, nome: "Março" },
  { valor: 4, nome: "Abril" },
  { valor: 5, nome: "Maio" },
  { valor: 6, nome: "Junho" },
  { valor: 7, nome: "Julho" },
  { valor: 8, nome: "Agosto" },
  { valor: 9, nome: "Setembro" },
  { valor: 10, nome: "Outubro" },
  { valor: 11, nome: "Novembro" },
  { valor: 12, nome: "Dezembro" },
];

/**
 * Componente de Gestão de Comissões
 * Controle de comissões dos barbeiros com dados reais do Supabase
 */
export function GestaoComissoes() {
  const { tenant } = useAuth();
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
  const [comissoes, setComissoes] = useState<ComissaoCompleta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);

  const carregarComissoes = useCallback(async () => {
    if (!tenant) return;
    
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from('comissoes')
        .select('*, barbeiros(nome)')
        .eq('tenant_id', tenant.id)
        .eq('mes', mesSelecionado)
        .eq('ano', anoSelecionado)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setComissoes(data || []);
    } catch (error) {
      console.error('Erro ao carregar comissões:', error);
    } finally {
      setCarregando(false);
    }
  }, [tenant, mesSelecionado, anoSelecionado]);

  useEffect(() => {
    carregarComissoes();
  }, [carregarComissoes]);

  const marcarComoPago = async (comissaoId: string) => {
    if (!tenant) return;
    
    setProcessando(comissaoId);
    try {
      const { error } = await supabase
        .from('comissoes')
        .update({ pago: true, data_pagamento: new Date().toISOString().split('T')[0] })
        .eq('id', comissaoId)
        .eq('tenant_id', tenant.id);

      if (error) throw error;
      
      setComissoes(prev => prev.map(c => 
        c.id === comissaoId ? { ...c, pago: true, data_pagamento: new Date().toISOString().split('T')[0] } : c
      ));
    } catch (error) {
      console.error('Erro ao marcar como pago:', error);
    } finally {
      setProcessando(null);
    }
  };

  const comissoesPendentes = comissoes.filter(c => !c.pago);
  const comissoesPagas = comissoes.filter(c => c.pago);
  const totalPendente = comissoesPendentes.reduce((sum, c) => sum + Number(c.valor_comissao || 0), 0);
  const totalPago = comissoesPagas.reduce((sum, c) => sum + Number(c.valor_comissao || 0), 0);

  const getBarbeiroNome = (comissao: ComissaoCompleta) => {
    if (Array.isArray(comissao.barbeiros)) {
      return comissao.barbeiros[0]?.nome || 'Barbeiro';
    }
    return comissao.barbeiros?.nome || 'Barbeiro';
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Gestão de Comissões
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Controle de comissões dos barbeiros
        </p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Total Pendente</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            R$ {totalPendente.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {comissoesPendentes.length} comissões
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Total Pago</span>
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            R$ {totalPago.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {comissoesPagas.length} comissões
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Total do Mês</span>
            <DollarSign className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            R$ {(totalPendente + totalPago).toFixed(2)}
          </p>
        </motion.div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <select
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(Number(e.target.value))}
              className="w-full sm:w-40 appearance-none px-4 py-2.5 pr-10 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
            >
              {MESES.map((mes) => (
                <option key={mes.valor} value={mes.valor}>{mes.nome}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={anoSelecionado}
              onChange={(e) => setAnoSelecionado(Number(e.target.value))}
              className="w-full sm:w-32 appearance-none px-4 py-2.5 pr-10 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Lista de Comissões */}
      {carregando ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
      ) : comissoes.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <DollarSign className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">
            Nenhuma comissão registrada em {MESES.find(m => m.valor === mesSelecionado)?.nome} de {anoSelecionado}
          </p>
        </div>
      ) : (
        <>
          {/* Versão Mobile - Cards */}
          <div className="block md:hidden space-y-4">
            {comissoes.map((comissao) => (
              <motion.div
                key={comissao.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-zinc-500" />
                      <h3 className="font-semibold text-zinc-900 dark:text-white">
                        {getBarbeiroNome(comissao)}
                      </h3>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      comissao.pago
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {comissao.pago ? 'Pago' : 'Pendente'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-zinc-500">Valor Serviço:</span>
                      <p className="font-medium text-zinc-900 dark:text-white">
                        R$ {Number(comissao.valor_servico).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <span className="text-zinc-500">Percentual:</span>
                      <p className="font-medium text-zinc-900 dark:text-white">
                        {Number(comissao.percentual_comissao)}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(parseISO(comissao.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                  
                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-500">Comissão:</span>
                      <p className="text-lg font-bold text-emerald-600">
                        R$ {Number(comissao.valor_comissao).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  {!comissao.pago && (
                    <button
                      onClick={() => marcarComoPago(comissao.id)}
                      disabled={processando === comissao.id}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {processando === comissao.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Marcar como Pago
                    </button>
                  )}
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
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                      Barbeiro
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                      Data
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                      Valor Serviço
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                      Percentual
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                      Comissão
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {comissoes.map((comissao) => (
                    <tr key={comissao.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="px-4 lg:px-6 py-4 text-sm text-zinc-900 dark:text-zinc-100">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-zinc-400" />
                          {getBarbeiroNome(comissao)}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-zinc-500">
                        {format(parseISO(comissao.criado_em), "dd/MM/yyyy", { locale: ptBR })}
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-zinc-900 dark:text-zinc-100">
                        R$ {Number(comissao.valor_servico).toFixed(2)}
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-zinc-900 dark:text-zinc-100">
                        {Number(comissao.percentual_comissao)}%
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm font-medium text-emerald-600">
                        R$ {Number(comissao.valor_comissao).toFixed(2)}
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          comissao.pago
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          {comissao.pago ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm">
                        {!comissao.pago && (
                          <button
                            onClick={() => marcarComoPago(comissao.id)}
                            disabled={processando === comissao.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                          >
                            {processando === comissao.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle className="w-3 h-3" />
                            )}
                            Pagar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
