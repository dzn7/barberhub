/**
 * API Route Proxy para o Bot WhatsApp
 * Contorna problemas de CORS fazendo proxy das requisições para a VM
 */

import { NextRequest, NextResponse } from 'next/server'

const BOT_URL = 'http://34.151.235.113:3001'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/')
    const searchParams = request.nextUrl.searchParams.toString()
    const url = `${BOT_URL}/${path}${searchParams ? `?${searchParams}` : ''}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Erro no proxy do bot:', error)
    return NextResponse.json(
      { sucesso: false, erro: error.message || 'Erro ao conectar com o bot' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/')
    const url = `${BOT_URL}/${path}`
    
    let body = null
    try {
      body = await request.json()
    } catch {
      // Sem body
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Erro no proxy do bot:', error)
    return NextResponse.json(
      { sucesso: false, erro: error.message || 'Erro ao conectar com o bot' },
      { status: 500 }
    )
  }
}
