"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { addDays, format, isToday, parseISO, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { ModalNovoAgendamento } from "@/components/agendamento";
import {
  buscarConfiguracaoHorarios,
  ConfiguracaoHorarios,
  HORARIOS_PADRAO,
} from "@/lib/horarios-funcionamento";

const TIMEZONE_BRASILIA = "America/Sao_Paulo";
const BREAKPOINT_MOBILE = "(max-width: 1023px)";
const ALTURA_HORA = 72;
const LARGURA_COLUNA = 180;

interface Servico {
  id?: string;
  nome: string;
  preco: number;
  duracao: number;
}

interface Agendamento {
  id: string;
  data_hora: string;
  status: string;
  barbeiro_id: string;
  observacoes?: string;
  servicos_ids?: string[];
  clientes?: { nome: string; telefone: string } | null;
  barbeiros?: { id: string; nome: string } | null;
  servicos?: Servico | null;
  servicosMultiplos?: Servico[];
}

interface Profissional {
  id: string;
  nome: string;
}

interface AgendamentoProcessado extends Agendamento {
  chaveDia: string;
  inicioMin: number;
  fimMin: number;
  horaInicio: string;
  horaFim: string;
  infoServicos: {
    nome: string;
    nomesCurtos: string;
    preco: number;
    duracao: number;
  };
}

interface LayoutAgendamento {
  top: number;
  height: number;
  indiceColuna: number;
  totalColunas: number;
}

type ModoCalendario = "dia" | "semana";

const DIAS_SEMANA_MAP: Record<number, string> = {
  0: "dom",
  1: "seg",
  2: "ter",
  3: "qua",
  4: "qui",
  5: "sex",
  6: "sab",
};

const ESTILOS_STATUS: Record<string, string> = {
  pendente:
    "border-amber-300 bg-amber-100/90 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100",
  confirmado:
    "border-emerald-300 bg-emerald-100/90 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100",
  concluido:
    "border-sky-300 bg-sky-100/90 text-sky-950 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-100",
  cancelado:
    "border-rose-300 bg-rose-100/90 text-rose-950 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-100",
};

function normalizarData(data: Date) {
  const normalizada = new Date(data);
  normalizada.setHours(12, 0, 0, 0);
  return normalizada;
}

function obterInfoServicos(agendamento: Agendamento) {
  const { servicos, servicosMultiplos } = agendamento;

  if (servicosMultiplos && servicosMultiplos.length > 1) {
    const nomes = servicosMultiplos.map((servico) => servico.nome);
    const preco = servicosMultiplos.reduce((total, servico) => total + (servico.preco || 0), 0);
    const duracao = servicosMultiplos.reduce((total, servico) => total + (servico.duracao || 0), 0);

    return {
      nome: nomes.join(" + "),
      nomesCurtos: nomes.length > 2 ? `${nomes[0]} +${nomes.length - 1}` : nomes.join(" + "),
      preco,
      duracao,
    };
  }

  return {
    nome: servicos?.nome || "Serviço",
    nomesCurtos: servicos?.nome || "Serviço",
    preco: servicos?.preco || 0,
    duracao: servicos?.duracao || 30,
  };
}

function calcularLayoutAgendamentosDia(agendamentosDia: AgendamentoProcessado[], horaInicio: number) {
  const eventos = agendamentosDia
    .map((agendamento) => {
      const top = ((agendamento.inicioMin - (horaInicio * 60)) / 60) * ALTURA_HORA;
      const duracaoVisivel = Math.max(agendamento.fimMin - agendamento.inicioMin, 15);
      const height = Math.max((duracaoVisivel / 60) * ALTURA_HORA, 40);
      return {
        agendamento,
        inicioMin: agendamento.inicioMin,
        fimMin: agendamento.fimMin,
        top,
        height,
      };
    })
    .sort((a, b) => a.inicioMin - b.inicioMin);

  type Coluna = { fimMin: number; itens: typeof eventos };
  const colunas: Coluna[] = [];
  const resultado: Record<string, LayoutAgendamento> = {};

  for (const evento of eventos) {
    let indiceColuna = colunas.findIndex((coluna) => coluna.fimMin <= evento.inicioMin);

    if (indiceColuna === -1) {
      colunas.push({ fimMin: evento.fimMin, itens: [evento] });
      indiceColuna = colunas.length - 1;
    } else {
      colunas[indiceColuna].fimMin = evento.fimMin;
      colunas[indiceColuna].itens.push(evento);
    }

    resultado[evento.agendamento.id] = {
      top: evento.top,
      height: evento.height,
      indiceColuna,
      totalColunas: 1,
    };
  }

  for (const evento of eventos) {
    const colunasAtivas = new Set<number>();

    for (let indice = 0; indice < colunas.length; indice += 1) {
      const itens = colunas[indice].itens;
      for (const item of itens) {
        const sobrepoe = !(item.fimMin <= evento.inicioMin || item.inicioMin >= evento.fimMin);
        if (sobrepoe) {
          colunasAtivas.add(indice);
          break;
        }
      }
    }

    resultado[evento.agendamento.id] = {
      ...resultado[evento.agendamento.id],
      totalColunas: Math.max(1, colunasAtivas.size),
    };
  }

  return resultado;
}

