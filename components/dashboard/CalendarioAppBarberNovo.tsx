"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Scissors,
  User,
} from "lucide-react";
import { format, addDays, parseISO, isToday } from "date-fns";
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

const DIAS_SEMANA_MAP: Record<number, string> = {
  0: "dom",
  1: "seg",
  2: "ter",
  3: "qua",
  4: "qui",
  5: "sex",
  6: "sab",
};

const STATUS_STYLE: Record<string, string> = {
  pendente: "bg-amber-500/15 border-amber-400 text-amber-100",
  confirmado: "bg-cyan-500/15 border-cyan-400 text-cyan-100",
  concluido: "bg-emerald-500/15 border-emerald-400 text-emerald-100",
  cancelado: "bg-rose-500/15 border-rose-400 text-rose-100",
};

function obterInfoServicos(agendamento: Agendamento) {
  const { servicos, servicosMultiplos } = agendamento;

  if (servicosMultiplos && servicosMultiplos.length > 1) {
    const nomes = servicosMultiplos.map((s) => s.nome);
    const precoTotal = servicosMultiplos.reduce((acc, s) => acc + (s.preco || 0), 0);
    const duracaoTotal = servicosMultiplos.reduce((acc, s) => acc + (s.duracao || 0), 0);

    return {
      nome: nomes.join(" + "),
      nomesCurtos: nomes.length > 2 ? `${nomes[0]} +${nomes.length - 1}` : nomes.join(" + "),
      preco: precoTotal,
      duracao: duracaoTotal,
    };
  }

  return {
    nome: servicos?.nome || "Serviço",
    nomesCurtos: servicos?.nome || "Serviço",
    preco: servicos?.preco || 0,
    duracao: servicos?.duracao || 30,
  };
}

