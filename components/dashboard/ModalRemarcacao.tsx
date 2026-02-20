"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Calendar, Clock, AlertCircle, Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format, addDays, setHours, setMinutes, parseISO, isSameDay, parse, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { gerarTodosHorarios } from "@/lib/horarios";
import { obterEmojiPrincipal, obterTerminologia } from "@/lib/configuracoes-negocio";
import { TipoNegocio } from "@/lib/tipos-negocio";
import { useAuth } from "@/contexts/AuthContext";
import { buscarConfiguracaoHorarios, ConfiguracaoHorarios, HORARIOS_PADRAO, DIAS_SEMANA_ABREV } from "@/lib/horarios-funcionamento";

const BOT_URL = process.env.NEXT_PUBLIC_BOT_URL || 'https://bot-barberhub.fly.dev';

interface Agendamento {
  id: string;
  data_hora: string;
  status: string;
  clientes: {
    nome: string;
    telefone: string;
  };
  barbeiros: {
    id: string;
    nome: string;
  };
  servicos: {
    nome: string;
    preco: number;
    duracao: number;
  };
}

interface HorarioDisponivel {
  hora: string;
  disponivel: boolean;
  agendamento?: {
    cliente: string;
    servico: string;
  };
}

interface ModalRemarcacaoProps {
  agendamento: Agendamento;
  aberto: boolean;
  onFechar: () => void;
  onSucesso: () => void;
  tipoNegocio?: TipoNegocio;
  nomeEstabelecimento?: string;
}

/**
 * Modal Inteligente de Remarcação
 * Mostra disponibilidade de horários em tempo real
 */
