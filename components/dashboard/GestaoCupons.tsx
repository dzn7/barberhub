"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TicketPercent,
  Plus,
  Search,
  Power,
  Pencil,
  X,
  Save,
  Calendar,
  Tag,
  Store,
  Scissors,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";

type TipoDesconto = "percentual" | "valor_fixo";
type EscopoCupom = "loja" | "servico";

interface Cupom {
  id: string;
  tenant_id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  tipo_desconto: TipoDesconto;
  valor_desconto: number;
  maximo_desconto: number | null;
  valor_minimo_pedido: number | null;
  escopo: EscopoCupom;
  limite_total_uso: number | null;
  limite_uso_por_cliente: number | null;
  ativo: boolean;
  inicio_em: string | null;
  fim_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

interface CupomServico {
  cupom_id: string;
  servico_id: string;
}

interface ServicoResumo {
  id: string;
  nome: string;
  preco: number;
  duracao: number;
}

interface UsoCupom {
  total: number;
  porCliente: Record<string, number>;
}

interface FormCupom {
  codigo: string;
  nome: string;
  descricao: string;
  tipo_desconto: TipoDesconto;
  valor_desconto: string;
  maximo_desconto: string;
  valor_minimo_pedido: string;
  escopo: EscopoCupom;
  limite_total_uso: string;
  limite_uso_por_cliente: string;
  inicio_em: string;
  fim_em: string;
  ativo: boolean;
}

const FORM_INICIAL: FormCupom = {
  codigo: "",
  nome: "",
  descricao: "",
  tipo_desconto: "percentual",
  valor_desconto: "",
  maximo_desconto: "",
  valor_minimo_pedido: "",
  escopo: "loja",
  limite_total_uso: "",
  limite_uso_por_cliente: "",
  inicio_em: "",
  fim_em: "",
  ativo: true,
};

const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);

const formatarDataCurta = (valor: string | null) => {
  if (!valor) return "-";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "-";
  return data.toLocaleDateString("pt-BR");
};

const parseNumero = (valor: string): number | null => {
  if (!valor.trim()) return null;
  const normalizado = Number(valor.replace(",", "."));
  if (!Number.isFinite(normalizado)) return null;
  return normalizado;
};

const parseInteiro = (valor: string): number | null => {
  if (!valor.trim()) return null;
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero <= 0) return null;
  return numero;
};

const normalizarCodigoCupom = (codigo: string) =>
  codigo
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9_-]/g, "");

