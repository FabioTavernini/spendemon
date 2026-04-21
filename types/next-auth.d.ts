import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      groups: string[]
      roles: Array<'admin' | 'viewer'>
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    groups?: string[]
    roles?: Array<'admin' | 'viewer'>
  }
}
