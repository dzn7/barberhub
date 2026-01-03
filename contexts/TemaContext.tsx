"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Tema = "light" | "dark";

interface TemaContextProps {
  tema: Tema;
  alternarTema: () => void;
  definirTema: (tema: Tema) => void;
}

const TemaContext = createContext<TemaContextProps | undefined>(undefined);

/**
 * Provider do contexto de tema
 * Gerencia o estado do tema (claro/escuro) da aplicação
 * Persiste a preferência do usuário no localStorage
 */
export function TemaProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = useState<Tema>("dark");
  const [montado, setMontado] = useState(false);

  // Carrega o tema salvo no localStorage ao montar o componente
  useEffect(() => {
    setMontado(true);
    const temaSalvo = localStorage.getItem("tema") as Tema;
    
    if (temaSalvo) {
      setTema(temaSalvo);
    } else {
      // Verifica a preferência do sistema
      const prefereDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTema(prefereDark ? "dark" : "light");
    }
  }, []);

  // Atualiza a classe no HTML e salva no localStorage quando o tema muda
  useEffect(() => {
    if (!montado) return;

    const root = document.documentElement;
    
    if (tema === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }

    localStorage.setItem("tema", tema);
  }, [tema, montado]);

  /**
   * Alterna entre tema claro e escuro
   */
  const alternarTema = () => {
    setTema((temaAtual) => (temaAtual === "light" ? "dark" : "light"));
  };

  /**
   * Define um tema específico
   */
  const definirTema = (novoTema: Tema) => {
    setTema(novoTema);
  };

  // Evita flash de conteúdo não estilizado
  if (!montado) {
    return null;
  }

  return (
    <TemaContext.Provider value={{ tema, alternarTema, definirTema }}>
      {children}
    </TemaContext.Provider>
  );
}

/**
 * Hook para acessar o contexto de tema
 * 
 * @throws Erro se usado fora do TemaProvider
 * @returns Objeto com o tema atual e funções para alterá-lo
 */
export function useTema() {
  const context = useContext(TemaContext);
  
  if (context === undefined) {
    throw new Error("useTema deve ser usado dentro de um TemaProvider");
  }
  
  return context;
}