export function CalendarioAppBarberNovo() {
  const { tenant } = useAuth();

  const [isMobile, setIsMobile] = useState(false);
  const [modoCalendario, setModoCalendario] = useState<ModoCalendario>("semana");
  const [dataFoco, setDataFoco] = useState(normalizarData(new Date()));
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [profissionalFiltro, setProfissionalFiltro] = useState<string>("todos");
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [processandoConcluirTodos, setProcessandoConcluirTodos] = useState(false);
  const [configHorarios, setConfigHorarios] = useState<ConfiguracaoHorarios>(HORARIOS_PADRAO);
  const [modalNovoAberto, setModalNovoAberto] = useState(false);

  const subscriptionRef = useRef<any>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const modoEfetivo: ModoCalendario = isMobile ? "dia" : modoCalendario;

  const diasExibidos = useMemo(() => {
    const dataBase = normalizarData(dataFoco);
    if (modoEfetivo === "dia") {
      return [dataBase];
    }

    const inicioSemana = startOfWeek(dataBase, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, indice) => addDays(inicioSemana, indice));
  }, [dataFoco, modoEfetivo]);

  const intervaloInicio = diasExibidos[0];
  const intervaloFim = addDays(diasExibidos[diasExibidos.length - 1], 1);

  const faixasHoras = useMemo(() => {
    const inicio = Math.min(configHorarios.horaInicio, configHorarios.horaFim - 1);
    const fim = Math.max(configHorarios.horaFim, inicio + 1);
    return Array.from({ length: fim - inicio }, (_, indice) => inicio + indice);
  }, [configHorarios.horaInicio, configHorarios.horaFim]);

  const alturaGrade = Math.max(faixasHoras.length * ALTURA_HORA, 420);

  const carregarDadosFixos = useCallback(async () => {
    if (!tenant?.id) return;

    const [configuracao, profissionaisResponse] = await Promise.all([
      buscarConfiguracaoHorarios(tenant.id, supabase),
      supabase
        .from("barbeiros")
        .select("id, nome")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .order("nome", { ascending: true }),
    ]);

    setConfigHorarios(configuracao);
    setProfissionais((profissionaisResponse.data || []) as Profissional[]);
  }, [tenant?.id]);

  const buscarAgendamentos = useCallback(async () => {
    if (!tenant?.id || !intervaloInicio || !intervaloFim) return;

    try {
      setCarregando(true);

      const inicioUTC = fromZonedTime(
        `${format(intervaloInicio, "yyyy-MM-dd")}T00:00:00`,
        TIMEZONE_BRASILIA
      );
      const fimUTC = fromZonedTime(
        `${format(intervaloFim, "yyyy-MM-dd")}T00:00:00`,
        TIMEZONE_BRASILIA
      );

      const { data, error } = await supabase
        .from("agendamentos")
        .select("*, clientes (nome, telefone), barbeiros (id, nome), servicos (id, nome, preco, duracao)")
        .eq("tenant_id", tenant.id)
        .gte("data_hora", inicioUTC.toISOString())
        .lt("data_hora", fimUTC.toISOString())
        .order("data_hora", { ascending: true });

      if (error) throw error;

      const base = (data || []) as Agendamento[];
      const idsServicosMultiplos = new Set<string>();

      for (const agendamento of base) {
        if (Array.isArray(agendamento.servicos_ids) && agendamento.servicos_ids.length > 1) {
          for (const servicoId of agendamento.servicos_ids) {
            idsServicosMultiplos.add(servicoId);
          }
        }
      }

      const mapaServicos = new Map<string, Servico>();

      if (idsServicosMultiplos.size > 0) {
        const { data: servicosData } = await supabase
          .from("servicos")
          .select("id, nome, preco, duracao")
          .in("id", Array.from(idsServicosMultiplos));

        for (const servico of (servicosData || []) as Servico[]) {
          if (servico.id) {
            mapaServicos.set(servico.id, servico);
          }
        }
      }

      const processados = base.map((agendamento) => {
        if (!Array.isArray(agendamento.servicos_ids) || agendamento.servicos_ids.length <= 1) {
          return agendamento;
        }

        const servicosMultiplos = agendamento.servicos_ids
          .map((servicoId) => mapaServicos.get(servicoId))
          .filter(Boolean) as Servico[];

        return {
          ...agendamento,
          servicosMultiplos: servicosMultiplos.length > 0 ? servicosMultiplos : agendamento.servicosMultiplos,
        };
      });

      setAgendamentos(processados);
    } catch (error) {
      console.error("Erro ao buscar agendamentos do calendário:", error);
    } finally {
      setCarregando(false);
    }
  }, [tenant?.id, intervaloInicio, intervaloFim]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(BREAKPOINT_MOBILE);
    const atualizar = () => setIsMobile(mediaQuery.matches);

    atualizar();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", atualizar);
    } else {
      mediaQuery.addListener(atualizar);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", atualizar);
      } else {
        mediaQuery.removeListener(atualizar);
      }
    };
  }, []);

  useEffect(() => {
    void carregarDadosFixos();
  }, [carregarDadosFixos]);

  useEffect(() => {
    void buscarAgendamentos();
  }, [buscarAgendamentos]);

  useEffect(() => {
    if (!tenant?.id) return;

    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    const canal = supabase
      .channel(`calendario-google-${tenant.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agendamentos", filter: `tenant_id=eq.${tenant.id}` },
        () => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            void buscarAgendamentos();
          }, 200);
        }
      )
      .subscribe();

    subscriptionRef.current = canal;

    return () => {
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [tenant?.id, buscarAgendamentos]);

  const agendamentosProcessados = useMemo<AgendamentoProcessado[]>(() => {
    const inicioHorario = configHorarios.horaInicio * 60;
    const fimHorario = configHorarios.horaFim * 60;

    return agendamentos
      .filter((agendamento) => {
        if (profissionalFiltro === "todos") return true;
        return (
          agendamento.barbeiro_id === profissionalFiltro ||
          agendamento.barbeiros?.id === profissionalFiltro
        );
      })
      .map((agendamento) => {
        const dataBrasilia = toZonedTime(parseISO(agendamento.data_hora), TIMEZONE_BRASILIA);
        const infoServicos = obterInfoServicos(agendamento);
        const inicioMin = (dataBrasilia.getHours() * 60) + dataBrasilia.getMinutes();
        const fimMin = inicioMin + infoServicos.duracao;

        return {
          ...agendamento,
          chaveDia: format(dataBrasilia, "yyyy-MM-dd"),
          inicioMin,
          fimMin,
          horaInicio: format(dataBrasilia, "HH:mm"),
          horaFim: format(new Date(dataBrasilia.getTime() + (infoServicos.duracao * 60000)), "HH:mm"),
          infoServicos,
        };
      })
      .filter((agendamento) => agendamento.fimMin > inicioHorario && agendamento.inicioMin < fimHorario)
      .map((agendamento) => ({
        ...agendamento,
        inicioMin: Math.max(agendamento.inicioMin, inicioHorario),
        fimMin: Math.min(agendamento.fimMin, fimHorario),
      }))
      .sort((a, b) => a.inicioMin - b.inicioMin);
  }, [agendamentos, profissionalFiltro, configHorarios.horaInicio, configHorarios.horaFim]);

  const agendamentosPorDia = useMemo(() => {
    const grupos: Record<string, AgendamentoProcessado[]> = {};

    diasExibidos.forEach((dia) => {
      grupos[format(dia, "yyyy-MM-dd")] = [];
    });

    agendamentosProcessados.forEach((agendamento) => {
      if (grupos[agendamento.chaveDia]) {
        grupos[agendamento.chaveDia].push(agendamento);
      }
    });

    return grupos;
  }, [agendamentosProcessados, diasExibidos]);

  const layoutPorDia = useMemo(() => {
    const layout: Record<string, Record<string, LayoutAgendamento>> = {};

    diasExibidos.forEach((dia) => {
      const chaveDia = format(dia, "yyyy-MM-dd");
      layout[chaveDia] = calcularLayoutAgendamentosDia(
        agendamentosPorDia[chaveDia] || [],
        configHorarios.horaInicio
      );
    });

    return layout;
  }, [agendamentosPorDia, diasExibidos, configHorarios.horaInicio]);

  const tituloPeriodo = useMemo(() => {
    if (modoEfetivo === "dia") {
      return format(dataFoco, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
    }

    const inicio = diasExibidos[0];
    const fim = diasExibidos[diasExibidos.length - 1];

    if (inicio.getMonth() === fim.getMonth()) {
      return format(inicio, "MMMM 'de' yyyy", { locale: ptBR });
    }

    return `${format(inicio, "dd MMM", { locale: ptBR })} - ${format(fim, "dd MMM yyyy", {
      locale: ptBR,
    })}`;
  }, [modoEfetivo, dataFoco, diasExibidos]);

  const agendamentosConcluiveisDiaFoco = useMemo(() => {
    const chaveDia = format(dataFoco, "yyyy-MM-dd");
    return (agendamentosPorDia[chaveDia] || []).filter((agendamento) =>
      agendamento.status === "confirmado" || agendamento.status === "pendente"
    );
  }, [agendamentosPorDia, dataFoco]);

  const criarTransacaoEComissao = useCallback(async (agendamento: AgendamentoProcessado) => {
    if (!tenant?.id) return;

    try {
      const infoServicos = obterInfoServicos(agendamento);
      const valorServico = infoServicos.preco;
      const barbeiroId = agendamento.barbeiros?.id || agendamento.barbeiro_id;

      if (!barbeiroId) return;

      const dataBrasilia = toZonedTime(parseISO(agendamento.data_hora), TIMEZONE_BRASILIA);
      const dataFormatada = format(dataBrasilia, "yyyy-MM-dd");
      const mes = dataBrasilia.getMonth() + 1;
      const ano = dataBrasilia.getFullYear();

      const { data: barbeiro } = await supabase
        .from("barbeiros")
        .select("comissao_percentual, total_atendimentos")
        .eq("id", barbeiroId)
        .single();

      const percentualComissao = barbeiro?.comissao_percentual || 40;
      const valorComissao = (valorServico * percentualComissao) / 100;

      await supabase.from("transacoes").insert({
        tenant_id: tenant.id,
        tipo: "receita",
        categoria: "servico",
        descricao: `${infoServicos.nome} - ${agendamento.clientes?.nome || "Cliente"}`,
        valor: valorServico,
        data: dataFormatada,
        forma_pagamento: "dinheiro",
        agendamento_id: agendamento.id,
        barbeiro_id: barbeiroId,
      });

      await supabase.from("comissoes").insert({
        tenant_id: tenant.id,
        barbeiro_id: barbeiroId,
        agendamento_id: agendamento.id,
        valor_servico: valorServico,
        percentual_comissao: percentualComissao,
        valor_comissao: valorComissao,
        mes,
        ano,
        pago: false,
      });

      await supabase
        .from("barbeiros")
        .update({ total_atendimentos: (barbeiro?.total_atendimentos || 0) + 1 })
        .eq("id", barbeiroId);
    } catch (error) {
      console.error("Erro ao criar transação/comissão:", error);
    }
  }, [tenant?.id]);

  const concluirTodosDiaFoco = useCallback(async () => {
    if (!tenant?.id) return;

    if (agendamentosConcluiveisDiaFoco.length === 0) {
      alert("Não há agendamentos pendentes ou confirmados para concluir neste dia.");
      return;
    }

    const total = agendamentosConcluiveisDiaFoco.length;
    const dataFormatada = format(dataFoco, "dd/MM/yyyy");
    const confirmou = window.confirm(`Concluir ${total} agendamento(s) do dia ${dataFormatada}?`);
    if (!confirmou) return;

    setProcessandoConcluirTodos(true);

    try {
      const ids = agendamentosConcluiveisDiaFoco.map((agendamento) => agendamento.id);

      const { error } = await supabase
        .from("agendamentos")
        .update({ status: "concluido", concluido_em: new Date().toISOString() })
        .in("id", ids);

      if (error) throw error;

      for (const agendamento of agendamentosConcluiveisDiaFoco) {
        await criarTransacaoEComissao(agendamento);
      }

      await buscarAgendamentos();
      alert(`✅ ${total} agendamento(s) concluído(s) com sucesso.`);
    } catch (error) {
      console.error("Erro ao concluir todos:", error);
      alert("Erro ao concluir os agendamentos do dia.");
    } finally {
      setProcessandoConcluirTodos(false);
    }
  }, [
    tenant?.id,
    agendamentosConcluiveisDiaFoco,
    dataFoco,
    criarTransacaoEComissao,
    buscarAgendamentos,
  ]);

  const navegarAnterior = () => {
    setDataFoco((anterior) => addDays(anterior, modoEfetivo === "dia" ? -1 : -7));
  };

  const navegarProximo = () => {
    setDataFoco((anterior) => addDays(anterior, modoEfetivo === "dia" ? 1 : 7));
  };

  const hoje = () => {
    setDataFoco(normalizarData(new Date()));
  };

  return (
    <div className="flex h-[calc(100vh-170px)] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border bg-background px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            <button
              type="button"
              onClick={navegarAnterior}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Período anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={hoje}
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={navegarProximo}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Próximo período"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <h3 className="text-sm font-semibold capitalize text-foreground sm:text-base">{tituloPeriodo}</h3>

          <div className="flex items-center gap-2">
            {!isMobile && (
              <div className="inline-flex items-center rounded-lg border border-border bg-card p-1">
                <button
                  type="button"
                  onClick={() => setModoCalendario("dia")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    modoEfetivo === "dia"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  Dia
                </button>
                <button
                  type="button"
                  onClick={() => setModoCalendario("semana")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    modoEfetivo === "semana"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  Semana
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={concluirTodosDiaFoco}
              disabled={agendamentosConcluiveisDiaFoco.length === 0 || processandoConcluirTodos}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
              title="Concluir todos do dia selecionado"
            >
              <CheckCircle2 className="h-4 w-4" />
              {processandoConcluirTodos
                ? "Concluindo..."
                : `Concluir Todos (${agendamentosConcluiveisDiaFoco.length})`}
            </button>

            {!isMobile && (
              <button
                type="button"
                onClick={() => setModalNovoAberto(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Novo
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setProfissionalFiltro("todos")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              profissionalFiltro === "todos"
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Todos os profissionais
          </button>
          {profissionais.map((profissional) => (
            <button
              key={profissional.id}
              type="button"
              onClick={() => setProfissionalFiltro(profissional.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                profissionalFiltro === profissional.id
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {profissional.nome}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex-1 overflow-auto bg-muted/30">
        <div className="min-w-max">
          <div className="sticky top-0 z-30 flex border-b border-border bg-card/95 backdrop-blur">
            <div className="sticky left-0 z-40 w-16 border-r border-border bg-card" />

            <div className="flex" style={{ minWidth: modoEfetivo === "semana" ? diasExibidos.length * LARGURA_COLUNA : undefined }}>
              {diasExibidos.map((dia) => {
                const chaveDia = format(dia, "yyyy-MM-dd");
                const isDiaFoco = chaveDia === format(dataFoco, "yyyy-MM-dd");
                const isDiaHoje = isToday(dia);
                const diaFuncionamento = configHorarios.diasFuncionamento.includes(DIAS_SEMANA_MAP[dia.getDay()]);
                const totalDia = (agendamentosPorDia[chaveDia] || []).length;

                return (
                  <button
                    key={chaveDia}
                    type="button"
                    onClick={() => setDataFoco(dia)}
                    className={`border-r border-border px-3 py-2 text-left transition last:border-r-0 ${
                      isDiaFoco
                        ? "bg-muted"
                        : "hover:bg-muted/70"
                    } ${!diaFuncionamento ? "opacity-60" : ""}`}
                    style={{ width: modoEfetivo === "semana" ? LARGURA_COLUNA : "calc(100vw - 64px)" }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                        {format(dia, "EEE", { locale: ptBR })}
                      </p>
                      {isDiaHoje && (
                        <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
                          Hoje
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {format(dia, "d 'de' MMM", { locale: ptBR })}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {totalDia} agendamento{totalDia === 1 ? "" : "s"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex">
            <div className="sticky left-0 z-20 w-16 border-r border-border bg-card">
              {faixasHoras.map((hora) => (
                <div key={hora} className="relative border-t border-border" style={{ height: ALTURA_HORA }}>
                  <span className="absolute -top-2 right-2 text-[10px] font-semibold text-muted-foreground">
                    {`${hora.toString().padStart(2, "0")}:00`}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex" style={{ minWidth: modoEfetivo === "semana" ? diasExibidos.length * LARGURA_COLUNA : undefined }}>
              {diasExibidos.map((dia) => {
                const chaveDia = format(dia, "yyyy-MM-dd");
                const agDia = agendamentosPorDia[chaveDia] || [];
                const layoutDia = layoutPorDia[chaveDia] || {};
                const isDiaHoje = isToday(dia);
                const horaAtual = new Date();
                const topHoraAtual = ((horaAtual.getHours() - configHorarios.horaInicio) * ALTURA_HORA) +
                  ((horaAtual.getMinutes() / 60) * ALTURA_HORA);

                return (
                  <div
                    key={chaveDia}
                    className="relative border-r border-border bg-card last:border-r-0"
                    style={{
                      width: modoEfetivo === "semana" ? LARGURA_COLUNA : "calc(100vw - 64px)",
                      minHeight: alturaGrade,
                    }}
                  >
                    {faixasHoras.map((hora, indice) => (
                      <div
                        key={hora}
                        className="absolute left-0 right-0 border-t border-border/70"
                        style={{ top: indice * ALTURA_HORA }}
                      />
                    ))}

                    {isDiaHoje && topHoraAtual >= 0 && topHoraAtual <= alturaGrade && (
                      <div className="absolute left-0 right-0 z-20" style={{ top: topHoraAtual }}>
                        <div className="flex items-center">
                          <div className="-ml-1 h-2.5 w-2.5 rounded-full bg-rose-500" />
                          <div className="h-0.5 flex-1 bg-rose-500" />
                        </div>
                      </div>
                    )}

                    {agDia.map((agendamento) => {
                      const layout = layoutDia[agendamento.id];
                      if (!layout) return null;

                      const largura = 100 / layout.totalColunas;
                      const left = layout.indiceColuna * largura;
                      const statusClasses = ESTILOS_STATUS[agendamento.status] || ESTILOS_STATUS.pendente;

                      return (
                        <div
                          key={agendamento.id}
                          className={`absolute overflow-hidden rounded-md border px-2 py-1 shadow-sm ${statusClasses}`}
                          style={{
                            top: layout.top,
                            left: `calc(${left}% + 4px)`,
                            width: `calc(${largura}% - 8px)`,
                            height: Math.max(layout.height, 40),
                          }}
                          title={`${agendamento.clientes?.nome || "Cliente"} - ${agendamento.infoServicos.nome}`}
                        >
                          <p className="truncate text-[11px] font-bold">
                            {agendamento.horaInicio} - {agendamento.horaFim}
                          </p>
                          <p className="mt-0.5 truncate text-xs font-semibold">
                            {agendamento.clientes?.nome || "Cliente"}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] opacity-85">
                            {agendamento.infoServicos.nomesCurtos}
                          </p>
                          <p className="mt-0.5 inline-flex rounded bg-black/10 px-1.5 py-0.5 text-[10px] font-semibold capitalize dark:bg-white/10">
                            {agendamento.status}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {!carregando && agendamentosProcessados.length === 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
            <div className="mx-auto w-fit rounded-xl border border-border bg-card px-6 py-4 shadow-sm">
              <CalendarDays className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Sem agendamentos neste período</p>
              <p className="text-xs text-muted-foreground mt-1">
                Horário de funcionamento: {configHorarios.horaInicio}:00 às {configHorarios.horaFim}:00
              </p>
            </div>
          </div>
        )}
      </div>

      {isMobile && (
        <button
          type="button"
          onClick={() => setModalNovoAberto(true)}
          className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition hover:scale-105 active:scale-95"
          aria-label="Novo agendamento"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {tenant && (
        <ModalNovoAgendamento
          tenantId={tenant.id}
          aberto={modalNovoAberto}
          onFechar={() => setModalNovoAberto(false)}
          onSucesso={buscarAgendamentos}
          dataPadrao={format(dataFoco, "yyyy-MM-dd")}
        />
      )}
    </div>
  );
}
