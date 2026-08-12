import { getStorage, setStorage } from './storage'

export interface GitHubUpdateInfo {
  hasUpdate: boolean
  latestVersion: string
  currentVersion: string
  releaseUrl: string
  downloadUrl: string
  releaseNotes: string
  checkedAt: number
}

const STORAGE_KEYS = {
  GITHUB_REPO: 'wku_github_repo',
  LAST_UPDATE_CHECK: 'wku_last_update_check'
}

const DEFAULT_REPO = 'faqih/aman-chat-extension'

export async function getGitHubRepo(): Promise<string> {
  return getStorage<string>(STORAGE_KEYS.GITHUB_REPO, DEFAULT_REPO)
}

export async function setGitHubRepo(repo: string): Promise<void> {
  return setStorage<string>(STORAGE_KEYS.GITHUB_REPO, repo.trim())
}

export function getCurrentVersion(): string {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getManifest) {
    try {
      return chrome.runtime.getManifest().version
    } catch {
      return '3.0.0'
    }
  }
  return '3.0.0'
}

export function compareVersions(v1: string, v2: string): number {
  const clean1 = v1.replace(/^v/i, '').split('.').map(Number)
  const clean2 = v2.replace(/^v/i, '').split('.').map(Number)
  const maxLen = Math.max(clean1.length, clean2.length)
  for (let i = 0; i < maxLen; i++) {
    const num1 = clean1[i] || 0
    const num2 = clean2[i] || 0
    if (num1 > num2) return 1
    if (num1 < num2) return -1
  }
  return 0
}

export async function checkForGitHubUpdate(repoName?: string): Promise<GitHubUpdateInfo> {
  const currentVersion = getCurrentVersion()
  const repo = repoName || (await getGitHubRepo())
  
  if (!repo || !repo.includes('/')) {
    return {
      hasUpdate: false,
      latestVersion: currentVersion,
      currentVersion,
      releaseUrl: '',
      downloadUrl: '',
      releaseNotes: '',
      checkedAt: Date.now()
    }
  }

  try {
    const apiUrl = `https://api.github.com/repos/${repo}/releases/latest`
    const response = await fetch(apiUrl, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    })

    if (!response.ok) {
      throw new Error(`GitHub API HTTP ${response.status}`)
    }

    const data = await response.json()
    const latestVersion = (data.tag_name || '').replace(/^v/i, '').trim()
    const releaseUrl = data.html_url || `https://github.com/${repo}/releases`
    
    let downloadUrl = releaseUrl
    if (Array.isArray(data.assets) && data.assets.length > 0) {
      const zipAsset = data.assets.find((a: any) => a.name && (a.name.endsWith('.zip') || a.name.endsWith('.crx')))
      if (zipAsset && zipAsset.browser_download_url) {
        downloadUrl = zipAsset.browser_download_url
      }
    }

    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0
    const info: GitHubUpdateInfo = {
      hasUpdate,
      latestVersion,
      currentVersion,
      releaseUrl,
      downloadUrl,
      releaseNotes: data.body || '',
      checkedAt: Date.now()
    }

    await setStorage(STORAGE_KEYS.LAST_UPDATE_CHECK, info)
    return info
  } catch (err) {
    console.warn('[AMAN CHAT] GitHub Update check skipped/error:', err)
    const cached = await getStorage<GitHubUpdateInfo | null>(STORAGE_KEYS.LAST_UPDATE_CHECK, null)
    if (cached) return cached
    return {
      hasUpdate: false,
      latestVersion: currentVersion,
      currentVersion,
      releaseUrl: `https://github.com/${repo}/releases`,
      downloadUrl: '',
      releaseNotes: '',
      checkedAt: Date.now()
    }
  }
}
