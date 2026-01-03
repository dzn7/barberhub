import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas que precisam de autenticação
  if (pathname.startsWith('/admin')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    // Verificar token de autenticação
    const token = request.cookies.get('sb-access-token')?.value ||
                  request.cookies.get('sb-euoexutuawrqxhlqtkud-auth-token')?.value
    
    if (!token) {
      return NextResponse.redirect(new URL('/entrar', request.url))
    }

    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      const { data: { user }, error } = await supabase.auth.getUser(token)
      
      if (error || !user) {
        return NextResponse.redirect(new URL('/entrar', request.url))
      }
    } catch {
      return NextResponse.redirect(new URL('/entrar', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}
