"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Save, CheckCircle, XCircle, AlertCircle, Ban, Calendar as CalendarIcon, X } from "lucide-react";
import { Button, Switch, Select, TextField, TextArea } from "@radix-ui/themes";
import { supabase } from "@/lib/supabase";
import { ModalPortal } from "@/components/ui/modal-portal";
import { useAuth } from "@/contexts/AuthContext";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HorarioDia {
  aberto: boolean;
  inicio: string;
  fim: string;
}

interface HorarioSemana {
  segunda: HorarioDia;
  terca: HorarioDia;
  quarta: HorarioDia;
  quinta: HorarioDia;
  sexta: HorarioDia;
  sabado: HorarioDia;
  domingo: HorarioDia;
}

interface ModalFeedback {
  aberto: boolean;
  tipo: 'sucesso' | 'erro';
  titulo: string;
  mensagem: string;
}

const diasSemana = [
  { key: 'segunda', label: 'Segunda-feira' },
  { key: 'terca', label: 'Terça-feira' },
  { key: 'quarta', label: 'Quarta-feira' },
  { key: 'quinta', label: 'Quinta-feira' },
  { key: 'sexta', label: 'Sexta-feira' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
];

/**
 * Componente de Gestão de Horários
 * Permite configurar horário de funcionamento da barbearia
 */
export function GestaoHorarios() {
  const { tenant } = useAuth();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [modalBloqueioAberto, setModalBloqueioAberto] = useState(false);
  const [dataBloqueio, setDataBloqueio] = useState("");
  const [horarioBloqueio, setHorarioBloqueio] = useState("");
  const [motivoBloqueio, setMotivoBloqueio] = useState("");
  const [barbeiros, setBarbeiros] = useState<any[]>([]);
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState("");
  const [horarios, setHorarios] = useState<HorarioSemana>({
    segunda: { aberto: true, inicio: "09:00", fim: "18:00" },
    terca: { aberto: true, inicio: "09:00", fim: "18:00" },
    quarta: { aberto: true, inicio: "09:00", fim: "18:00" },
    quinta: { aberto: true, inicio: "09:00", fim: "18:00" },
    sexta: { aberto: true, inicio: "09:00", fim: "18:00" },
    sabado: { aberto: true, inicio: "09:00", fim: "18:00" },
    domingo: { aberto: false, inicio: "09:00", fim: "18:00" },
  });
  const [modalFeedback, setModalFeedback] = useState<ModalFeedback>({
    aberto: false,
    tipo: 'sucesso',
    titulo: '',
    mensagem: '',
  });

  useEffect(() => {
    if (tenant) {
      buscarHorarios();
      buscarBarbeiros();
    }
  }, [tenant]);

  const buscarBarbeiros = async () => {
    if (!tenant) return;
    
    try {
      const { data, error } = await supabase
        .from('barbeiros')
        .select('id, nome')
        .eq('tenant_id', tenant.id)
        .eq('ativo', true);

      if (error) throw error;
      setBarbeiros(data || []);
    } catch (error) {
      console.error('Erro ao buscar barbeiros:', error);
    }
  };

  const buscarHorarios = async () => {
    if (!tenant) return;
    
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('tenant_id', tenant.id)
        .eq('chave', 'horario_funcionamento')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.valor) {
        setHorarios(data.valor as HorarioSemana);
      }
    } catch (error) {
      console.error('Erro ao buscar horários:', error);
    } finally {
      setCarregando(false);
    }
  };

  const mostrarFeedback = (tipo: 'sucesso' | 'erro', titulo: string, mensagem: string) => {
    setModalFeedback({
      aberto: true,
      tipo,
      titulo,
      mensagem,
    });
  };

  const atualizarHorario = (dia: keyof HorarioSemana, campo: keyof HorarioDia, valor: any) => {
    setHorarios(prev => ({
      ...prev,
      [dia]: {
        ...prev[dia],
        [campo]: valor,
      },
    }));
  };

  const salvarHorarios = async () => {
    setSalvando(true);
    try {
      const { error } = await supabase
        .from('configuracoes')
        .update({
          valor: horarios,
          atualizado_em: new Date().toISOString(),
        })
        .eq('chave', 'horario_funcionamento');

      if (error) throw error;

      mostrarFeedback('sucesso', 'Horários atualizados', 'Os horários de funcionamento foram salvos com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar horários:', error);
      mostrarFeedback('erro', 'Erro ao salvar', error.message || 'Erro desconhecido');
    } finally {
      setSalvando(false);
    }
  };

  const aplicarParaTodos = (horarioBase: HorarioDia) => {
    const novosHorarios = { ...horarios };
    diasSemana.forEach(dia => {
      if (dia.key !== 'domingo') {
        novosHorarios[dia.key as keyof HorarioSemana] = { ...horarioBase };
      }
    });
    setHorarios(novosHorarios);
  };

  const criarBloqueio = async () => {
    if (!dataBloqueio || !horarioBloqueio) {
      mostrarFeedback('erro', 'Campos obrigatórios', 'Preencha a data e o horário do bloqueio');
      return;
    }

    try {
      const dataHora = `${dataBloqueio}T${horarioBloqueio}:00`;
      
      const { error } = await supabase
        .from('horarios_bloqueados')
        .insert({
          barbeiro_id: barbeiroSelecionado || null,
          data_hora: dataHora,
          motivo: motivoBloqueio || 'Bloqueio manual',
          tipo: 'bloqueio_manual'
        });

      if (error) throw error;

      mostrarFeedback('sucesso', 'Horário bloqueado', 'O horário foi bloqueado com sucesso!');
      setModalBloqueioAberto(false);
      
      // Limpar campos
      setDataBloqueio("");
      setHorarioBloqueio("");
      setMotivoBloqueio("");
      setBarbeiroSelecionado("");
    } catch (error: any) {
      console.error('Erro ao criar bloqueio:', error);
      mostrarFeedback('erro', 'Erro ao bloquear', error.message || 'Não foi possível bloquear o horário');
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
            Horário de Funcionamento
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mt-1">
            Configure os horários que aparecem em todo o site
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button
            onClick={() => setModalBloqueioAberto(true)}
            variant="outline"
            className="cursor-pointer w-full sm:w-auto"
          >
            <Ban className="w-4 h-4 mr-2" />
            Bloquear Horário
          </Button>
          <Button
            onClick={salvarHorarios}
            disabled={salvando}
            className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 cursor-pointer w-full sm:w-auto"
          >
            <Save className="w-4 h-4 mr-2" />
            {salvando ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>

      {/* Ação Rápida */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Ação Rápida
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
              Aplicar o horário de segunda-feira para todos os dias úteis (seg-sáb)
            </p>
            <Button
              size="2"
              variant="soft"
              onClick={() => aplicarParaTodos(horarios.segunda)}
              className="cursor-pointer"
            >
              Aplicar horário padrão
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de Horários */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {diasSemana.map((dia) => {
            const horarioDia = horarios[dia.key as keyof HorarioSemana];
            
            return (
              <motion.div
                key={dia.key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 sm:p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Dia da semana */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">
                      {dia.label}
                    </h3>
                  </div>

                  {/* Switch Aberto/Fechado */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {horarioDia.aberto ? 'Aberto' : 'Fechado'}
                    </span>
                    <Switch
                      checked={horarioDia.aberto}
                      onCheckedChange={(checked) => 
                        atualizarHorario(dia.key as keyof HorarioSemana, 'aberto', checked)
                      }
                      className="cursor-pointer flex-shrink-0"
                    />
                  </div>

                  {/* Horários */}
                  {horarioDia.aberto && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                          De:
                        </label>
                        <input
                          type="time"
                          value={horarioDia.inicio}
                          onChange={(e) => 
                            atualizarHorario(dia.key as keyof HorarioSemana, 'inicio', e.target.value)
                          }
                          className="px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white min-w-[120px]"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                          Até:
                        </label>
                        <input
                          type="time"
                          value={horarioDia.fim}
                          onChange={(e) => 
                            atualizarHorario(dia.key as keyof HorarioSemana, 'fim', e.target.value)
                          }
                          className="px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white min-w-[120px]"
                        />
                      </div>
                    </div>
                  )}

                  {!horarioDia.aberto && (
                    <div className="text-sm text-red-600 dark:text-red-400 font-medium">
                      Não abre neste dia
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Informação */}
      <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          💡 <strong>Dica:</strong> Os horários configurados aqui serão exibidos automaticamente 
          na página inicial, na seção &quot;Como nos encontrar&quot; e em outras partes do site.
        </p>
      </div>

      {/* Modal de Bloqueio de Horário */}
      <ModalPortal aberto={modalBloqueioAberto} onFechar={() => setModalBloqueioAberto(false)}>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Ban className="w-6 h-6 text-red-500" />
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Bloquear Horário</h2>
            </div>
            <button onClick={() => setModalBloqueioAberto(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>
          
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            Bloqueie um horário específico para impedir novos agendamentos
          </p>

          <div className="space-y-4">
            {/* Data */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Data *
              </label>
              <TextField.Root
                type="date"
                value={dataBloqueio}
                onChange={(e: any) => setDataBloqueio(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                size="3"
              />
            </div>

            {/* Horário */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Horário *
              </label>
              <TextField.Root
                type="time"
                value={horarioBloqueio}
                onChange={(e: any) => setHorarioBloqueio(e.target.value)}
                size="3"
              />
            </div>

            {/* Barbeiro */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Barbeiro (opcional)
              </label>
              <Select.Root value={barbeiroSelecionado || "todos"} onValueChange={(val) => setBarbeiroSelecionado(val === "todos" ? "" : val)}>
                <Select.Trigger placeholder="Todos os barbeiros" className="w-full" />
                <Select.Content>
                  <Select.Item value="todos">Todos os barbeiros</Select.Item>
                  {barbeiros.map((barbeiro) => (
                    <Select.Item key={barbeiro.id} value={barbeiro.id}>
                      {barbeiro.nome}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Motivo (opcional)
              </label>
              <TextArea
                value={motivoBloqueio}
                onChange={(e: any) => setMotivoBloqueio(e.target.value)}
                placeholder="Ex: Reunião, folga, manutenção..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-6">
            <button
              onClick={() => setModalBloqueioAberto(false)}
              className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={criarBloqueio}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Ban className="w-4 h-4" />
              Bloquear
            </button>
          </div>
        </div>
      </ModalPortal>

      {/* Modal de Feedback */}
      <ModalPortal aberto={modalFeedback.aberto} onFechar={() => setModalFeedback({ ...modalFeedback, aberto: false })}>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden w-full max-w-md shadow-2xl border border-zinc-200 dark:border-zinc-800">
          <div className={`p-6 ${
            modalFeedback.tipo === 'sucesso' 
              ? 'bg-green-50 dark:bg-green-900/10' 
              : 'bg-red-50 dark:bg-red-900/10'
          }`}>
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-full ${
                modalFeedback.tipo === 'sucesso' 
                  ? 'bg-green-100 dark:bg-green-900/30' 
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                {modalFeedback.tipo === 'sucesso' ? (
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                )}
              </div>
              
              <div className="flex-1">
                <h3 className={`text-lg font-semibold mb-2 ${
                  modalFeedback.tipo === 'sucesso' 
                    ? 'text-green-900 dark:text-green-100' 
                    : 'text-red-900 dark:text-red-100'
                }`}>
                  {modalFeedback.titulo}
                </h3>
                <p className={`${
                  modalFeedback.tipo === 'sucesso' 
                    ? 'text-green-700 dark:text-green-300' 
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {modalFeedback.mensagem}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-zinc-900 flex gap-3 justify-end">
            <button
              onClick={() => setModalFeedback({ ...modalFeedback, aberto: false })}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                modalFeedback.tipo === 'sucesso'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              Entendi
            </button>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
