/**
 * Testes para tipos e funções de tipos de negócio
 * 
 * Execute com: npx vitest run lib/__tests__/tipos-negocio.test.ts
 * Ou manualmente verifique os casos de teste
 */

import { describe, it, expect } from 'vitest'
import {
  TipoNegocio,
  ehTipoNegocioValido,
  ehTipoNegocioFeminino,
  tipoNegocioPadrao,
  TIPOS_NEGOCIO_DISPONIVEIS,
  OPCOES_TIPO_NEGOCIO
} from '../tipos-negocio'

describe('tipos-negocio', () => {
  describe('ehTipoNegocioValido', () => {
    it('deve retornar true para barbearia', () => {
      expect(ehTipoNegocioValido('barbearia')).toBe(true)
    })

    it('deve retornar true para nail_designer', () => {
      expect(ehTipoNegocioValido('nail_designer')).toBe(true)
    })

    it('deve retornar true para lash_designer e cabeleireira', () => {
      expect(ehTipoNegocioValido('lash_designer')).toBe(true)
      expect(ehTipoNegocioValido('cabeleireira')).toBe(true)
    })

    it('deve retornar false para tipo inválido', () => {
      expect(ehTipoNegocioValido('salao')).toBe(false)
      expect(ehTipoNegocioValido('')).toBe(false)
      expect(ehTipoNegocioValido('BARBEARIA')).toBe(false)
    })
  })

  describe('tipoNegocioPadrao', () => {
    it('deve retornar barbearia como padrão', () => {
      expect(tipoNegocioPadrao()).toBe('barbearia')
    })
  })

  describe('TIPOS_NEGOCIO_DISPONIVEIS', () => {
    it('deve conter os quatro tipos de negócio', () => {
      expect(TIPOS_NEGOCIO_DISPONIVEIS).toContain('barbearia')
      expect(TIPOS_NEGOCIO_DISPONIVEIS).toContain('nail_designer')
      expect(TIPOS_NEGOCIO_DISPONIVEIS).toContain('lash_designer')
      expect(TIPOS_NEGOCIO_DISPONIVEIS).toContain('cabeleireira')
    })

    it('deve ter exatamente 4 tipos', () => {
      expect(TIPOS_NEGOCIO_DISPONIVEIS).toHaveLength(4)
    })
  })

  describe('OPCOES_TIPO_NEGOCIO', () => {
    it('deve ter opções para cada tipo disponível', () => {
      expect(OPCOES_TIPO_NEGOCIO).toHaveLength(TIPOS_NEGOCIO_DISPONIVEIS.length)
    })

    it('cada opção deve ter titulo, descricao, imagem e cor', () => {
      OPCOES_TIPO_NEGOCIO.forEach((opcao) => {
        expect(opcao).toHaveProperty('tipo')
        expect(opcao).toHaveProperty('titulo')
        expect(opcao).toHaveProperty('descricao')
        expect(opcao).toHaveProperty('imagem')
        expect(opcao).toHaveProperty('cor')
      })
    })

    it('opção barbearia deve ter imagem barber.png', () => {
      const opcaoBarbearia = OPCOES_TIPO_NEGOCIO.find(o => o.tipo === 'barbearia')
      expect(opcaoBarbearia?.imagem).toBe('/barber.png')
    })

    it('opção nail_designer deve ter imagem naildesign.png', () => {
      const opcaoNail = OPCOES_TIPO_NEGOCIO.find(o => o.tipo === 'nail_designer')
      expect(opcaoNail?.imagem).toBe('/naildesign.png')
    })

    it('opção lash_designer deve ter imagem provisória naildesign.png', () => {
      const opcaoLash = OPCOES_TIPO_NEGOCIO.find(o => o.tipo === 'lash_designer')
      expect(opcaoLash?.imagem).toBe('/naildesign.png')
    })

    it('opção cabeleireira deve ter imagem provisória barber.png', () => {
      const opcaoCabeleireira = OPCOES_TIPO_NEGOCIO.find(o => o.tipo === 'cabeleireira')
      expect(opcaoCabeleireira?.imagem).toBe('/barber.png')
    })
  })

  describe('ehTipoNegocioFeminino', () => {
    it('deve retornar true para nail_designer, lash_designer e cabeleireira', () => {
      expect(ehTipoNegocioFeminino('nail_designer')).toBe(true)
      expect(ehTipoNegocioFeminino('lash_designer')).toBe(true)
      expect(ehTipoNegocioFeminino('cabeleireira')).toBe(true)
    })

    it('deve retornar false para barbearia', () => {
      expect(ehTipoNegocioFeminino('barbearia')).toBe(false)
    })
  })
})
