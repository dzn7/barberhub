"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, MessageSquare, Plus, RefreshCw, Trash2 } from "lucide-react";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import { Button, TextArea } from "@radix-ui/themes";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { ModalPortal } from "@/components/ui/modal-portal";
import { obterTerminologia } from "@/lib/configuracoes-negocio";
import type { FormaPagamento } from "@/types";
import type { TipoNegocio } from "@/lib/types";

type TipoLancamento = "entrada" | "saida";
type FiltroTipo = "todos" | TipoLancamento;
type FiltroPeriodo = "7" | "14" | "30" | "custom";

interface CategoriaFinanceira {
  id: string;
  tenant_id: string | null;
  tipo_negocio: TipoNegocio | null;
  tipo_movimento: TipoLancamento;
  codigo: string;
  nome: string;
  ativo: boolean;
  padrao: boolean;
  ordem: number;
}

interface TransacaoCaixa {
  id: string;
  tipo: "receita" | "despesa";
  categoria: string | null;
  categoria_id: string | null;
  categoria_nome: string | null;
  descricao: string;
  valor: number;
  data: string;
  forma_pagamento: FormaPagamento | null;
  origem: "manual" | "agendamento" | "atendimento_presencial" | "ajuste" | "estorno";
  anotacoes: string | null;
  observacoes: string | null;
  agendamento_id: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
  categoria_ref?: {
    id: string;
    nome: string;
    codigo: string;
    tipo_movimento: TipoLancamento;
  } | null;
}

interface Confirmacao {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  onConfirmar?: () => void | Promise<void>;
}

const FORMAS_PAGAMENTO: Array<{ value: FormaPagamento; label: string }> = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
  { value: "transferencia", label: "Transferência" },
];

const ORIGENS_LABEL: Record<TransacaoCaixa["origem"], string> = {
  manual: "Manual",
  agendamento: "Agendamento",
  atendimento_presencial: "Atendimento presencial",
  ajuste: "Ajuste",
  estorno: "Estorno",
};

const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

const paraDataInput = (date: Date) => format(date, "yyyy-MM-dd");

const formatarDataBR = (value: string) => {
  const data = new Date(`${value}T12:00:00`);
  if (Number.isNaN(data.getTime())) return value;
  return format(data, "dd/MM/yyyy");
};

const normalizarCodigoCategoria = (nome: string) =>
  nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

const intervaloPadrao = (periodo: Exclude<FiltroPeriodo, "custom">) => {
  const hoje = new Date();
  const dias = periodo === "7" ? 7 : periodo === "14" ? 14 : 30;
  return {
    inicio: paraDataInput(startOfDay(subDays(hoje, dias - 1))),
    fim: paraDataInput(endOfDay(hoje)),
  };
};

