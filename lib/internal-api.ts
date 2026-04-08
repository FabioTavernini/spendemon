import { headers } from 'next/headers'

function getOriginFromHeaders(headerStore: Headers): string {
  const protocol = headerStore.get('x-forwarded-proto') ?? 'http'
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host')

  if (!host) {
    return process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  }

  return `${protocol}://${host}`
}

export async function fetchInternalApi(input: string, init?: RequestInit) {
  const headerStore = await headers()
  const origin = getOriginFromHeaders(headerStore)
  const cookie = headerStore.get('cookie')
  const target = input.startsWith('http') ? input : `${origin}${input}`
  const requestHeaders = new Headers(init?.headers)

  if (cookie) {
    requestHeaders.set('cookie', cookie)
  }

  return fetch(target, {
    ...init,
    headers: requestHeaders,
  })
}
