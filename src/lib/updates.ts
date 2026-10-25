import { registerSW } from 'virtual:pwa-register'

/**
 * Atualização da app instalada.
 *
 * O plugin, por omissão, injetava um registo cru — `navigator.serviceWorker
 * .register('./sw.js')` dentro de um `window.addEventListener('load', ...)`.
 * Isso tem dois buracos numa app instalada:
 *
 * 1. Nunca recarregava a página. O service worker novo instalava-se e tomava
 *    conta da app, mas o HTML e o JS já carregados continuavam a ser os antigos
 *    — só ao arrancar outra vez de novo se via a versão nova.
 * 2. No Android a app fica em memória dias seguidos. Ao voltar a ela não há
 *    `load` nenhum, logo nunca se chegava a procurar versão nova.
 *
 * Passar pelo `registerSW` do plugin resolve o primeiro (em modo autoUpdate ele
 * recarrega quando o service worker novo fica ativo) e a verificação ao voltar
 * para a frente resolve o segundo.
 */

let registrationRef: ServiceWorkerRegistration | null = null

export type UpdateCheck = 'a-instalar' | 'atual' | 'indisponivel'

export function setupUpdates() {
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      registrationRef = registration
      const check = () => {
        if (document.visibilityState !== 'visible') return
        void registration.update().catch(() => {})
      }
      // Sempre que a app volta para a frente, que é quando interessa.
      document.addEventListener('visibilitychange', check)
      window.addEventListener('focus', check)
      // Rede de segurança para quem a deixa aberta horas.
      setInterval(check, 30 * 60 * 1000)
      check()
    },
  })
}

/** Procura uma versão nova agora. Em modo autoUpdate, a app recarrega sozinha. */
export async function checkForUpdate(): Promise<UpdateCheck> {
  const registration = registrationRef
  if (!registration) return 'indisponivel'
  try {
    await registration.update()
  } catch {
    return 'indisponivel'
  }
  return registration.installing || registration.waiting ? 'a-instalar' : 'atual'
}

export const buildId = __BUILD_ID__
