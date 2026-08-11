/**
 * Runs inside the PAGE's own JS context (MAIN world), not the isolated
 * content-script world, so it can see WhatsApp Web's internal globals
 * (e.g. window.WebSocket, webpack chunks).
 *
 * IMPORTANT: this function is injected via
 * `chrome.scripting.executeScript({ world: 'MAIN', func: ... })` from
 * background.ts. Chrome serializes it with Function.prototype.toString()
 * and re-runs it in the page, so it must be fully self-contained: no
 * closures over outside variables, no imports.
 *
 * Previously this file was loaded via a raw <script src="..."> tag
 * pointing at the untranspiled .ts source (the file was only listed in
 * manifest.json's web_accessible_resources, so Vite/crxjs never ran it
 * through the TypeScript/esbuild pipeline). Browsers can't parse
 * TypeScript syntax, so the whole script silently failed with a
 * SyntaxError and none of this code ever actually ran. Injecting it as a
 * MAIN-world function instead means it goes through the normal build and
 * ships as plain, already-transpiled JavaScript.
 */
export function amanChatMainWorldInject(): void {
  const OriginalWebSocket = window.WebSocket

  class InterceptedWebSocket extends OriginalWebSocket {
    constructor(...args: ConstructorParameters<typeof WebSocket>) {
      super(...args)

      this.addEventListener('message', (event) => {
        try {
          window.postMessage({
            type: 'WKU_WS_MESSAGE',
            timestamp: Date.now(),
            hasData: !!event.data,
            dataType: typeof event.data
          }, window.location.origin)
        } catch (e) {
          console.error('[AMAN CHAT] WebSocket intercept error:', e)
        }
      })
    }
  }

  InterceptedWebSocket.prototype = OriginalWebSocket.prototype
  Object.defineProperty(window, 'WebSocket', {
    value: InterceptedWebSocket,
    writable: true,
    configurable: true
  })

  ;(window as unknown as Record<string, unknown>).__WKU_getModuleStore = function () {
    try {
      const chunks = (window as unknown as Record<string, unknown>).webpackChunkwhatsapp_web_client
      if (chunks) {
        let moduleStore: unknown = null
        ;(chunks as unknown[]).push([['__WKU_PROBE__'], {}, (e: unknown) => {
          moduleStore = e
        }])
        return moduleStore
      }
    } catch (e) {
      console.error('[AMAN CHAT] Module store error:', e)
    }
    return null
  }

  window.postMessage({
    type: 'WKU_INJECT_READY',
    version: '3.0.0'
  }, window.location.origin)

  console.log('[AMAN CHAT] Inject script loaded successfully.')
}
