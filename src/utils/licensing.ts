/**
 * License key format: AMAN-XXXX-XXXX-CCCC
 * The last group is a checksum derived from the first three groups, so a
 * key that isn't actually issued by AMAN CHAT will fail the checksum check
 * even if it "looks" plausible.
 *
 * IMPORTANT — this is still a CLIENT-SIDE check only. It stops the old bug
 * (any string of 6+ characters was accepted as a valid Premium license),
 * but a determined user can still read this file and compute a checksum
 * that passes, because all the validation logic ships in the extension
 * itself. For a real paid product this needs a server-side check: call
 * your license API from `verifyLicenseKey()` below (a `remoteVerify`
 * hook is already wired up for that) and only trust its response.
 */

const GROUP_LEN = 4
const PREFIX = 'AMAN'

function checksumGroup(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash.toString(36).toUpperCase().padStart(GROUP_LEN, '0').slice(-GROUP_LEN)
}

export function isValidLicenseFormat(rawKey: string): boolean {
  const key = rawKey.trim().toUpperCase()
  const parts = key.split('-')
  if (parts.length !== 4) return false
  const [prefix, g1, g2, checksum] = parts
  if (prefix !== PREFIX) return false
  if (g1.length !== GROUP_LEN || g2.length !== GROUP_LEN || checksum.length !== GROUP_LEN) return false
  if (!/^[A-Z0-9]{4}$/.test(g1) || !/^[A-Z0-9]{4}$/.test(g2)) return false
  return checksumGroup(`${prefix}-${g1}-${g2}`) === checksum
}

/** Helper for generating valid demo keys (e.g. from an admin/testing tool). */
export function generateLicenseKey(seed: string): string {
  const clean = seed.toUpperCase().replace(/[^A-Z0-9]/g, '').padEnd(8, '0')
  const g1 = clean.slice(0, 4)
  const g2 = clean.slice(4, 8)
  const checksum = checksumGroup(`${PREFIX}-${g1}-${g2}`)
  return `${PREFIX}-${g1}-${g2}-${checksum}`
}

export interface LicenseVerificationResult {
  valid: boolean
  reason?: 'bad_format' | 'remote_rejected' | 'remote_unreachable'
}

/**
 * Optional hook for real server-side verification. Left unset by default
 * (falls back to format-only checking) — wire this up to your actual
 * licensing backend when one exists.
 */
export type RemoteVerifier = (key: string) => Promise<boolean>
let remoteVerify: RemoteVerifier | null = null

export function setRemoteLicenseVerifier(fn: RemoteVerifier | null): void {
  remoteVerify = fn
}

export async function verifyLicenseKey(rawKey: string): Promise<LicenseVerificationResult> {
  if (!isValidLicenseFormat(rawKey)) {
    return { valid: false, reason: 'bad_format' }
  }

  if (remoteVerify) {
    try {
      const ok = await remoteVerify(rawKey.trim().toUpperCase())
      return ok ? { valid: true } : { valid: false, reason: 'remote_rejected' }
    } catch {
      return { valid: false, reason: 'remote_unreachable' }
    }
  }

  return { valid: true }
}