const escapeHtml = (texto: string) =>
  texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export function GestaoFinanceira() {
  const { tenant } = useAuth();
  const tipoNegocio = (tenant?.tipo_negocio || "barbearia") as TipoNegocio;
  const terminologia = useMemo(() => obterTerminologia(tipoNegocio), [tipoNegocio]);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erroTela, setErroTela] = useState<string | null>(null);

  const [periodo, setPeriodo] = useState<FiltroPeriodo>("7");
  const [dataInicio, setDataInicio] = useState(intervaloPadrao("7").inicio);
  const [dataFim, setDataFim] = useState(intervaloPadrao("7").fim);

  const [tipoFiltro, setTipoFiltro] = useState<FiltroTipo>("todos");
  const [origemFiltro, setOrigemFiltro] = useState<"todas" | TransacaoCaixa["origem"]>("todas");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [busca, setBusca] = useState("");

  const [transacoes, setTransacoes] = useState<TransacaoCaixa[]>([]);
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);

  const [modalLancamentoAberto, setModalLancamentoAberto] = useState(false);
  const [tipoLancamento, setTipoLancamento] = useState<TipoLancamento>("saida");
  const [categoriaLancamentoId, setCategoriaLancamentoId] = useState("");
  const [descricaoLancamento, setDescricaoLancamento] = useState("");
  const [valorLancamento, setValorLancamento] = useState("");
  const [formaPagamentoLancamento, setFormaPagamentoLancamento] = useState<"" | FormaPagamento>("");
  const [dataLancamento, setDataLancamento] = useState(paraDataInput(new Date()));
  const [anotacoesLancamento, setAnotacoesLancamento] = useState("");
  const [novaCategoriaNome, setNovaCategoriaNome] = useState("");
  const [criandoCategoria, setCriandoCategoria] = useState(false);

  const [transacaoNota, setTransacaoNota] = useState<TransacaoCaixa | null>(null);
  const [textoNota, setTextoNota] = useState("");

  const [confirmacao, setConfirmacao] = useState<Confirmacao>({
    aberto: false,
    titulo: "",
    mensagem: "",
  });

  const aplicarPeriodoRapido = (novoPeriodo: Exclude<FiltroPeriodo, "custom">) => {
    const faixa = intervaloPadrao(novoPeriodo);
    setPeriodo(novoPeriodo);
    setDataInicio(faixa.inicio);
    setDataFim(faixa.fim);
  };

  const carregarCategorias = useCallback(async () => {
    if (!tenant?.id) return;

    try {
      const [globaisRes, customRes] = await Promise.all([
        supabase
          .from("categorias_financeiras")
          .select("id, tenant_id, tipo_negocio, tipo_movimento, codigo, nome, ativo, padrao, ordem")
          .is("tenant_id", null)
          .eq("tipo_negocio", tipoNegocio)
          .eq("ativo", true)
          .order("ordem", { ascending: true })
          .order("nome", { ascending: true }),
        supabase
          .from("categorias_financeiras")
          .select("id, tenant_id, tipo_negocio, tipo_movimento, codigo, nome, ativo, padrao, ordem")
          .eq("tenant_id", tenant.id)
          .eq("ativo", true)
          .order("ordem", { ascending: true })
          .order("nome", { ascending: true }),
      ]);

      if (globaisRes.error) throw globaisRes.error;
      if (customRes.error) throw customRes.error;

      const globais = (globaisRes.data || []) as CategoriaFinanceira[];
      const custom = (customRes.data || []) as CategoriaFinanceira[];

      const mapa = new Map<string, CategoriaFinanceira>();
      for (const categoria of globais) {
        mapa.set(`${categoria.tipo_movimento}-${categoria.codigo.toLowerCase()}`, categoria);
      }
      for (const categoria of custom) {
        mapa.set(`${categoria.tipo_movimento}-${categoria.codigo.toLowerCase()}`, categoria);
      }

      const lista = [...mapa.values()].sort((a, b) => {
        if (a.tipo_movimento !== b.tipo_movimento) {
          return a.tipo_movimento.localeCompare(b.tipo_movimento);
        }
        if (a.ordem !== b.ordem) {
          return a.ordem - b.ordem;
        }
        return a.nome.localeCompare(b.nome);
      });

      setCategorias(lista);
    } catch (error) {
      console.error("[Financeiro] Erro ao carregar categorias:", error);
    }
  }, [tenant?.id, tipoNegocio]);

  const buscarTransacoes = useCallback(async () => {
    if (!tenant?.id) return;

    setCarregando(true);
    setErroTela(null);

    try {
      const { data, error } = await supabase
        .from("transacoes")
        .select(
          `
            id,
            tipo,
            categoria,
            categoria_id,
            categoria_nome,
            descricao,
            valor,
            data,
            forma_pagamento,
            origem,
            anotacoes,
            observacoes,
            agendamento_id,
            criado_em,
            atualizado_em,
            categoria_ref:categorias_financeiras(id,nome,codigo,tipo_movimento)
          `
        )
        .eq("tenant_id", tenant.id)
        .gte("data", dataInicio)
        .lte("data", dataFim)
        .order("data", { ascending: false })
        .order("criado_em", { ascending: false });

      if (error) throw error;

      const lista = ((data || []) as any[]).map((item) => ({
        ...item,
        valor: Number(item.valor || 0),
      })) as TransacaoCaixa[];

      setTransacoes(lista);
    } catch (error: any) {
      console.error("[Financeiro] Erro ao buscar transações:", error);
      setErroTela(error?.message || "Não foi possível carregar as movimentações.");
    } finally {
      setCarregando(false);
    }
  }, [tenant?.id, dataInicio, dataFim]);

  useEffect(() => {
    if (!tenant?.id) return;
    void carregarCategorias();
  }, [tenant?.id, carregarCategorias]);

  useEffect(() => {
    if (!tenant?.id) return;
    void buscarTransacoes();
  }, [tenant?.id, buscarTransacoes]);

  useEffect(() => {
    if (!tenant?.id) return;

    const canal = supabase
      .channel(`financeiro-realtime-${tenant.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transacoes",
          filter: `tenant_id=eq.${tenant.id}`,
        },
        () => {
          void buscarTransacoes();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categorias_financeiras",
        },
        () => {
          void carregarCategorias();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [tenant?.id, buscarTransacoes, carregarCategorias]);

  const categoriasDisponiveis = useMemo(
    () => categorias.filter((categoria) => categoria.tipo_movimento === tipoLancamento),
    [categorias, tipoLancamento]
  );

  useEffect(() => {
    if (!modalLancamentoAberto) return;
    if (categoriaLancamentoId) return;
    if (categoriasDisponiveis.length === 0) return;
    setCategoriaLancamentoId(categoriasDisponiveis[0].id);
  }, [modalLancamentoAberto, categoriaLancamentoId, categoriasDisponiveis]);

  const mapaCategorias = useMemo(
    () => new Map(categorias.map((categoria) => [categoria.id, categoria])),
    [categorias]
  );

  const transacoesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return transacoes.filter((transacao) => {
      if (tipoFiltro !== "todos") {
        const tipoEsperado = tipoFiltro === "entrada" ? "receita" : "despesa";
        if (transacao.tipo !== tipoEsperado) return false;
      }

      if (origemFiltro !== "todas" && transacao.origem !== origemFiltro) {
        return false;
      }

      if (categoriaFiltro !== "todas") {
        const categoriaSelecionada = mapaCategorias.get(categoriaFiltro);
        const codigoFiltro = categoriaSelecionada?.codigo.toLowerCase();
        const codigoTransacao = (transacao.categoria_ref?.codigo || transacao.categoria || "").toLowerCase();
        const mesmoId = transacao.categoria_id === categoriaFiltro;
        const mesmoCodigo = Boolean(codigoFiltro && codigoTransacao && codigoFiltro === codigoTransacao);
        if (!mesmoId && !mesmoCodigo) return false;
      }

      if (!termo) return true;

      const alvoBusca = [
        transacao.descricao,
        transacao.categoria_nome,
        transacao.categoria_ref?.nome,
        transacao.origem,
        transacao.forma_pagamento,
        transacao.anotacoes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return alvoBusca.includes(termo);
    });
  }, [transacoes, tipoFiltro, origemFiltro, categoriaFiltro, mapaCategorias, busca]);

  const metricas = useMemo(() => {
    const entradas = transacoesFiltradas
      .filter((transacao) => transacao.tipo === "receita")
      .reduce((acc, transacao) => acc + transacao.valor, 0);

    const saidas = transacoesFiltradas
      .filter((transacao) => transacao.tipo === "despesa")
      .reduce((acc, transacao) => acc + transacao.valor, 0);

    const saldo = entradas - saidas;
    const margem = entradas > 0 ? (saldo / entradas) * 100 : 0;

    return {
      entradas,
      saidas,
      saldo,
      margem,
      totalLancamentos: transacoesFiltradas.length,
    };
  }, [transacoesFiltradas]);

  const saldosPorOrigem = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const transacao of transacoesFiltradas) {
      const sinal = transacao.tipo === "receita" ? 1 : -1;
      const atual = mapa.get(transacao.origem) || 0;
      mapa.set(transacao.origem, atual + transacao.valor * sinal);
    }

    return [...mapa.entries()]
      .map(([origem, valor]) => ({ origem, valor }))
      .sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor));
  }, [transacoesFiltradas]);

  const saldosPorFormaPagamento = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const transacao of transacoesFiltradas) {
      const forma = transacao.forma_pagamento || "nao_informado";
      const sinal = transacao.tipo === "receita" ? 1 : -1;
      const atual = mapa.get(forma) || 0;
      mapa.set(forma, atual + transacao.valor * sinal);
    }

    return [...mapa.entries()]
      .map(([forma, valor]) => ({ forma, valor }))
      .sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor));
  }, [transacoesFiltradas]);

  const abrirModalNovoLancamento = () => {
    setTipoLancamento("saida");
    setCategoriaLancamentoId("");
    setDescricaoLancamento("");
    setValorLancamento("");
    setFormaPagamentoLancamento("");
    setDataLancamento(paraDataInput(new Date()));
    setAnotacoesLancamento("");
    setNovaCategoriaNome("");
    setModalLancamentoAberto(true);
  };

  const criarCategoriaCustomizada = async () => {
    if (!tenant?.id) return;
    if (!novaCategoriaNome.trim()) return;

    const codigo = normalizarCodigoCategoria(novaCategoriaNome);
    if (!codigo) return;

    const existente = categorias.find(
      (categoria) =>
        categoria.tipo_movimento === tipoLancamento &&
        categoria.codigo.toLowerCase() === codigo.toLowerCase()
    );

    if (existente) {
      setCategoriaLancamentoId(existente.id);
      setNovaCategoriaNome("");
      return;
    }

    setCriandoCategoria(true);
    try {
      const { data, error } = await supabase
        .from("categorias_financeiras")
        .insert({
          tenant_id: tenant.id,
          tipo_negocio: tipoNegocio,
          tipo_movimento: tipoLancamento,
          codigo,
          nome: novaCategoriaNome.trim(),
          ativo: true,
          padrao: false,
          ordem: 50,
        })
        .select("id, tenant_id, tipo_negocio, tipo_movimento, codigo, nome, ativo, padrao, ordem")
        .single();

      if (error) throw error;

      await carregarCategorias();
      setCategoriaLancamentoId((data as CategoriaFinanceira).id);
      setNovaCategoriaNome("");
    } catch (error) {
      console.error("[Financeiro] Erro ao criar categoria:", error);
      alert("Não foi possível criar a categoria agora.");
    } finally {
      setCriandoCategoria(false);
    }
  };

  const salvarLancamentoManual = async () => {
    if (!tenant?.id) return;

    const valorNumerico = Number(valorLancamento);
    if (!descricaoLancamento.trim()) {
      alert("Preencha a descrição do lançamento.");
      return;
    }
    if (!categoriaLancamentoId) {
      alert("Selecione uma categoria.");
      return;
    }
    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      alert("Informe um valor maior que zero.");
      return;
    }
    if (!dataLancamento) {
      alert("Informe a data do lançamento.");
      return;
    }

    const categoriaSelecionada = categorias.find((categoria) => categoria.id === categoriaLancamentoId);
    if (!categoriaSelecionada) {
      alert("Categoria inválida.");
      return;
    }

    setSalvando(true);
    try {
      const { error } = await supabase.from("transacoes").insert({
        tenant_id: tenant.id,
        tipo: tipoLancamento === "entrada" ? "receita" : "despesa",
        categoria: categoriaSelecionada.codigo,
        categoria_id: categoriaSelecionada.id,
        categoria_nome: categoriaSelecionada.nome,
        descricao: descricaoLancamento.trim(),
        valor: valorNumerico,
        data: dataLancamento,
        forma_pagamento: formaPagamentoLancamento || null,
        origem: "manual",
        anotacoes: anotacoesLancamento.trim() || null,
        observacoes: anotacoesLancamento.trim() || null,
      });

      if (error) throw error;

      setModalLancamentoAberto(false);
      await buscarTransacoes();
    } catch (error: any) {
      console.error("[Financeiro] Erro ao salvar lançamento:", error);
      alert(error?.message || "Não foi possível salvar o lançamento.");
    } finally {
      setSalvando(false);
    }
  };

  const pedirConfirmacaoExclusao = (transacao: TransacaoCaixa) => {
    setConfirmacao({
      aberto: true,
      titulo: "Excluir lançamento manual",
      mensagem: `Deseja remover "${transacao.descricao}"?`,
      onConfirmar: async () => {
        if (!tenant?.id) return;
        setSalvando(true);
        try {
          const { error } = await supabase
            .from("transacoes")
            .delete()
            .eq("id", transacao.id)
            .eq("tenant_id", tenant.id)
            .eq("origem", "manual");

          if (error) throw error;
          setConfirmacao({ aberto: false, titulo: "", mensagem: "" });
          await buscarTransacoes();
        } catch (error) {
          console.error("[Financeiro] Erro ao excluir lançamento:", error);
          alert("Não foi possível excluir o lançamento.");
        } finally {
          setSalvando(false);
        }
      },
    });
  };

  const abrirModalNota = (transacao: TransacaoCaixa) => {
    setTransacaoNota(transacao);
    setTextoNota(transacao.anotacoes || "");
  };

  const salvarNota = async () => {
    if (!transacaoNota) return;

    setSalvando(true);
    try {
      const nota = textoNota.trim() || null;
      const { error } = await supabase
        .from("transacoes")
        .update({
          anotacoes: nota,
          observacoes: nota,
        })
        .eq("id", transacaoNota.id);

      if (error) throw error;

      setTransacaoNota(null);
      setTextoNota("");
      await buscarTransacoes();
    } catch (error) {
      console.error("[Financeiro] Erro ao salvar anotação:", error);
      alert("Não foi possível salvar a anotação.");
    } finally {
      setSalvando(false);
    }
  };

  const gerarExtratoPdf = () => {
    if (typeof window === "undefined") return;

    const popup = window.open("", "_blank", "width=1100,height=900");
    if (!popup) {
      alert("Habilite pop-up para gerar o extrato em PDF.");
      return;
    }

    const linhas = transacoesFiltradas
      .map((transacao) => {
        const categoria = transacao.categoria_ref?.nome || transacao.categoria_nome || transacao.categoria || "Sem categoria";
        const sinal = transacao.tipo === "receita" ? "+" : "-";
        const valor = `${sinal} ${formatarMoeda(transacao.valor)}`;
        const origem = ORIGENS_LABEL[transacao.origem] || transacao.origem;
        const forma = transacao.forma_pagamento || "Não informado";

        return `
          <tr>
            <td>${escapeHtml(formatarDataBR(transacao.data))}</td>
            <td>${escapeHtml(transacao.tipo === "receita" ? "Entrada" : "Saída")}</td>
            <td>${escapeHtml(categoria)}</td>
            <td>${escapeHtml(transacao.descricao)}</td>
            <td>${escapeHtml(origem)}</td>
            <td>${escapeHtml(forma)}</td>
            <td class="valor ${transacao.tipo === "receita" ? "entrada" : "saida"}">${escapeHtml(valor)}</td>
          </tr>
        `;
      })
      .join("");

    popup.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>Extrato de Caixa</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111827; margin: 32px; }
            .topo { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
            h1 { margin: 0; font-size: 22px; letter-spacing: 0.01em; }
            p { margin: 4px 0; color: #4b5563; }
            .resumo { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 20px 0 24px; }
            .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
            .label { font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 6px; }
            .valorCard { font-size: 18px; font-weight: 700; color: #111827; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border-bottom: 1px solid #e5e7eb; padding: 10px 8px; font-size: 12px; text-align: left; }
            th { color: #6b7280; font-weight: 600; text-transform: uppercase; font-size: 11px; background: #f9fafb; }
            .valor { font-weight: 700; text-align: right; }
            .valor.entrada { color: #047857; }
            .valor.saida { color: #b91c1c; }
            .rodape { margin-top: 18px; font-size: 11px; color: #6b7280; }
            @media print {
              body { margin: 20px; }
              .topo { margin-bottom: 18px; }
            }
          </style>
        </head>
        <body>
          <section class="topo">
            <div>
              <h1>Extrato de Caixa</h1>
              <p>${escapeHtml(tenant?.nome || "")}</p>
              <p>Período: ${escapeHtml(formatarDataBR(dataInicio))} a ${escapeHtml(formatarDataBR(dataFim))}</p>
            </div>
            <div>
              <p>Emitido em ${escapeHtml(format(new Date(), "dd/MM/yyyy HH:mm"))}</p>
              <p>Caixa aberto 24h</p>
            </div>
          </section>

          <section class="resumo">
            <div class="card">
              <div class="label">Entradas</div>
              <div class="valorCard">${escapeHtml(formatarMoeda(metricas.entradas))}</div>
            </div>
            <div class="card">
              <div class="label">Saídas</div>
              <div class="valorCard">${escapeHtml(formatarMoeda(metricas.saidas))}</div>
            </div>
            <div class="card">
              <div class="label">Saldo</div>
              <div class="valorCard">${escapeHtml(formatarMoeda(metricas.saldo))}</div>
            </div>
            <div class="card">
              <div class="label">Lançamentos</div>
              <div class="valorCard">${escapeHtml(String(metricas.totalLancamentos))}</div>
            </div>
          </section>

          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Descrição</th>
                <th>Origem</th>
                <th>Pagamento</th>
                <th style="text-align:right;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${linhas || '<tr><td colspan="7">Nenhum lançamento no período.</td></tr>'}
            </tbody>
          </table>

          <p class="rodape">
            Relatório gerado automaticamente para conferência de caixa.
          </p>
        </body>
      </html>
    `);

    popup.document.close();
    popup.focus();
    setTimeout(() => popup.print(), 400);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Caixa e Financeiro
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Controle completo do caixa {terminologia.estabelecimento.artigo}{" "}
              {terminologia.estabelecimento.singular.toLowerCase()} em tempo real.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="soft" onClick={() => void buscarTransacoes()} className="cursor-pointer">
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button onClick={abrirModalNovoLancamento} className="cursor-pointer bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
              <Plus className="mr-2 h-4 w-4" />
              Novo lançamento
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300">
            Caixa aberto 24h
          </span>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {transacoesFiltradas.length} lançamentos no período
          </span>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            Período: {formatarDataBR(dataInicio)} até {formatarDataBR(dataFim)}
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["7", "14", "30"] as const).map((opcao) => (
              <button
                key={opcao}
                type="button"
                onClick={() => aplicarPeriodoRapido(opcao)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  periodo === opcao
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {opcao} dias
              </button>
            ))}
            <Button variant="outline" onClick={gerarExtratoPdf} className="cursor-pointer">
              <Download className="mr-2 h-4 w-4" />
              Extrato PDF
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              type="date"
              value={dataInicio}
              onChange={(event) => {
                setPeriodo("custom");
                setDataInicio(event.target.value);
              }}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
            <input
              type="date"
              value={dataFim}
              onChange={(event) => {
                setPeriodo("custom");
                setDataFim(event.target.value);
              }}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <select
            value={tipoFiltro}
            onChange={(event) => setTipoFiltro(event.target.value as FiltroTipo)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="todos">Todos os tipos</option>
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas</option>
          </select>

          <select
            value={origemFiltro}
            onChange={(event) => setOrigemFiltro(event.target.value as "todas" | TransacaoCaixa["origem"])}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="todas">Todas as origens</option>
            <option value="manual">Manual</option>
            <option value="agendamento">Agendamento</option>
            <option value="atendimento_presencial">Atendimento presencial</option>
            <option value="ajuste">Ajuste</option>
            <option value="estorno">Estorno</option>
          </select>

          <select
            value={categoriaFiltro}
            onChange={(event) => setCategoriaFiltro(event.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="todas">Todas as categorias</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar descrição, nota, origem..."
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Entradas</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{formatarMoeda(metricas.entradas)}</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Agendamentos + lançamentos manuais</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Saídas</p>
          <p className="mt-2 text-2xl font-semibold text-rose-600 dark:text-rose-400">{formatarMoeda(metricas.saidas)}</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Despesas e ajustes</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Saldo do período</p>
          <p className={`mt-2 text-2xl font-semibold ${metricas.saldo >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {formatarMoeda(metricas.saldo)}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Caixa consolidado</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Margem</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{metricas.margem.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Com {metricas.totalLancamentos} lançamentos</p>
        </motion.div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Saldo detalhado por origem</h3>
          <div className="mt-4 space-y-2">
            {saldosPorOrigem.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Sem dados no período.</p>
            ) : (
              saldosPorOrigem.map((item) => (
                <div key={item.origem} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700">
                  <span className="text-sm text-zinc-700 dark:text-zinc-200">
                    {ORIGENS_LABEL[item.origem as TransacaoCaixa["origem"]] || item.origem}
                  </span>
                  <span className={`text-sm font-semibold ${item.valor >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {formatarMoeda(item.valor)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Saldo detalhado por pagamento</h3>
          <div className="mt-4 space-y-2">
            {saldosPorFormaPagamento.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Sem dados no período.</p>
            ) : (
              saldosPorFormaPagamento.map((item) => (
                <div key={item.forma} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700">
                  <span className="text-sm text-zinc-700 dark:text-zinc-200">
                    {item.forma === "nao_informado" ? "Não informado" : item.forma.toUpperCase()}
                  </span>
                  <span className={`text-sm font-semibold ${item.valor >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {formatarMoeda(item.valor)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Movimentações em tempo real</h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Novos agendamentos entram automaticamente no caixa e saem quando cancelados.
          </p>
        </div>

        {carregando ? (
          <div className="p-6 text-sm text-zinc-500 dark:text-zinc-400">Carregando movimentações...</div>
        ) : erroTela ? (
          <div className="p-6 text-sm text-rose-600 dark:text-rose-400">{erroTela}</div>
        ) : transacoesFiltradas.length === 0 ? (
          <div className="p-6 text-sm text-zinc-500 dark:text-zinc-400">Nenhum lançamento para os filtros atuais.</div>
        ) : (
          <>
            <div className="md:hidden space-y-3 p-4">
              {transacoesFiltradas.map((transacao) => {
                const categoria = transacao.categoria_ref?.nome || transacao.categoria_nome || transacao.categoria || "Sem categoria";
                const permiteExcluir = transacao.origem === "manual";
                const sinal = transacao.tipo === "receita" ? "+" : "-";

                return (
                  <div key={transacao.id} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatarDataBR(transacao.data)}</p>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{transacao.descricao}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${transacao.tipo === "receita" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"}`}>
                        {transacao.tipo === "receita" ? "Entrada" : "Saída"}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                      <div>
                        <p className="text-zinc-500 dark:text-zinc-400">Categoria</p>
                        <p className="font-medium">{categoria}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500 dark:text-zinc-400">Origem</p>
                        <p className="font-medium">{ORIGENS_LABEL[transacao.origem] || transacao.origem}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <p className={`text-sm font-semibold ${transacao.tipo === "receita" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {sinal} {formatarMoeda(transacao.valor)}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => abrirModalNota(transacao)}
                          className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          Nota
                        </button>
                        {permiteExcluir && (
                          <button
                            type="button"
                            onClick={() => pedirConfirmacaoExclusao(transacao)}
                            className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-600 transition hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-900/20"
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800/70">
                  <tr className="text-left text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Categoria</th>
                    <th className="px-4 py-3 font-medium">Descrição</th>
                    <th className="px-4 py-3 font-medium">Origem</th>
                    <th className="px-4 py-3 font-medium">Valor</th>
                    <th className="px-4 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {transacoesFiltradas.map((transacao) => {
                    const categoria = transacao.categoria_ref?.nome || transacao.categoria_nome || transacao.categoria || "Sem categoria";
                    const permiteExcluir = transacao.origem === "manual";
                    const sinal = transacao.tipo === "receita" ? "+" : "-";

                    return (
                      <tr key={transacao.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                        <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{formatarDataBR(transacao.data)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${transacao.tipo === "receita" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"}`}>
                            {transacao.tipo === "receita" ? "Entrada" : "Saída"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{categoria}</td>
                        <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">{transacao.descricao}</td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{ORIGENS_LABEL[transacao.origem] || transacao.origem}</td>
                        <td className={`px-4 py-3 font-semibold ${transacao.tipo === "receita" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {sinal} {formatarMoeda(transacao.valor)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => abrirModalNota(transacao)}
                              className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              Nota
                            </button>
                            {permiteExcluir && (
                              <button
                                type="button"
                                onClick={() => pedirConfirmacaoExclusao(transacao)}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2.5 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-900/20"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Excluir
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <ModalPortal aberto={modalLancamentoAberto} onFechar={() => setModalLancamentoAberto(false)}>
        <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Novo lançamento manual</h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Registre entrada ou saída com categoria e anotação.
          </p>

          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTipoLancamento("entrada");
                  setCategoriaLancamentoId("");
                }}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  tipoLancamento === "entrada"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                Entrada
              </button>
              <button
                type="button"
                onClick={() => {
                  setTipoLancamento("saida");
                  setCategoriaLancamentoId("");
                }}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  tipoLancamento === "saida"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                Saída
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Categoria
              </label>
              <select
                value={categoriaLancamentoId}
                onChange={(event) => setCategoriaLancamentoId(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                <option value="">Selecione</option>
                {categoriasDisponiveis.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <input
                type="text"
                value={novaCategoriaNome}
                onChange={(event) => setNovaCategoriaNome(event.target.value)}
                placeholder="Nova categoria personalizada"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
              <Button
                onClick={criarCategoriaCustomizada}
                disabled={criandoCategoria || !novaCategoriaNome.trim()}
                variant="outline"
                className="cursor-pointer"
              >
                {criandoCategoria ? "Criando..." : "Adicionar categoria"}
              </Button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Descrição
              </label>
              <input
                type="text"
                value={descricaoLancamento}
                onChange={(event) => setDescricaoLancamento(event.target.value)}
                placeholder="Ex: Compra de produtos"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Valor
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={valorLancamento}
                  onChange={(event) => setValorLancamento(event.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Pagamento
                </label>
                <select
                  value={formaPagamentoLancamento}
                  onChange={(event) => setFormaPagamentoLancamento(event.target.value as "" | FormaPagamento)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  <option value="">Não informar</option>
                  {FORMAS_PAGAMENTO.map((forma) => (
                    <option key={forma.value} value={forma.value}>
                      {forma.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Data
                </label>
                <input
                  type="date"
                  value={dataLancamento}
                  onChange={(event) => setDataLancamento(event.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Anotações
              </label>
              <TextArea
                value={anotacoesLancamento}
                onChange={(event) => setAnotacoesLancamento(event.target.value)}
                placeholder="Detalhes complementares do lançamento"
                className="min-h-[90px]"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalLancamentoAberto(false)} className="cursor-pointer">
              Cancelar
            </Button>
            <Button onClick={salvarLancamentoManual} disabled={salvando} className="cursor-pointer bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
              {salvando ? "Salvando..." : "Salvar lançamento"}
            </Button>
          </div>
        </div>
      </ModalPortal>

      <ModalPortal aberto={Boolean(transacaoNota)} onFechar={() => setTransacaoNota(null)}>
        <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Anotações do lançamento</h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {transacaoNota?.descricao}
          </p>

          <div className="mt-4">
            <TextArea
              value={textoNota}
              onChange={(event) => setTextoNota(event.target.value)}
              placeholder="Adicione observações internas"
              className="min-h-[140px]"
            />
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTransacaoNota(null)} className="cursor-pointer">
              Fechar
            </Button>
            <Button onClick={salvarNota} disabled={salvando} className="cursor-pointer bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
              {salvando ? "Salvando..." : "Salvar anotação"}
            </Button>
          </div>
        </div>
      </ModalPortal>

      <ModalPortal aberto={confirmacao.aberto} onFechar={() => setConfirmacao({ aberto: false, titulo: "", mensagem: "" })}>
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{confirmacao.titulo}</h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{confirmacao.mensagem}</p>

          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmacao({ aberto: false, titulo: "", mensagem: "" })}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              color="red"
              onClick={() => void confirmacao.onConfirmar?.()}
              disabled={salvando}
              className="cursor-pointer"
            >
              {salvando ? "Excluindo..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
