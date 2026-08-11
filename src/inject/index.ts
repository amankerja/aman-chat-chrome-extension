(function() {
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
          }, '*')
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
  
  ;(window as unknown as Record<string, unknown>).__WKU_getModuleStore = function() {
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
  }, '*')
  
  console.log('[AMAN CHAT] Inject script loaded successfully.')
})()
