import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function safeNextUrl(request: NextRequest, rawNext: string | null) {
  const fallback = new URL('/onboarding', request.nextUrl.origin)
  if (!rawNext) return fallback

  try {
    const candidate = new URL(rawNext, request.nextUrl.origin)
    if (candidate.origin !== request.nextUrl.origin) return fallback
    return candidate
  } catch {
    return fallback
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const nextUrl = safeNextUrl(request, searchParams.get('next'))

  if (tokenHash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(nextUrl)
  }

  const errorUrl = new URL('/login', request.nextUrl.origin)
  errorUrl.searchParams.set('error', 'confirmation')
  return NextResponse.redirect(errorUrl)
}
