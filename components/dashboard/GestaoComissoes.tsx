"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Percent, DollarSign, CheckCircle, Clock } from "lucide-react";
import { Button, Select } from "@radix-ui/themes";
import type { Comissao } from "@/types";

/**
 * Componente de Gestão de Comissões
 * Controle de comissões dos barbeiros
 */
export function GestaoComissoes() {
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());

  // Dados de exemplo - virão do Supabase
  const comissoes: Comissao[] = [];

  const comissoesPendentes = comissoes.filter(c => !c.pago);
  const comissoesPagas = comissoes.filter(c => c.pago);

  const totalPendente = comissoesPendentes.reduce((sum, c) => sum + c.valorComissao, 0);
  const totalPago = comissoesPagas.reduce((sum, c) => sum + c.valorComissao, 0);

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
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            R$ {totalPendente.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
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
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            R$ {totalPago.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
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
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            R$ {(totalPendente + totalPago).toFixed(2)}
          </p>
        </motion.div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row gap-4">
          <Select.Root value={mesSelecionado.toString()} onValueChange={(v) => setMesSelecionado(parseInt(v))}>
            <Select.Trigger className="w-full sm:w-40" placeholder="Mês" />
            <Select.Content>
              <Select.Item value="1">Janeiro</Select.Item>
              <Select.Item value="2">Fevereiro</Select.Item>
              <Select.Item value="3">Março</Select.Item>
              <Select.Item value="4">Abril</Select.Item>
              <Select.Item value="5">Maio</Select.Item>
              <Select.Item value="6">Junho</Select.Item>
              <Select.Item value="7">Julho</Select.Item>
              <Select.Item value="8">Agosto</Select.Item>
              <Select.Item value="9">Setembro</Select.Item>
              <Select.Item value="10">Outubro</Select.Item>
              <Select.Item value="11">Novembro</Select.Item>
              <Select.Item value="12">Dezembro</Select.Item>
            </Select.Content>
          </Select.Root>

          <Select.Root value={anoSelecionado.toString()} onValueChange={(v) => setAnoSelecionado(parseInt(v))}>
            <Select.Trigger className="w-full sm:w-32" placeholder="Ano" />
            <Select.Content>
              <Select.Item value="2024">2024</Select.Item>
              <Select.Item value="2025">2025</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>
      </div>

      {/* Lista de Comissões - Layout Responsivo */}
      {comissoes.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <p className="text-zinc-500 dark:text-zinc-400">
            Nenhuma comissão registrada neste período
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
                    <h3 className="font-semibold text-zinc-900 dark:text-white">Barbeiro</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      comissao.pago
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                    }`}>
                      {comissao.pago ? 'Pago' : 'Pendente'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Valor Serviço:</span>
                      <p className="font-medium text-zinc-900 dark:text-white">R$ {comissao.valorServico.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Percentual:</span>
                      <p className="font-medium text-zinc-900 dark:text-white">{comissao.percentualComissao}%</p>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">Comissão:</span>
                      <p className="text-lg font-bold text-zinc-900 dark:text-white">R$ {comissao.valorComissao.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  {!comissao.pago && (
                    <Button size="2" variant="soft" color="green" className="w-full cursor-pointer">
                      Marcar como Pago
                    </Button>
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
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  Barbeiro
                </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  Valor Serviço
                </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  Percentual
                </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  Comissão
                </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  Status
                </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {comissoes.map((comissao) => (
                  <tr key={comissao.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                      <td className="px-4 lg:px-6 py-4 text-sm text-zinc-900 dark:text-zinc-100">
                      Barbeiro
                    </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-zinc-900 dark:text-zinc-100">
                      R$ {comissao.valorServico.toFixed(2)}
                    </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-zinc-900 dark:text-zinc-100">
                      {comissao.percentualComissao}%
                    </td>
                      <td className="px-4 lg:px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      R$ {comissao.valorComissao.toFixed(2)}
                    </td>
                      <td className="px-4 lg:px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        comissao.pago
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}>
                        {comissao.pago ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                      <td className="px-4 lg:px-6 py-4 text-sm">
                      {!comissao.pago && (
                        <Button size="1" variant="soft" color="green" className="cursor-pointer">
                          Marcar como Pago
                        </Button>
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
