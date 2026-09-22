import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { User } from 'firebase/auth'
import {
  cloudReady,
  deviceName,
  listVersions,
  pruneVersions,
  readCloud,
  saveVersion,
  signIn,
  signOutCloud,
  watchCloud,
  watchUser,
  writeCloud,
} from './cloud'
import type { CloudSnapshot, CloudVersion } from './cloud'
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

/**
 * De quanto em quanto tempo se guarda uma cópia para poder voltar atrás. Uma
 * por gravação encheria a lista com os vinte últimos toques; assim cada cópia
 * é um ponto de retorno com algum tempo entre elas.
 */
const VERSION_EVERY_MS = 10 * 60 * 1000

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
  /**
   * Só depois de se saber o que fica é que se pode ouvir a nuvem ou gravar nela.
   * Sem isto, o ouvinte ligava-se ao mesmo tempo que a verificação inicial: a
   * primeira resposta do servidor substituía os dados deste aparelho antes de
   * alguém perguntar seja o que for, e a escolha nem chegava a aparecer.
   */
  const [handshake, setHandshake] = useState<'idle' | 'checking' | 'done'>('idle')

  // O que está (ou vai) na nuvem, para não reenviar o que já lá está nem
  // reagir à nossa própria gravação.
  const syncedRef = useRef<string | null>(null)
  const dataRef = useRef(data)
  dataRef.current = data

  useEffect(() => watchUser(setUser), [])

  // Quando foi guardada a última cópia, para não guardar uma a cada gravação.
  const lastVersionRef = useRef(0)

  /**
   * Guarda uma cópia do estado. Uma cópia que falhe nunca pode estragar a
   * gravação principal — por exemplo, se as regras do Firestore ainda não
   * deixarem escrever na subcoleção, a sincronização continua a funcionar.
   */
  const snapshot = useCallback(async (uid: string, payload: AppData, reason: string) => {
    try {
      await saveVersion(uid, payload, deviceName(), reason)
      lastVersionRef.current = Date.now()
      await pruneVersions(uid)
    } catch {
      // Sem histórico é pior, mas não é motivo para parar a sincronização.
    }
  }, [])

  const push = useCallback(
    async (uid: string, payload: AppData, versionReason?: string) => {
      const json = JSON.stringify(payload)
      syncedRef.current = json
      setStatus('saving')
      try {
        await writeCloud(uid, payload, deviceName())
        setLastSync(new Date())
        setStatus('synced')
        setError(null)
        const due = Date.now() - lastVersionRef.current >= VERSION_EVERY_MS
        if (versionReason || due) {
          void snapshot(uid, payload, versionReason ?? 'Gravação automática')
        }
      } catch (err) {
        setStatus('error')
        setError(errorMessage(err))
      }
    },
    [snapshot],
  )

  // Primeira ligação: decidir o que fica antes de sincronizar seja o que for.
  useEffect(() => {
    if (!user) {
      setStatus(cloudReady ? 'signed-out' : 'off')
      syncedRef.current = null
      setConflict(null)
      setHandshake('idle')
      return
    }
    let cancelled = false
    setStatus('connecting')
    setHandshake('checking')
    readCloud(user.uid)
      .then((remote) => {
        if (cancelled) return
        if (!remote) {
          setHandshake('done')
          void push(user.uid, dataRef.current)
          return
        }
        if (JSON.stringify(remote.data) === JSON.stringify(dataRef.current)) {
          syncedRef.current = JSON.stringify(remote.data)
          setLastSync(remote.updatedAt)
          setStatus('synced')
          setHandshake('done')
          return
        }
        // Fica à espera da escolha: nem se ouve a nuvem nem se grava nela.
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
    if (!user || conflict || handshake !== 'done') return
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
  }, [user, conflict, handshake, applyRemote])

  // Enviar o que se altera aqui, com uma pausa para não gravar a cada tecla.
  useEffect(() => {
    if (!user || conflict || handshake !== 'done') return
    const json = JSON.stringify(data)
    if (json === syncedRef.current) return
    const timer = setTimeout(() => void push(user.uid, data), SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [data, user, conflict, handshake, push])

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
        setHandshake('done')
        setStatus('synced')
      },
      /** Fica o deste aparelho; a nuvem é substituída. */
      keepLocal: () => {
        if (!user || !conflict) return
        const discarded = conflict.data
        const mine = dataRef.current
        setConflict(null)
        void (async () => {
          // Guarda o que estava na nuvem antes de o deitar fora: é a escolha
          // mais fácil de fazer por engano e a mais difícil de desfazer.
          await snapshot(user.uid, discarded, 'Cópia da nuvem antes de ser substituída')
          await push(user.uid, mine, 'Dados deste aparelho, escolhidos no conflito')
          // Só agora: enquanto a nuvem ainda tiver os dados antigos, ligar o
          // ouvinte trazia-os de volta por cima da escolha que acabou de ser
          // feita.
          setHandshake('done')
        })()
      },
      /** As cópias guardadas, da mais recente para a mais antiga. */
      listVersions: async () => {
        if (!user) return [] as CloudVersion[]
        return listVersions(user.uid)
      },
      /** Volta a um estado guardado. O estado atual fica guardado antes. */
      restoreVersion: async (version: CloudVersion) => {
        if (!user) return
        await snapshot(user.uid, dataRef.current, 'Estado anterior, antes de repor uma cópia')
        // Aplicar em local chega: a gravação normal leva isto à nuvem a seguir,
        // já passado pela normalização.
        applyRemote(version.data)
      },
    }),
    [conflict, user, applyRemote, push, snapshot],
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