export function ModalRemarcacao({ agendamento, aberto, onFechar, onSucesso, tipoNegocio = 'barbearia', nomeEstabelecimento }: ModalRemarcacaoProps) {
  const { tenant } = useAuth();
  const terminologia = obterTerminologia(tipoNegocio);
  const emoji = obterEmojiPrincipal(tipoNegocio);
  const [dataSelecionada, setDataSelecionada] = useState<Date>(new Date());
  const [horarioSelecionado, setHorarioSelecionado] = useState<string>("");
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<HorarioDisponivel[]>([]);
  const [motivo, setMotivo] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [configHorarios, setConfigHorarios] = useState<ConfiguracaoHorarios>(HORARIOS_PADRAO);

  // Buscar configuração de horários do tenant
  useEffect(() => {
    const carregarConfiguracao = async () => {
      if (tenant?.id) {
        const config = await buscarConfiguracaoHorarios(tenant.id, supabase);
        setConfigHorarios(config);
      }
    };
    carregarConfiguracao();
  }, [tenant?.id]);

  // Gerar próximos 14 dias, filtrando apenas dias de funcionamento
  const proximosDias = useMemo(() => {
    const dias: Date[] = [];
    let diaAtual = new Date();
    let tentativas = 0;
    
    while (dias.length < 14 && tentativas < 30) {
      const diaSemana = diaAtual.getDay();
      const abrevDia = DIAS_SEMANA_ABREV[diaSemana];
      
      // Verificar se o dia está nos dias de funcionamento
      if (configHorarios.diasFuncionamento.includes(abrevDia)) {
        dias.push(new Date(diaAtual));
      }
      
      diaAtual = addDays(diaAtual, 1);
      tentativas++;
    }
    
    return dias;
  }, [configHorarios.diasFuncionamento]);

  useEffect(() => {
    if (aberto && dataSelecionada) {
      buscarHorariosDisponiveis();
    }
  }, [dataSelecionada, aberto]);

  // Bloquear scroll do body quando modal está aberto
  useEffect(() => {
    if (aberto) {
      // Salvar o estado atual do overflow
      const originalStyle = window.getComputedStyle(document.body).overflow;
      // Bloquear scroll
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restaurar o overflow original quando fechar
        document.body.style.overflow = originalStyle;
      };
    }
  }, [aberto]);

  const buscarHorariosDisponiveis = async () => {
    setCarregando(true);
    try {
      // Buscar agendamentos do barbeiro nesta data
      const inicioDia = new Date(dataSelecionada);
      inicioDia.setHours(0, 0, 0, 0);
      
      const fimDia = new Date(dataSelecionada);
      fimDia.setHours(23, 59, 59, 999);

      console.log("🔍 Buscando agendamentos para:", {
        barbeiro_id: agendamento.barbeiros.id,
        barbeiro_nome: agendamento.barbeiros.nome,
        data: format(dataSelecionada, "dd/MM/yyyy"),
        inicioDia: inicioDia.toISOString(),
        fimDia: fimDia.toISOString(),
      });

      // Buscar agendamentos do barbeiro nesta data
      const { data: agendamentosData, error: erroAgendamentos } = await supabase
        .from("agendamentos")
        .select(`
          id,
          data_hora,
          status,
          servicos (nome, duracao)
        `)
        .eq("barbeiro_id", agendamento.barbeiros.id)
        .gte("data_hora", inicioDia.toISOString())
        .lte("data_hora", fimDia.toISOString())
        .neq("status", "cancelado");

      if (erroAgendamentos) {
        console.error("❌ Erro ao buscar agendamentos:", erroAgendamentos);
        setCarregando(false);
        return;
      }

      console.log("✅ Agendamentos encontrados:", agendamentosData?.length || 0);

      // Buscar horários bloqueados
      const dataFormatada = format(dataSelecionada, "yyyy-MM-dd");
      const { data: bloqueiosData, error: erroBloqueios } = await supabase
        .from("horarios_bloqueados")
        .select("*")
        .eq("data", dataFormatada)
        .or(`barbeiro_id.is.null,barbeiro_id.eq.${agendamento.barbeiros.id}`);

      if (erroBloqueios) {
        console.error("❌ Erro ao buscar bloqueios:", erroBloqueios);
      }

      console.log("🔒 Bloqueios encontrados:", bloqueiosData?.length || 0);

      // Converter agendamentos para formato {horario, duracao}
      const horariosOcupadosAgendamentos = (agendamentosData || [])
        .filter((ag: any) => ag.id !== agendamento.id) // Excluir o agendamento atual
        .map((ag: any) => ({
          horario: format(parseISO(ag.data_hora), "HH:mm"),
          duracao: ag.servicos?.duracao || 30
        }));

      // Converter bloqueios para formato {horario, duracao}
      const horariosOcupadosBloqueios: Array<{horario: string, duracao: number}> = [];
      if (bloqueiosData) {
        bloqueiosData.forEach((bloqueio: any) => {
          const horaInicioStr = bloqueio.horario_inicio.substring(0, 5);
          const horaFimStr = bloqueio.horario_fim.substring(0, 5);
          
          const dataBase = new Date(2000, 0, 1);
          const inicioBloqueio = parse(horaInicioStr, 'HH:mm', dataBase);
          const fimBloqueio = parse(horaFimStr, 'HH:mm', dataBase);
          
          let horarioAtual = inicioBloqueio;
          while (horarioAtual < fimBloqueio) {
            const horarioFormatado = format(horarioAtual, 'HH:mm');
            const tempoRestante = Math.ceil((fimBloqueio.getTime() - horarioAtual.getTime()) / 60000);
            const duracaoBloqueio = Math.min(20, tempoRestante);
            
            horariosOcupadosBloqueios.push({
              horario: horarioFormatado,
              duracao: duracaoBloqueio
            });
            
            horarioAtual = new Date(horarioAtual.getTime() + 20 * 60000);
          }
        });
      }

      // Combinar agendamentos e bloqueios
      const horariosOcupados = [...horariosOcupadosAgendamentos, ...horariosOcupadosBloqueios];

      console.log("🔴 Horários ocupados:", horariosOcupados);

      // Gerar todos os horários usando configuração do tenant
      const duracaoServico = agendamento.servicos.duracao;
      const horaInicioFormatada = `${configHorarios.horaInicio.toString().padStart(2, '0')}:00`;
      const horaFimFormatada = `${configHorarios.horaFim.toString().padStart(2, '0')}:00`;
      const todosHorarios = gerarTodosHorarios(duracaoServico, horariosOcupados, {
        inicio: horaInicioFormatada,
        fim: horaFimFormatada,
        intervaloHorarios: configHorarios.intervalo || 20
      });

      console.log("📋 Total de horários gerados:", todosHorarios.length);

      // Converter para formato do componente
      const horarios: HorarioDisponivel[] = todosHorarios.map((h) => {
        const ocupado = horariosOcupados.find((ho: any) => ho.horario === h.horario);
        
        return {
          hora: h.horario,
          disponivel: h.disponivel,
          agendamento: ocupado ? {
            cliente: "Ocupado",
            servico: "Agendamento existente"
          } : undefined
        };
      });

      console.log("✅ Horários disponíveis:", horarios.filter(h => h.disponivel).length);
      setHorariosDisponiveis(horarios);
    } catch (error) {
      console.error("Erro ao buscar horários:", error);
    } finally {
      setCarregando(false);
    }
  };

  const remarcar = async () => {
    if (!horarioSelecionado) {
      alert("⚠️ Selecione um horário");
      return;
    }

    setSalvando(true);
    try {
      const [h, m] = horarioSelecionado.split(":").map(Number);
      const novaDataHora = setMinutes(setHours(new Date(dataSelecionada), h), m);

      // Atualizar agendamento
      const { error: erroUpdate } = await supabase
        .from("agendamentos")
        .update({ data_hora: novaDataHora.toISOString() })
        .eq("id", agendamento.id);

      if (erroUpdate) throw erroUpdate;

      // Registrar histórico
      await supabase.from("historico_agendamentos").insert({
        agendamento_id: agendamento.id,
        data_hora_anterior: agendamento.data_hora,
        data_hora_nova: novaDataHora.toISOString(),
        motivo: motivo || "Remarcação via dashboard",
        alterado_por: localStorage.getItem("admin_email") || "admin",
      });

      // Notificar cliente
      await notificarCliente(novaDataHora);

      alert("✅ Agendamento remarcado com sucesso!");
      onSucesso();
      onFechar();
    } catch (error) {
      console.error("Erro ao remarcar:", error);
      alert("❌ Erro ao remarcar agendamento");
    } finally {
      setSalvando(false);
    }
  };

  const notificarCliente = async (novaDataHora: Date) => {
    try {
      const dataFormatada = format(novaDataHora, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      const mensagem = `🔄 *Agendamento Remarcado*\n\nOlá ${agendamento.clientes.nome}!\n\nSeu agendamento foi remarcado:\n\n📅 *Nova Data:* ${dataFormatada}\n${emoji} *Serviço:* ${agendamento.servicos.nome}\n👤 *${terminologia.profissional.singular}:* ${agendamento.barbeiros.nome}\n💰 *Valor:* R$ ${agendamento.servicos.preco.toFixed(2)}\n\n${motivo ? `📝 *Motivo:* ${motivo}\n\n` : ""}Qualquer dúvida, entre em contato!\n\n_${nomeEstabelecimento || 'BarberHub'}_`;

      // Limpar e formatar número
      let telefone = agendamento.clientes.telefone.replace(/\D/g, '');
      
      // Adicionar código do país se não tiver
      if (!telefone.startsWith('55')) {
        telefone = '55' + telefone;
      }
      
      // Remover o 9 extra se tiver 13 dígitos (formato antigo)
      if (telefone.length === 13 && telefone.charAt(4) === '9') {
        telefone = telefone.substring(0, 4) + telefone.substring(5);
      }

      console.log("[Remarcação] Enviando notificação para:", telefone);
      console.log("[Remarcação] URL do bot:", BOT_URL);

      const response = await fetch(`${BOT_URL}/api/mensagens/enviar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero: telefone,
          mensagem,
        }),
      });

      const resultado = await response.json();
      console.log("[Remarcação] Resposta do bot:", resultado);

      if (!response.ok || !resultado.sucesso) {
        console.error("[Remarcação] Falha ao enviar notificação:", resultado);
      } else {
        console.log("[Remarcação] ✅ Notificação enviada com sucesso!");
      }
    } catch (error) {
      console.error("[Remarcação] ❌ Erro ao notificar:", error);
    }
  };

  if (!aberto) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        // Fechar ao clicar no overlay
        if (e.target === e.currentTarget) {
          onFechar();
        }
      }}
    >
      {/* Overlay com backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      
      <div
        className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
          {/* Header - fixo */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                Remarcar Agendamento
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                {agendamento.clientes.nome} • {agendamento.servicos.nome}
              </p>
            </div>
            <button
              onClick={onFechar}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors self-end sm:self-auto"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content - scrollável */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Seleção de Data */}
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Selecione a Data
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin">
                  {proximosDias.map((dia) => {
                    const ehHoje = isToday(dia);
                    const ehSelecionado = isSameDay(dia, dataSelecionada);

                    return (
                      <button
                        key={dia.toISOString()}
                        onClick={() => {
                          setDataSelecionada(dia);
                          setHorarioSelecionado("");
                        }}
                        className={`flex-shrink-0 w-16 sm:w-20 p-2 sm:p-3 rounded-xl text-center transition-all ${
                          ehSelecionado
                            ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-lg ring-2 ring-zinc-900 dark:ring-white"
                            : ehHoje
                            ? "bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                            : "bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                        }`}
                      >
                        <div className={`text-[10px] sm:text-xs uppercase font-medium ${
                          ehSelecionado ? "text-white/70 dark:text-zinc-900/70" : "text-zinc-500 dark:text-zinc-400"
                        }`}>
                          {format(dia, "EEE", { locale: ptBR })}
                        </div>
                        <div className={`text-lg sm:text-xl font-bold ${
                          ehSelecionado ? "" : "text-zinc-900 dark:text-white"
                        }`}>
                          {format(dia, "dd")}
                        </div>
                        <div className={`text-[10px] sm:text-xs ${
                          ehSelecionado ? "text-white/70 dark:text-zinc-900/70" : "text-zinc-400 dark:text-zinc-500"
                        }`}>
                          {format(dia, "MMM", { locale: ptBR })}
                        </div>
                        {ehHoje && !ehSelecionado && (
                          <div className="text-[9px] mt-0.5 text-blue-600 dark:text-blue-400 font-medium">Hoje</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seleção de Horário */}
              <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="hidden sm:inline">Selecione o Horário (intervalo de 20min)</span>
                    <span className="sm:hidden">Selecione o Horário</span>
                  </h3>
                  {!carregando && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {horariosDisponiveis.filter(h => h.disponivel).length} disponíveis
                    </span>
                  )}
                </div>
                {carregando ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-white"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-96 overflow-y-auto pr-2">
                    {horariosDisponiveis.map((horario) => {
                      const ehSelecionado = horarioSelecionado === horario.hora;
                      const ehOcupado = !horario.disponivel;

                      return (
                        <button
                          key={horario.hora}
                          onClick={() => {
                            if (horario.disponivel) {
                              setHorarioSelecionado(horario.hora);
                            }
                          }}
                          disabled={ehOcupado}
                          className={`relative p-2 sm:p-2.5 rounded-lg text-center transition-all ${
                            ehOcupado
                              ? "bg-red-500/90 dark:bg-red-600/90 cursor-not-allowed"
                              : ehSelecionado
                              ? "bg-emerald-500 dark:bg-emerald-500 text-white shadow-lg ring-2 ring-emerald-300 dark:ring-emerald-400 scale-105"
                              : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md"
                          }`}
                        >
                          {/* Badge de ocupado */}
                          {ehOcupado && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center shadow-sm">
                              <X className="w-2.5 h-2.5 text-red-600 dark:text-red-400" />
                            </div>
                          )}
                          
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`font-bold text-sm ${
                              ehOcupado
                                ? "text-white line-through opacity-80"
                                : ehSelecionado 
                                ? "text-white" 
                                : "text-zinc-900 dark:text-white"
                            }`}>
                              {horario.hora}
                            </span>
                            <span className={`text-[9px] sm:text-[10px] font-medium ${
                              ehOcupado
                                ? "text-white/80"
                                : ehSelecionado 
                                ? "text-white/80" 
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}>
                              {ehOcupado ? "Ocupado" : "Livre"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {!carregando && horariosDisponiveis.length === 0 && (
                  <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                    Nenhum horário disponível para esta data
                  </div>
                )}
              </div>
            </div>

            {/* Motivo */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Motivo da Remarcação (opcional)
              </label>
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex: Conflito de agenda"
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
              />
            </div>

            {/* Alerta */}
            <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-300">
                  O cliente receberá automaticamente uma mensagem no WhatsApp com os novos detalhes.
                </div>
              </div>
            </div>
          </div>

          {/* Footer - fixo */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 p-4 sm:p-6 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-shrink-0">
            <button 
              onClick={onFechar} 
              className="px-4 py-2.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors font-medium w-full sm:w-auto"
            >
              Cancelar
            </button>
            <button
              onClick={remarcar}
              disabled={!horarioSelecionado || salvando}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
              {salvando ? "Remarcando..." : "Remarcar e Notificar"}
            </button>
          </div>
      </div>
    </div>
  );
}
