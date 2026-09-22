import { initializeApp } from 'firebase/app'
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import {
  addDoc,
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import type { AppData } from '../types'

/**
 * A configuração de cliente do Firebase não é um segredo — é feita para ir no
 * pacote que corre no browser. Quem manda no acesso são as regras do Firestore
 * (firestore.rules), que só deixam cada conta ler e escrever os seus dados.
 */
// Config do projeto Firebase (consola > Definições do projeto > As suas apps).
// Enquanto estiver vazia, a app funciona na mesma, só sem sincronização.
const PROJECT = {
  apiKey: 'AIzaSyBuPdLmNjfctPn-me7K35If8JGLn54QIEc',
  authDomain: 'veteranos-udv.firebaseapp.com',
  projectId: 'veteranos-udv',
  storageBucket: 'veteranos-udv.firebasestorage.app',
  messagingSenderId: '257474229618',
  appId: '1:257474229618:web:1a1470ea7f307f240a99eb',
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? PROJECT.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? PROJECT.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? PROJECT.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? PROJECT.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID ?? PROJECT.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? PROJECT.appId,
}

const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true'

/** Sem projeto configurado, a app funciona na mesma — só sem sincronização. */
export const cloudReady = Boolean(firebaseConfig.projectId && firebaseConfig.apiKey)

const app = cloudReady ? initializeApp(firebaseConfig) : null
const auth = app ? getAuth(app) : null
const db = app ? getFirestore(app) : null

if (auth && db && useEmulator) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

if (auth) {
  // Mantém a sessão entre aberturas da app.
  setPersistence(auth, browserLocalPersistence).catch(() => {})
}

export interface CloudSnapshot {
  data: AppData
  updatedAt: Date | null
  device: string
}

/** Uma cópia datada do estado, guardada para se poder voltar atrás. */
export interface CloudVersion {
  id: string
  data: AppData
  savedAt: Date | null
  device: string
  reason: string
}

/** Quantas cópias antigas ficam guardadas. As mais velhas vão sendo apagadas. */
export const MAX_CLOUD_VERSIONS = 20

/** Um documento por conta: o estado da app inteiro, em JSON. */
function vaultRef(uid: string) {
  if (!db) throw new Error('Sincronização não configurada.')
  return doc(db, 'vaults', uid)
}

/**
 * As cópias antigas vivem numa subcoleção do documento da conta. Ficam à parte
 * do estado atual: gravar não mexe nas cópias e apagar cópias não mexe no que
 * está em uso.
 */
function versionsRef(uid: string) {
  if (!db) throw new Error('Sincronização não configurada.')
  return collection(db, 'vaults', uid, 'versions')
}

export async function saveVersion(uid: string, data: AppData, device: string, reason: string) {
  await addDoc(versionsRef(uid), {
    payload: JSON.stringify(data),
    // Hora do aparelho, não do servidor: o serverTimestamp só fica preenchido
    // depois de o servidor responder, e até lá a cópia acabada de gravar ficava
    // no fim da ordenação — a primeira a ser apagada pela limpeza.
    savedAt: Date.now(),
    device,
    reason,
  })
}

/** As cópias mais recentes primeiro. */
export async function listVersions(uid: string, max = MAX_CLOUD_VERSIONS): Promise<CloudVersion[]> {
  const snap = await getDocs(query(versionsRef(uid), orderBy('savedAt', 'desc'), limit(max)))
  const versions: CloudVersion[] = []
  for (const document of snap.docs) {
    const value = document.data() as {
      payload?: string
      savedAt?: number
      device?: string
      reason?: string
    }
    if (typeof value.payload !== 'string') continue
    try {
      versions.push({
        id: document.id,
        data: JSON.parse(value.payload) as AppData,
        savedAt: typeof value.savedAt === 'number' ? new Date(value.savedAt) : null,
        device: value.device ?? '',
        reason: value.reason ?? '',
      })
    } catch {
      // Uma cópia ilegível não pode esconder as outras.
    }
  }
  return versions
}

/** Deixa só as `keep` mais recentes. */
export async function pruneVersions(uid: string, keep = MAX_CLOUD_VERSIONS) {
  if (!db) return
  const snap = await getDocs(query(versionsRef(uid), orderBy('savedAt', 'desc')))
  const extra = snap.docs.slice(keep)
  if (extra.length === 0) return
  const batch = writeBatch(db)
  extra.forEach((document) => batch.delete(document.ref))
  await batch.commit()
}

export function watchUser(callback: (user: User | null) => void) {
  if (!auth) {
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(auth, callback)
}

export async function signIn(email: string, password: string) {
  if (!auth) throw new Error('Sincronização não configurada nesta versão da app.')
  await signInWithEmailAndPassword(auth, email.trim(), password)
}

export async function signOutCloud() {
  if (!auth) return
  await signOut(auth)
}

function parseSnapshot(raw: unknown): CloudSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as { payload?: string; updatedAt?: { toDate?: () => Date }; device?: string }
  if (typeof value.payload !== 'string') return null
  try {
    return {
      data: JSON.parse(value.payload) as AppData,
      updatedAt: value.updatedAt?.toDate ? value.updatedAt.toDate() : null,
      device: value.device ?? '',
    }
  } catch {
    return null
  }
}

/** Lê o que está na nuvem, sem ficar a ouvir. Usado ao ligar a conta. */
export async function readCloud(uid: string): Promise<CloudSnapshot | null> {
  const snap = await getDoc(vaultRef(uid))
  if (!snap.exists()) return null
  return parseSnapshot(snap.data())
}

export function watchCloud(uid: string, callback: (snapshot: CloudSnapshot | null) => void) {
  return onSnapshot(
    vaultRef(uid),
    (snap) => callback(snap.exists() ? parseSnapshot(snap.data()) : null),
    () => callback(null),
  )
}

export async function writeCloud(uid: string, data: AppData, device: string) {
  await setDoc(vaultRef(uid), {
    payload: JSON.stringify(data),
    updatedAt: serverTimestamp(),
    device,
  })
}

/** Nome curto deste aparelho, só para se perceber de onde veio a última gravação. */
export function deviceName() {
  const ua = navigator.userAgent
  if (/Android/i.test(ua)) return 'Android'
  if (/iPhone|iPad/i.test(ua)) return 'iPhone'
  if (/Windows/i.test(ua)) return 'Windows'
  if (/Mac/i.test(ua)) return 'Mac'
  return 'Browser'
}