export function CalendarioAppBarberNovo() {
  const { tenant } = useAuth();

  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [profissionalFiltro, setProfissionalFiltro] = useState<string>("todos");
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [configHorarios, setConfigHorarios] = useState<ConfiguracaoHorarios>(HORARIOS_PADRAO);
  const [modalNovoAberto, setModalNovoAberto] = useState(false);

  const subscriptionRef = useRef<any>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const diaEhAberto = useCallback(
    (data: Date) => {
      return configHorarios.diasFuncionamento.includes(DIAS_SEMANA_MAP[data.getDay()]);
    },
    [configHorarios.diasFuncionamento]
  );

  const normalizarData = useCallback((data: Date) => {
    const normalizada = new Date(data);
    normalizada.setHours(12, 0, 0, 0);
    return normalizada;
  }, []);

  const encontrarDiaAberto = useCallback(
    (dataReferencia: Date, direcao: 1 | -1 = 1, permitirAtual = true) => {
      let cursor = normalizarData(dataReferencia);
      if (!permitirAtual) cursor = addDays(cursor, direcao);

      for (let i = 0; i < 21; i += 1) {
        if (diaEhAberto(cursor)) return cursor;
        cursor = addDays(cursor, direcao);
      }

      return normalizarData(dataReferencia);
    },
    [diaEhAberto, normalizarData]
  );

  const faixaDias = useMemo(() => {
    const dias: Date[] = [];
    let cursor = encontrarDiaAberto(dataSelecionada, 1, true);
    for (let i = 0; i < 7; i += 1) {
      dias.push(cursor);
      cursor = encontrarDiaAberto(addDays(cursor, 1), 1, true);
    }
    return dias;
  }, [dataSelecionada, encontrarDiaAberto]);

  const buscarAgendamentosDia = useCallback(async () => {
    if (!tenant?.id) return;

    try {
      setCarregando(true);

      const dia = encontrarDiaAberto(dataSelecionada, 1, true);
      const inicioUTC = fromZonedTime(`${format(dia, "yyyy-MM-dd")}T00:00:00`, TIMEZONE_BRASILIA);
      const fimUTC = fromZonedTime(`${format(addDays(dia, 1), "yyyy-MM-dd")}T00:00:00`, TIMEZONE_BRASILIA);

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

      for (const ag of base) {
        if (Array.isArray(ag.servicos_ids) && ag.servicos_ids.length > 1) {
          for (const id of ag.servicos_ids) idsServicosMultiplos.add(id);
        }
      }

      const mapServicos = new Map<string, Servico>();
      if (idsServicosMultiplos.size > 0) {
        const { data: servicosData } = await supabase
          .from("servicos")
          .select("id, nome, preco, duracao")
          .in("id", Array.from(idsServicosMultiplos));

        for (const servico of (servicosData || []) as Servico[]) {
          if (servico.id) mapServicos.set(servico.id, servico);
        }
      }

      const processados = base.map((ag) => {
        if (!Array.isArray(ag.servicos_ids) || ag.servicos_ids.length <= 1) return ag;
        const servicosMultiplos = ag.servicos_ids
          .map((id) => mapServicos.get(id))
          .filter(Boolean) as Servico[];

        return { ...ag, servicosMultiplos };
      });

      setAgendamentos(processados);
    } catch (error) {
      console.error("Erro ao buscar agendamentos do calendário appbarber:", error);
    } finally {
      setCarregando(false);
    }
  }, [tenant?.id, dataSelecionada, encontrarDiaAberto]);

  useEffect(() => {
    const carregar = async () => {
      if (!tenant?.id) return;

      const config = await buscarConfiguracaoHorarios(tenant.id, supabase);
      setConfigHorarios(config);

      const { data } = await supabase
        .from("barbeiros")
        .select("id, nome")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .order("nome", { ascending: true });

      setProfissionais((data || []) as Profissional[]);
    };

    void carregar();
  }, [tenant?.id]);

  useEffect(() => {
    if (!configHorarios.diasFuncionamento.length) return;
    setDataSelecionada((atual) => encontrarDiaAberto(atual, 1, true));
  }, [configHorarios.diasFuncionamento, encontrarDiaAberto]);

  useEffect(() => {
    void buscarAgendamentosDia();
  }, [buscarAgendamentosDia]);

  useEffect(() => {
    if (!tenant?.id) return;

    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    const canal = supabase
      .channel(`calendario-appbarber-${tenant.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agendamentos", filter: `tenant_id=eq.${tenant.id}` },
        () => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            void buscarAgendamentosDia();
          }, 200);
        }
      )
      .subscribe();

    subscriptionRef.current = canal;

    return () => {
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [tenant?.id, buscarAgendamentosDia]);

  const agendamentosFiltrados = useMemo(() => {
    const inicioMin = configHorarios.horaInicio * 60;
    const fimMin = configHorarios.horaFim * 60;

    return agendamentos
      .filter((ag) => {
        if (profissionalFiltro === "todos") return true;
        return ag.barbeiro_id === profissionalFiltro || ag.barbeiros?.id === profissionalFiltro;
      })
      .filter((ag) => {
        const data = toZonedTime(parseISO(ag.data_hora), TIMEZONE_BRASILIA);
        const minutos = data.getHours() * 60 + data.getMinutes();
        return minutos >= inicioMin && minutos < fimMin;
      });
  }, [agendamentos, profissionalFiltro, configHorarios.horaInicio, configHorarios.horaFim]);

  const navegarAnterior = () => setDataSelecionada((prev) => encontrarDiaAberto(addDays(prev, -1), -1, true));
  const navegarProximo = () => setDataSelecionada((prev) => encontrarDiaAberto(addDays(prev, 1), 1, true));

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-950 text-white dark:border-zinc-800 overflow-hidden">
      <div className="border-b border-zinc-800 px-4 py-4">
        <p className="text-xs font-semibold tracking-wide text-cyan-300">NOVO CALENDÁRIO</p>
        <h3 className="mt-1 text-lg font-bold">Controle a agenda dos seus profissionais</h3>
      </div>

      <div className="border-b border-zinc-900 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={navegarAnterior}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="text-center">
            <p className="text-xs uppercase text-zinc-400">Data selecionada</p>
            <p className="text-sm font-semibold capitalize">
              {format(dataSelecionada, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>

          <button
            type="button"
            onClick={navegarProximo}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {faixaDias.map((dia) => {
            const ativo = format(dia, "yyyy-MM-dd") === format(dataSelecionada, "yyyy-MM-dd");
            return (
              <button
                key={format(dia, "yyyy-MM-dd")}
                type="button"
                onClick={() => setDataSelecionada(dia)}
                className={`min-w-[82px] rounded-xl border px-3 py-2 text-left transition ${
                  ativo
                    ? "border-cyan-300 bg-cyan-300 text-zinc-950"
                    : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                }`}
              >
                <p className="text-[10px] uppercase">{format(dia, "EEE", { locale: ptBR })}</p>
                <p className="text-base font-bold">{format(dia, "dd")}</p>
                {isToday(dia) && <p className="text-[10px] font-semibold">Hoje</p>}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setProfissionalFiltro("todos")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              profissionalFiltro === "todos" ? "bg-white text-zinc-950" : "bg-zinc-800 text-zinc-200"
            }`}
          >
            Todos
          </button>
          {profissionais.map((prof) => (
            <button
              key={prof.id}
              type="button"
              onClick={() => setProfissionalFiltro(prof.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                profissionalFiltro === prof.id ? "bg-white text-zinc-950" : "bg-zinc-800 text-zinc-200"
              }`}
            >
              {prof.nome}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[70vh] overflow-y-auto px-3 py-3">
        {carregando ? (
          <div className="flex h-48 items-center justify-center text-sm text-zinc-400">Carregando agenda...</div>
        ) : agendamentosFiltrados.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-8 text-center">
            <CalendarDays className="mx-auto mb-2 h-5 w-5 text-zinc-400" />
            <p className="text-sm text-zinc-300">Nenhum agendamento para este dia.</p>
            <p className="text-xs text-zinc-500 mt-1">
              Horário de funcionamento: {configHorarios.horaInicio}:00 às {configHorarios.horaFim}:00
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {agendamentosFiltrados.map((agendamento) => {
              const dataBrasilia = toZonedTime(parseISO(agendamento.data_hora), TIMEZONE_BRASILIA);
              const info = obterInfoServicos(agendamento);
              const horaInicio = format(dataBrasilia, "HH:mm");
              const horaFim = format(
                new Date(dataBrasilia.getTime() + info.duracao * 60000),
                "HH:mm"
              );
              const style = STATUS_STYLE[agendamento.status] || "bg-zinc-800 border-zinc-600 text-zinc-100";

              return (
                <div
                  key={agendamento.id}
                  className={`rounded-xl border p-3 ${style}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold">
                      <Clock className="h-3.5 w-3.5" />
                      {horaInicio} - {horaFim}
                    </div>
                    <span className="rounded-full bg-black/30 px-2 py-0.5 text-[10px] capitalize">
                      {agendamento.status}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-bold">{agendamento.clientes?.nome || "Cliente"}</p>
                  <div className="mt-1 grid gap-1 text-xs text-zinc-200">
                    <p className="inline-flex items-center gap-1.5">
                      <Scissors className="h-3.5 w-3.5" />
                      {info.nomesCurtos}
                    </p>
                    <p className="inline-flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      {agendamento.barbeiros?.nome || "Profissional"}
                    </p>
                  </div>

                  <div className="mt-2 inline-flex rounded-md bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-100">
                    R$ {info.preco.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setModalNovoAberto(true)}
        className="fixed bottom-6 right-6 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500 text-zinc-950 shadow-xl hover:scale-105 active:scale-95 lg:hidden"
        aria-label="Novo agendamento"
      >
        <Plus className="h-6 w-6" />
      </button>

      {tenant && (
        <ModalNovoAgendamento
          tenantId={tenant.id}
          aberto={modalNovoAberto}
          onFechar={() => setModalNovoAberto(false)}
          onSucesso={buscarAgendamentosDia}
          dataPadrao={format(dataSelecionada, "yyyy-MM-dd")}
        />
      )}
    </div>
  );
}

