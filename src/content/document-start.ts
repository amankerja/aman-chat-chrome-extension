(function() {
  try {
    const identity = JSON.parse(window.localStorage.getItem('wa_identity') || '[]')
    const newIdentity = new Set([...identity, 99])
    window.localStorage.setItem('wa_identity', JSON.stringify([...newIdentity]))
  } catch (e) {
    console.error('[AMAN CHAT] Document start error:', e)
  }
})()
