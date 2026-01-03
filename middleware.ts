import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Middleware simplificado - autenticação é feita no cliente
  // A página /admin verifica autenticação via AuthContext
  return NextResponse.next()
}

export const config = {
  matcher: []
}
