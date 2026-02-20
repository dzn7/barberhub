/**
 * Testes para configurações por tipo de negócio
 * 
 * Para executar: npx vitest run lib/__tests__/configuracoes-negocio.test.ts
 * Ou instale vitest: npm install -D vitest
 */

import { describe, it, expect } from 'vitest'
import {
  obterTerminologia,
  obterCategoriasServicos,
  obterTermoProfissional,
  obterTermoEstabelecimento,
  obterIconePrincipal,
  obterCoresSugeridas,
  CATEGORIAS_BARBEARIA,
  CATEGORIAS_NAIL,
  CATEGORIAS_LASH,
  CATEGORIAS_CABELEIREIRA
} from '../configuracoes-negocio'

describe('configuracoes-negocio', () => {
  describe('obterTerminologia', () => {
    it('deve retornar terminologia correta para barbearia', () => {
      const terminologia = obterTerminologia('barbearia')
      
      expect(terminologia.tipo).toBe('barbearia')
      expect(terminologia.profissional.singular).toBe('Barbeiro')
      expect(terminologia.profissional.plural).toBe('Barbeiros')
      expect(terminologia.estabelecimento.singular).toBe('Barbearia')
    })

    it('deve retornar terminologia correta para nail_designer', () => {
      const terminologia = obterTerminologia('nail_designer')
      
      expect(terminologia.tipo).toBe('nail_designer')
      expect(terminologia.profissional.singular).toBe('Nail Designer')
      expect(terminologia.profissional.plural).toBe('Nail Designers')
      expect(terminologia.estabelecimento.singular).toBe('Estúdio')
    })

    it('deve retornar terminologia correta para lash_designer', () => {
      const terminologia = obterTerminologia('lash_designer')

      expect(terminologia.tipo).toBe('lash_designer')
      expect(terminologia.profissional.singular).toBe('Lash Designer')
      expect(terminologia.profissional.plural).toBe('Lash Designers')
      expect(terminologia.estabelecimento.singular).toBe('Estúdio')
    })

    it('deve retornar terminologia correta para cabeleireira', () => {
      const terminologia = obterTerminologia('cabeleireira')

      expect(terminologia.tipo).toBe('cabeleireira')
      expect(terminologia.profissional.singular).toBe('Cabeleireira')
      expect(terminologia.profissional.plural).toBe('Cabeleireiras')
      expect(terminologia.estabelecimento.singular).toBe('Salão')
    })
  })

  describe('obterCategoriasServicos', () => {
    it('deve retornar categorias de barbearia', () => {
      const categorias = obterCategoriasServicos('barbearia')
      
      expect(categorias).toEqual(CATEGORIAS_BARBEARIA)
      expect(categorias.some(c => c.id === 'corte')).toBe(true)
      expect(categorias.some(c => c.id === 'barba')).toBe(true)
    })

    it('deve retornar categorias de nail designer', () => {
      const categorias = obterCategoriasServicos('nail_designer')
      
      expect(categorias).toEqual(CATEGORIAS_NAIL)
      expect(categorias.some(c => c.id === 'alongamento')).toBe(true)
      expect(categorias.some(c => c.id === 'nail_art')).toBe(true)
    })

    it('deve retornar categorias de lash designer', () => {
      const categorias = obterCategoriasServicos('lash_designer')

      expect(categorias).toEqual(CATEGORIAS_LASH)
      expect(categorias.some(c => c.id === 'extensao')).toBe(true)
      expect(categorias.some(c => c.id === 'lifting')).toBe(true)
    })

    it('deve retornar categorias de cabeleireira', () => {
      const categorias = obterCategoriasServicos('cabeleireira')

      expect(categorias).toEqual(CATEGORIAS_CABELEIREIRA)
      expect(categorias.some(c => c.id === 'corte')).toBe(true)
      expect(categorias.some(c => c.id === 'coloracao')).toBe(true)
    })
  })

  describe('obterTermoProfissional', () => {
    it('deve retornar termo singular sem artigo', () => {
      expect(obterTermoProfissional('barbearia')).toBe('Barbeiro')
      expect(obterTermoProfissional('nail_designer')).toBe('Nail Designer')
      expect(obterTermoProfissional('lash_designer')).toBe('Lash Designer')
      expect(obterTermoProfissional('cabeleireira')).toBe('Cabeleireira')
    })

    it('deve retornar termo plural sem artigo', () => {
      expect(obterTermoProfissional('barbearia', true)).toBe('Barbeiros')
      expect(obterTermoProfissional('nail_designer', true)).toBe('Nail Designers')
      expect(obterTermoProfissional('lash_designer', true)).toBe('Lash Designers')
      expect(obterTermoProfissional('cabeleireira', true)).toBe('Cabeleireiras')
    })

    it('deve retornar termo com artigo', () => {
      expect(obterTermoProfissional('barbearia', false, true)).toBe('o Barbeiro')
      expect(obterTermoProfissional('nail_designer', false, true)).toBe('a Nail Designer')
      expect(obterTermoProfissional('lash_designer', false, true)).toBe('a Lash Designer')
      expect(obterTermoProfissional('cabeleireira', false, true)).toBe('a Cabeleireira')
    })

    it('deve retornar termo plural com artigo', () => {
      expect(obterTermoProfissional('barbearia', true, true)).toBe('os Barbeiros')
      expect(obterTermoProfissional('nail_designer', true, true)).toBe('as Nail Designers')
      expect(obterTermoProfissional('lash_designer', true, true)).toBe('as Lash Designers')
      expect(obterTermoProfissional('cabeleireira', true, true)).toBe('as Cabeleireiras')
    })
  })

  describe('obterTermoEstabelecimento', () => {
    it('deve retornar termo sem artigo', () => {
      expect(obterTermoEstabelecimento('barbearia')).toBe('Barbearia')
      expect(obterTermoEstabelecimento('nail_designer')).toBe('Estúdio')
      expect(obterTermoEstabelecimento('lash_designer')).toBe('Estúdio')
      expect(obterTermoEstabelecimento('cabeleireira')).toBe('Salão')
    })

    it('deve retornar termo com artigo', () => {
      expect(obterTermoEstabelecimento('barbearia', true)).toBe('a Barbearia')
      expect(obterTermoEstabelecimento('nail_designer', true)).toBe('o Estúdio')
      expect(obterTermoEstabelecimento('lash_designer', true)).toBe('o Estúdio')
      expect(obterTermoEstabelecimento('cabeleireira', true)).toBe('o Salão')
    })
  })

  describe('obterIconePrincipal', () => {
    it('deve retornar ícone correto por tipo', () => {
      expect(obterIconePrincipal('barbearia')).toBe('Scissors')
      expect(obterIconePrincipal('nail_designer')).toBe('Hand')
      expect(obterIconePrincipal('lash_designer')).toBe('Sparkles')
      expect(obterIconePrincipal('cabeleireira')).toBe('Sparkles')
    })
  })

  describe('obterCoresSugeridas', () => {
    it('deve retornar cores para barbearia', () => {
      const cores = obterCoresSugeridas('barbearia')
      
      expect(cores).toHaveProperty('primaria')
      expect(cores).toHaveProperty('secundaria')
      expect(cores).toHaveProperty('destaque')
    })

    it('deve retornar cores diferentes para nail_designer', () => {
      const coresBarbearia = obterCoresSugeridas('barbearia')
      const coresNail = obterCoresSugeridas('nail_designer')
      
      // O destaque deve ser diferente (rosa para nail)
      expect(coresNail.destaque).not.toBe(coresBarbearia.destaque)
    })

    it('deve retornar cores diferentes para lash_designer e cabeleireira', () => {
      const coresBarbearia = obterCoresSugeridas('barbearia')
      const coresLash = obterCoresSugeridas('lash_designer')
      const coresCabelo = obterCoresSugeridas('cabeleireira')

      expect(coresLash.destaque).not.toBe(coresBarbearia.destaque)
      expect(coresCabelo.destaque).not.toBe(coresBarbearia.destaque)
    })
  })

  describe('CATEGORIAS_BARBEARIA', () => {
    it('deve ter categorias típicas de barbearia', () => {
      const ids = CATEGORIAS_BARBEARIA.map(c => c.id)
      
      expect(ids).toContain('corte')
      expect(ids).toContain('barba')
      expect(ids).toContain('sobrancelha')
    })
  })

  describe('CATEGORIAS_NAIL', () => {
    it('deve ter categorias típicas de nail designer', () => {
      const ids = CATEGORIAS_NAIL.map(c => c.id)
      
      expect(ids).toContain('alongamento')
      expect(ids).toContain('esmaltacao')
      expect(ids).toContain('nail_art')
      expect(ids).toContain('manicure')
      expect(ids).toContain('pedicure')
    })
  })

  describe('CATEGORIAS_LASH', () => {
    it('deve ter categorias típicas de lash designer', () => {
      const ids = CATEGORIAS_LASH.map(c => c.id)

      expect(ids).toContain('extensao')
      expect(ids).toContain('lifting')
      expect(ids).toContain('manutencao')
    })
  })

  describe('CATEGORIAS_CABELEIREIRA', () => {
    it('deve ter categorias típicas de cabeleireira', () => {
      const ids = CATEGORIAS_CABELEIREIRA.map(c => c.id)

      expect(ids).toContain('corte')
      expect(ids).toContain('escova')
      expect(ids).toContain('coloracao')
    })
  })
})