export function GestaoCupons() {
  const { tenant } = useAuth();
  const { toast } = useToast();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [termoBusca, setTermoBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativos" | "inativos">("todos");

  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [servicos, setServicos] = useState<ServicoResumo[]>([]);
  const [servicosPorCupom, setServicosPorCupom] = useState<Record<string, string[]>>({});
  const [usoPorCupom, setUsoPorCupom] = useState<Record<string, UsoCupom>>({});

  const [modalAberto, setModalAberto] = useState(false);
  const [cupomEditando, setCupomEditando] = useState<Cupom | null>(null);
  const [form, setForm] = useState<FormCupom>(FORM_INICIAL);
  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([]);

  const carregarDados = useCallback(async () => {
    if (!tenant?.id) return;

    try {
      setCarregando(true);

      const [cuponsRes, servicosRes] = await Promise.all([
        supabase
          .from("cupons")
          .select("*")
          .eq("tenant_id", tenant.id)
          .order("criado_em", { ascending: false }),
        supabase
          .from("servicos")
          .select("id, nome, preco, duracao")
          .eq("tenant_id", tenant.id)
          .eq("ativo", true)
          .order("ordem_exibicao", { ascending: true }),
      ]);

      if (cuponsRes.error) throw cuponsRes.error;
      if (servicosRes.error) throw servicosRes.error;

      const listaCupons = (cuponsRes.data || []) as Cupom[];
      const listaServicos = (servicosRes.data || []) as ServicoResumo[];

      setCupons(listaCupons);
      setServicos(listaServicos);

      if (listaCupons.length === 0) {
        setServicosPorCupom({});
        setUsoPorCupom({});
        return;
      }

      const idsCupons = listaCupons.map((cupom) => cupom.id);

      const [cupomServicosRes, usosRes] = await Promise.all([
        supabase
          .from("cupom_servicos")
          .select("cupom_id, servico_id")
          .in("cupom_id", idsCupons),
        supabase
          .from("agendamentos")
          .select("cupom_id, cliente_id, status")
          .eq("tenant_id", tenant.id)
          .in("cupom_id", idsCupons)
          .neq("status", "cancelado"),
      ]);

      if (cupomServicosRes.error) throw cupomServicosRes.error;
      if (usosRes.error) throw usosRes.error;

      const mapaServicos: Record<string, string[]> = {};
      for (const item of (cupomServicosRes.data || []) as CupomServico[]) {
        if (!mapaServicos[item.cupom_id]) {
          mapaServicos[item.cupom_id] = [];
        }
        mapaServicos[item.cupom_id].push(item.servico_id);
      }
      setServicosPorCupom(mapaServicos);

      const mapaUsos: Record<string, UsoCupom> = {};
      for (const item of usosRes.data || []) {
        if (!item.cupom_id) continue;
        if (!mapaUsos[item.cupom_id]) {
          mapaUsos[item.cupom_id] = { total: 0, porCliente: {} };
        }

        mapaUsos[item.cupom_id].total += 1;
        if (item.cliente_id) {
          mapaUsos[item.cupom_id].porCliente[item.cliente_id] =
            (mapaUsos[item.cupom_id].porCliente[item.cliente_id] || 0) + 1;
        }
      }
      setUsoPorCupom(mapaUsos);
    } catch (error) {
      console.error("Erro ao carregar cupons:", error);
      toast({ tipo: "erro", mensagem: "Não foi possível carregar os cupons." });
    } finally {
      setCarregando(false);
    }
  }, [tenant?.id, toast]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    if (!tenant?.id) return;

    const canal = supabase
      .channel(`cupons-admin-${tenant.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cupons",
          filter: `tenant_id=eq.${tenant.id}`,
        },
        () => carregarDados()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cupom_servicos",
        },
        () => carregarDados()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agendamentos",
          filter: `tenant_id=eq.${tenant.id}`,
        },
        () => carregarDados()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [tenant?.id, carregarDados]);

  const cuponsFiltrados = useMemo(() => {
    return cupons.filter((cupom) => {
      const texto = `${cupom.codigo} ${cupom.nome} ${cupom.descricao || ""}`.toLowerCase();
      const matchBusca = !termoBusca.trim() || texto.includes(termoBusca.toLowerCase().trim());
      const matchStatus =
        filtroStatus === "todos" ||
        (filtroStatus === "ativos" && cupom.ativo) ||
        (filtroStatus === "inativos" && !cupom.ativo);

      return matchBusca && matchStatus;
    });
  }, [cupons, termoBusca, filtroStatus]);

  const abrirNovoCupom = () => {
    setCupomEditando(null);
    setForm(FORM_INICIAL);
    setServicosSelecionados([]);
    setModalAberto(true);
  };

  const abrirEdicaoCupom = (cupom: Cupom) => {
    setCupomEditando(cupom);
    setForm({
      codigo: cupom.codigo,
      nome: cupom.nome,
      descricao: cupom.descricao || "",
      tipo_desconto: cupom.tipo_desconto,
      valor_desconto: String(cupom.valor_desconto || ""),
      maximo_desconto: cupom.maximo_desconto != null ? String(cupom.maximo_desconto) : "",
      valor_minimo_pedido: cupom.valor_minimo_pedido != null ? String(cupom.valor_minimo_pedido) : "",
      escopo: cupom.escopo,
      limite_total_uso: cupom.limite_total_uso != null ? String(cupom.limite_total_uso) : "",
      limite_uso_por_cliente:
        cupom.limite_uso_por_cliente != null ? String(cupom.limite_uso_por_cliente) : "",
      inicio_em: cupom.inicio_em ? cupom.inicio_em.slice(0, 16) : "",
      fim_em: cupom.fim_em ? cupom.fim_em.slice(0, 16) : "",
      ativo: cupom.ativo,
    });
    setServicosSelecionados(servicosPorCupom[cupom.id] || []);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setCupomEditando(null);
    setForm(FORM_INICIAL);
    setServicosSelecionados([]);
  };

  const alternarServicoSelecionado = (servicoId: string) => {
    setServicosSelecionados((atual) =>
      atual.includes(servicoId) ? atual.filter((id) => id !== servicoId) : [...atual, servicoId]
    );
  };

  const salvarCupom = async () => {
    if (!tenant?.id) return;

    const codigoNormalizado = normalizarCodigoCupom(form.codigo);
    const valorDesconto = parseNumero(form.valor_desconto);
    const maximoDesconto = parseNumero(form.maximo_desconto);
    const valorMinimo = parseNumero(form.valor_minimo_pedido);
    const limiteTotal = parseInteiro(form.limite_total_uso);
    const limiteCliente = parseInteiro(form.limite_uso_por_cliente);

    if (!codigoNormalizado) {
      toast({ tipo: "erro", mensagem: "Informe um código de cupom válido." });
      return;
    }
    if (!form.nome.trim()) {
      toast({ tipo: "erro", mensagem: "Informe um nome para o cupom." });
      return;
    }
    if (!valorDesconto || valorDesconto <= 0) {
      toast({ tipo: "erro", mensagem: "Informe um valor de desconto maior que zero." });
      return;
    }
    if (form.escopo === "servico" && servicosSelecionados.length === 0) {
      toast({ tipo: "erro", mensagem: "Selecione pelo menos um serviço para esse cupom." });
      return;
    }

    setSalvando(true);

    try {
      const payload = {
        tenant_id: tenant.id,
        codigo: codigoNormalizado,
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || null,
        tipo_desconto: form.tipo_desconto,
        valor_desconto: valorDesconto,
        maximo_desconto: maximoDesconto,
        valor_minimo_pedido: valorMinimo,
        escopo: form.escopo,
        limite_total_uso: form.limite_total_uso.trim() ? limiteTotal : null,
        limite_uso_por_cliente: form.limite_uso_por_cliente.trim() ? limiteCliente : null,
        inicio_em: form.inicio_em ? new Date(form.inicio_em).toISOString() : null,
        fim_em: form.fim_em ? new Date(form.fim_em).toISOString() : null,
        ativo: form.ativo,
      };

      let cupomId = cupomEditando?.id;

      if (cupomEditando) {
        const { error } = await supabase
          .from("cupons")
          .update(payload)
          .eq("id", cupomEditando.id)
          .eq("tenant_id", tenant.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("cupons")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;
        cupomId = data.id;
      }

      if (!cupomId) {
        throw new Error("Não foi possível identificar o cupom salvo.");
      }

      const { error: erroLimpeza } = await supabase
        .from("cupom_servicos")
        .delete()
        .eq("cupom_id", cupomId);

      if (erroLimpeza) throw erroLimpeza;

      if (form.escopo === "servico" && servicosSelecionados.length > 0) {
        const { error: erroInsercao } = await supabase.from("cupom_servicos").insert(
          servicosSelecionados.map((servicoId) => ({
            cupom_id: cupomId,
            servico_id: servicoId,
          }))
        );

        if (erroInsercao) throw erroInsercao;
      }

      toast({ tipo: "sucesso", mensagem: "Cupom salvo com sucesso." });
      fecharModal();
      await carregarDados();
    } catch (error: any) {
      console.error("Erro ao salvar cupom:", error);
      toast({
        tipo: "erro",
        mensagem: error?.message || "Não foi possível salvar o cupom.",
      });
    } finally {
      setSalvando(false);
    }
  };

  const alternarAtivo = async (cupom: Cupom) => {
    if (!tenant?.id) return;

    try {
      const { error } = await supabase
        .from("cupons")
        .update({ ativo: !cupom.ativo })
        .eq("id", cupom.id)
        .eq("tenant_id", tenant.id);

      if (error) throw error;

      toast({
        tipo: "sucesso",
        mensagem: cupom.ativo ? "Cupom desativado." : "Cupom ativado.",
      });
      await carregarDados();
    } catch (error) {
      console.error("Erro ao atualizar status do cupom:", error);
      toast({ tipo: "erro", mensagem: "Não foi possível atualizar o status do cupom." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Gestão de Cupons</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Crie descontos por serviço ou para toda a loja com regras de validade e limite.
          </p>
        </div>

        <button
          type="button"
          onClick={abrirNovoCupom}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          <Plus className="h-4 w-4" />
          Novo Cupom
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder="Buscar por código, nome ou descrição"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-200"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltroStatus("todos")}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                filtroStatus === "todos"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFiltroStatus("ativos")}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                filtroStatus === "ativos"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              Ativos
            </button>
            <button
              type="button"
              onClick={() => setFiltroStatus("inativos")}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                filtroStatus === "inativos"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              Inativos
            </button>
          </div>
        </div>
      </div>

      {carregando ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          Carregando cupons...
        </div>
      ) : cuponsFiltrados.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <TicketPercent className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Nenhum cupom encontrado com os filtros atuais.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {cuponsFiltrados.map((cupom) => {
            const uso = usoPorCupom[cupom.id];
            const servicosRelacionados = servicosPorCupom[cupom.id] || [];
            const agora = Date.now();
            const expirado = cupom.fim_em ? new Date(cupom.fim_em).getTime() < agora : false;

            return (
              <div
                key={cupom.id}
                className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-zinc-900 px-2.5 py-1 text-xs font-semibold tracking-wide text-white dark:bg-white dark:text-zinc-900">
                        {cupom.codigo}
                      </span>
                      <span
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                          cupom.ativo
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {cupom.ativo ? "Ativo" : "Inativo"}
                      </span>
                      {expirado && (
                        <span className="rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                          Expirado
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{cupom.nome}</h3>
                    {cupom.descricao && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">{cupom.descricao}</p>
                    )}

                    <div className="grid gap-2 text-sm text-zinc-600 dark:text-zinc-400 sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        {cupom.tipo_desconto === "percentual"
                          ? `${cupom.valor_desconto}% de desconto`
                          : `${formatarMoeda(cupom.valor_desconto)} de desconto`}
                      </div>

                      <div className="flex items-center gap-2">
                        {cupom.escopo === "loja" ? <Store className="h-4 w-4" /> : <Scissors className="h-4 w-4" />}
                        {cupom.escopo === "loja"
                          ? "Válido para toda a loja"
                          : `${servicosRelacionados.length} serviço(s) elegível(is)`}
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatarDataCurta(cupom.inicio_em)} até {formatarDataCurta(cupom.fim_em)}
                      </div>

                      <div>
                        Uso: {uso?.total || 0}
                        {cupom.limite_total_uso ? ` / ${cupom.limite_total_uso}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => alternarAtivo(cupom)}
                      className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <Power className="h-4 w-4" />
                      {cupom.ativo ? "Desativar" : "Ativar"}
                    </button>

                    <button
                      type="button"
                      onClick={() => abrirEdicaoCupom(cupom)}
                      className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {cupomEditando ? "Editar cupom" : "Novo cupom"}
              </h3>
              <button
                type="button"
                onClick={fecharModal}
                className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Código</label>
                <input
                  type="text"
                  value={form.codigo}
                  onChange={(e) => setForm((prev) => ({ ...prev, codigo: normalizarCodigoCupom(e.target.value) }))}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="EX: PRIMEIRA10"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Nome</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="Campanha de desconto"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm((prev) => ({ ...prev, descricao: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="Detalhes internos sobre uso do cupom"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Tipo de desconto</label>
                <select
                  value={form.tipo_desconto}
                  onChange={(e) => setForm((prev) => ({ ...prev, tipo_desconto: e.target.value as TipoDesconto }))}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="percentual">Percentual (%)</option>
                  <option value="valor_fixo">Valor fixo (R$)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Valor do desconto</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.valor_desconto}
                  onChange={(e) => setForm((prev) => ({ ...prev, valor_desconto: e.target.value.replace(/[^0-9.,]/g, "") }))}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder={form.tipo_desconto === "percentual" ? "10" : "20,00"}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Escopo</label>
                <select
                  value={form.escopo}
                  onChange={(e) => setForm((prev) => ({ ...prev, escopo: e.target.value as EscopoCupom }))}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="loja">Toda a loja</option>
                  <option value="servico">Serviços específicos</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Valor mínimo do pedido</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.valor_minimo_pedido}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, valor_minimo_pedido: e.target.value.replace(/[^0-9.,]/g, "") }))
                  }
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Máximo de desconto</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.maximo_desconto}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, maximo_desconto: e.target.value.replace(/[^0-9.,]/g, "") }))
                  }
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="Opcional (especial para %)"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Limite total de uso</label>
                <input
                  type="number"
                  min={1}
                  value={form.limite_total_uso}
                  onChange={(e) => setForm((prev) => ({ ...prev, limite_total_uso: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Limite por cliente</label>
                <input
                  type="number"
                  min={1}
                  value={form.limite_uso_por_cliente}
                  onChange={(e) => setForm((prev) => ({ ...prev, limite_uso_por_cliente: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Início da validade</label>
                <input
                  type="datetime-local"
                  value={form.inicio_em}
                  onChange={(e) => setForm((prev) => ({ ...prev, inicio_em: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Fim da validade</label>
                <input
                  type="datetime-local"
                  value={form.fim_em}
                  onChange={(e) => setForm((prev) => ({ ...prev, fim_em: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div className="md:col-span-2">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(e) => setForm((prev) => ({ ...prev, ativo: e.target.checked }))}
                  />
                  Cupom ativo
                </label>
              </div>

              {form.escopo === "servico" && (
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Serviços elegíveis
                  </label>
                  <div className="grid max-h-56 gap-2 overflow-auto rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                    {servicos.map((servico) => {
                      const selecionado = servicosSelecionados.includes(servico.id);
                      return (
                        <label
                          key={servico.id}
                          className="flex cursor-pointer items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        >
                          <span className="font-medium text-zinc-800 dark:text-zinc-100">{servico.nome}</span>
                          <input
                            type="checkbox"
                            checked={selecionado}
                            onChange={() => alternarServicoSelecionado(servico.id)}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={fecharModal}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarCupom}
                disabled={salvando}
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
              >
                <Save className="h-4 w-4" />
                {salvando ? "Salvando..." : "Salvar cupom"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
