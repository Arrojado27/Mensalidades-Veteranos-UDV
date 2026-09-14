import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { User } from 'firebase/auth'
import {
  cloudReady,
  deviceName,
  readCloud,
  signIn,
  signOutCloud,
  watchCloud,
  watchUser,
  writeCloud,
} from './cloud'
import type { CloudSnapshot } from './cloud'
import type { AppData } from '../types'

export type CloudStatus = 'off' | 'signed-out' | 'connecting' | 'synced' | 'saving' | 'error'

export interface CloudState {
  /** A app foi publicada com um projeto configurado? */
  ready: boolean
  email: string | null
  status: CloudStatus
  lastSync: Date | null
  error: string | null
  /**
   * Preenchido quando, ao ligar a conta, há dados dos dois lados e é preciso
   * decidir qual fica. Nunca se apaga nada sem esta escolha.
   */
  conflict: CloudSnapshot | null
}

const SAVE_DELAY_MS = 1200

function errorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? ''
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return 'Email ou palavra-passe errados.'
  }
  if (code === 'auth/user-not-found') return 'Não há conta com esse email.'
  if (code === 'auth/too-many-requests') return 'Demasiadas tentativas. Espera um pouco.'
  if (code === 'auth/network-request-failed') return 'Sem ligação à internet.'
  if (code === 'auth/unauthorized-domain') {
    return 'Este endereço não está autorizado no Firebase (Authentication > Definições > Domínios autorizados).'
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Falta ativar o início de sessão por email/palavra-passe no Firebase.'
  }
  if (code === 'permission-denied') return 'Sem permissão para aceder a estes dados.'
  return (err as Error)?.message ?? 'Não foi possível sincronizar.'
}

/**
 * Mantém o estado da app igual na nuvem e neste aparelho. Enquanto não houver
 * sessão iniciada, a app continua a viver só no armazenamento local.
 */
export function useCloudSync(data: AppData, applyRemote: (data: AppData) => void) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<CloudStatus>(cloudReady ? 'signed-out' : 'off')
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<CloudSnapshot | null>(null)

  // O que está (ou vai) na nuvem, para não reenviar o que já lá está nem
  // reagir à nossa própria gravação.
  const syncedRef = useRef<string | null>(null)
  const dataRef = useRef(data)
  dataRef.current = data

  useEffect(() => watchUser(setUser), [])

  const push = useCallback(
    async (uid: string, payload: AppData) => {
      const json = JSON.stringify(payload)
      syncedRef.current = json
      setStatus('saving')
      try {
        await writeCloud(uid, payload, deviceName())
        setLastSync(new Date())
        setStatus('synced')
        setError(null)
      } catch (err) {
        setStatus('error')
        setError(errorMessage(err))
      }
    },
    [],
  )

  // Primeira ligação: decidir o que fica antes de sincronizar seja o que for.
  useEffect(() => {
    if (!user) {
      setStatus(cloudReady ? 'signed-out' : 'off')
      syncedRef.current = null
      setConflict(null)
      return
    }
    let cancelled = false
    setStatus('connecting')
    readCloud(user.uid)
      .then((remote) => {
        if (cancelled) return
        if (!remote) {
          void push(user.uid, dataRef.current)
          return
        }
        if (JSON.stringify(remote.data) === JSON.stringify(dataRef.current)) {
          syncedRef.current = JSON.stringify(remote.data)
          setLastSync(remote.updatedAt)
          setStatus('synced')
          return
        }
        setConflict(remote)
        setStatus('connecting')
      })
      .catch((err) => {
        if (cancelled) return
        setStatus('error')
        setError(errorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [user, push])

  // Ouvir alterações feitas noutro aparelho.
  useEffect(() => {
    if (!user || conflict) return
    return watchCloud(user.uid, (remote) => {
      if (!remote) return
      const json = JSON.stringify(remote.data)
      if (json === syncedRef.current) {
        setLastSync(remote.updatedAt ?? new Date())
        return
      }
      syncedRef.current = json
      applyRemote(remote.data)
      setLastSync(remote.updatedAt ?? new Date())
      setStatus('synced')
    })
  }, [user, conflict, applyRemote])

  // Enviar o que se altera aqui, com uma pausa para não gravar a cada tecla.
  useEffect(() => {
    if (!user || conflict) return
    const json = JSON.stringify(data)
    if (json === syncedRef.current) return
    const timer = setTimeout(() => void push(user.uid, data), SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [data, user, conflict, push])

  const actions = useMemo(
    () => ({
      signIn: async (email: string, password: string) => {
        setError(null)
        setStatus('connecting')
        try {
          await signIn(email, password)
        } catch (err) {
          setStatus('signed-out')
          setError(errorMessage(err))
          throw err
        }
      },
      signOut: async () => {
        await signOutCloud()
        setLastSync(null)
        setError(null)
      },
      /** Fica o que está na nuvem; o deste aparelho é substituído. */
      keepCloud: () => {
        if (!conflict) return
        syncedRef.current = JSON.stringify(conflict.data)
        applyRemote(conflict.data)
        setLastSync(conflict.updatedAt)
        setConflict(null)
        setStatus('synced')
      },
      /** Fica o deste aparelho; a nuvem é substituída. */
      keepLocal: () => {
        if (!user || !conflict) return
        setConflict(null)
        void push(user.uid, dataRef.current)
      },
    }),
    [conflict, user, applyRemote, push],
  )

  const state: CloudState = {
    ready: cloudReady,
    email: user?.email ?? null,
    status,
    lastSync,
    error,
    conflict,
  }

  return { cloud: state, cloudActions: actions }
}
