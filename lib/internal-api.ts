import { headers } from 'next/headers'

const INTERNAL_BASE = `http://localhost:${process.env.PORT ?? 3000}`

export async function fetchInternalApi(input: string, init?: RequestInit) {
  const headerStore = await headers()
  const cookie = headerStore.get('cookie')
  const target = input.startsWith('http') ? input : `${INTERNAL_BASE}${input}`
  const requestHeaders = new Headers(init?.headers)

  if (cookie) {
    requestHeaders.set('cookie', cookie)
  }

  return fetch(target, {
    ...init,
    headers: requestHeaders,
  })
}
