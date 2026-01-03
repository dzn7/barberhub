import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Função utilitária para combinar classes CSS do Tailwind
 * Mescla classes condicionais e resolve conflitos de classes do Tailwind
 * 
 * @param inputs - Classes CSS a serem combinadas
 * @returns String com as classes mescladas
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata uma data para o formato brasileiro
 * 
 * @param date - Data a ser formatada
 * @returns String formatada no padrão DD/MM/YYYY
 */
export function formatarData(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

/**
 * Formata uma data e hora para o formato brasileiro
 * 
 * @param date - Data a ser formatada
 * @returns String formatada no padrão DD/MM/YYYY HH:MM
 */
export function formatarDataHora(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

/**
 * Formata um valor monetário para o formato brasileiro
 * 
 * @param valor - Valor a ser formatado
 * @returns String formatada no padrão R$ 0,00
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

/**
 * Valida se uma string é um email válido
 * 
 * @param email - Email a ser validado
 * @returns Boolean indicando se o email é válido
 */
export function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Valida se uma string é um telefone brasileiro válido
 * 
 * @param telefone - Telefone a ser validado
 * @returns Boolean indicando se o telefone é válido
 */
export function validarTelefone(telefone: string): boolean {
  const regex = /^(\+55\s?)?(\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}$/;
  return regex.test(telefone);
}

/**
 * Formata um telefone para o padrão brasileiro
 * 
 * @param telefone - Telefone a ser formatado
 * @returns String formatada no padrão (XX) XXXXX-XXXX
 */
export function formatarTelefone(telefone: string): string {
  const numeros = telefone.replace(/\D/g, "");
  
  if (numeros.length === 11) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
  } else if (numeros.length === 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }
  
  return telefone;
}
