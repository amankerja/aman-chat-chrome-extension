<template>
  <div class="ac-grabber">
    <div class="ac-section-header">
      <h2 class="ac-section-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        Group Grabber
      </h2>
      <span class="ac-badge" :class="isPremium ? 'customer' : 'queuing'">
        {{ isPremium ? 'PRO (MAX 1000)' : 'FREE (MAX 50)' }}
      </span>
    </div>

    <!-- Monthly Quota Meter Card -->
    <div class="ac-card">
      <div class="ac-section-header" style="margin-bottom: 6px;">
        <span class="ac-label" style="font-size: 0.76rem;">📊 Kuota Kontak Bulan Ini (All Groups)</span>
        <span class="ac-code-font" style="font-size: 0.75rem; font-weight: 700; color: #1e293b;">
          {{ currentUsage }} / {{ maxQuota }} Kontak
        </span>
      </div>

      <div class="ac-quota-track">
        <div
          class="ac-quota-fill"
          :class="{ 'is-full': remainingQuota === 0, 'is-warning': remainingQuota > 0 && remainingQuota <= 10 }"
          :style="{ width: `${usagePercent}%` }"
        ></div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
        <span class="ac-subtext" style="font-size: 0.65rem; color: #64748b;">
          Sisa Kuota: <strong>{{ remainingQuota }}</strong> kontak
        </span>
        <span class="ac-subtext" style="font-size: 0.65rem; color: #0284c7; font-weight: 600;">
          🔄 Reset: Tgl 1 awal bulan
        </span>
      </div>

      <div v-if="remainingQuota === 0" class="ac-quota-warning" style="margin-top: 8px;">
        ⚠️ Kuota grab kontak bulan ini telah habis (kunci kumulatif semua grup). Kuota akan otomatis direset menjadi 0 pada tanggal 1 awal bulan berikutnya.
      </div>
    </div>

    <!-- Active Group Detection Card -->
    <div class="ac-card">
      <div class="ac-section-header">
        <h3 class="ac-label">Grup WhatsApp Terbuka</h3>
        <button class="ac-btn secondary sm" style="padding: 2px 8px; font-size: 0.68rem;" @click="checkActiveGroup">
          🔄 Deteksi
        </button>
      </div>

      <div v-if="activeGroup.isGroup" class="ac-active-group-box">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 1.2rem;">👥</span>
          <div>
            <strong style="font-size: 0.8rem; color: #0f172a; display: block;">{{ activeGroup.groupName }}</strong>
            <span class="ac-subtext" style="font-size: 0.68rem; color: #059669;">
              ✓ Obrolan grup siap di-grab
            </span>
          </div>
        </div>

        <button
          class="ac-btn primary sm"
          style="margin-top: 10px; width: 100%;"
          :disabled="isGrabbing || remainingQuota === 0"
          @click="startGrab"
        >
          {{ isGrabbing ? (statusMessage || '⏳ Sedang Mengambil...') : '🎯 Ambil Kontak dari Grup Ini' }}
        </button>
      </div>

      <div v-else class="ac-empty-state" style="padding: 12px 8px;">
        <p style="margin: 0 0 6px; font-weight: 500;">Belum ada grup yang dibuka di WhatsApp Web.</p>
        <span class="ac-subtext" style="font-size: 0.7rem;">
          Buka obrolan salah satu grup di WhatsApp Web, lalu klik <strong>Deteksi</strong> atau tombol di bawah.
        </span>
      </div>
    </div>

    <!-- Scan All Groups in Chat List Card -->
    <div class="ac-card">
      <div class="ac-section-header">
        <h3 class="ac-label">Daftar Grup di Chat List</h3>
        <button class="ac-btn secondary sm" style="padding: 2px 8px; font-size: 0.68rem;" @click="scanChatListGroups">
          📋 Pindai Grup
        </button>
      </div>

      <div v-if="scannedGroups.length > 0" class="ac-group-list">
        <div v-for="g in scannedGroups" :key="g.id" class="ac-group-item">
          <span class="ac-group-name" :title="g.name">👥 {{ g.name }}</span>
          <button class="ac-btn secondary sm" style="padding: 2px 6px; font-size: 0.65rem;" @click="selectAndGrabGroup(g.name)">
            Buka & Grab
          </button>
        </div>
      </div>
      <div v-else class="ac-subtext" style="font-size: 0.68rem; color: #94a3b8; text-align: center; padding: 4px 0;">
        Klik "Pindai Grup" untuk mendeteksi semua grup yang ada di daftar obrolan Anda.
      </div>
    </div>

    <!-- Grabbed Contacts Result & Actions Card -->
    <div class="ac-card">
      <div class="ac-section-header">
        <div>
          <h3 class="ac-label">Hasil Grab Kontak</h3>
          <span class="ac-subtext">Total: {{ contacts.length }} kontak terkumpul</span>
        </div>
        <div style="display: flex; gap: 4px;">
          <button
            class="ac-btn primary sm"
            style="padding: 3px 8px; font-size: 0.7rem;"
            :disabled="contacts.length === 0"
            @click="exportCSV"
          >
            📥 Download CSV
          </button>
          <button
            class="ac-btn secondary sm"
            style="padding: 3px 6px; font-size: 0.7rem;"
            :disabled="contacts.length === 0"
            @click="copyAllNumbers"
            title="Salin semua nomor ke clipboard"
          >
            📋 Salin
          </button>
          <button
            class="ac-btn danger sm"
            style="padding: 3px 6px; font-size: 0.7rem;"
            :disabled="contacts.length === 0"
            @click="clearAllContacts"
            title="Hapus daftar riwayat grab"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Quick Actions (Send to Broadcast / CRM) -->
      <div v-if="contacts.length > 0" class="ac-grid-2" style="margin-top: 8px;">
        <button class="ac-btn secondary sm" style="font-size: 0.68rem;" @click="sendToBroadcast">
          📢 Kirim ke Broadcast
        </button>
        <button class="ac-btn secondary sm" style="font-size: 0.68rem;" @click="saveContactsToCRM">
          👥 Simpan ke CRM
        </button>
      </div>

      <!-- Search Filter -->
      <div v-if="contacts.length > 5" style="margin-top: 8px;">
        <input
          v-model="searchFilter"
          type="text"
          class="ac-input"
          placeholder="Cari nama, nomor, atau nama grup..."
          style="padding: 4px 8px; font-size: 0.72rem;"
        />
      </div>

      <!-- Contacts Table -->
      <div v-if="contacts.length === 0" class="ac-empty-state" style="margin-top: 10px;">
        Belum ada kontak yang di-grab. Buka grup lalu klik "Ambil Kontak dari Grup Ini".
      </div>

      <div v-else class="ac-table-container" style="max-height: 280px; overflow-y: auto; margin-top: 8px;">
        <table class="ac-table">
          <thead>
            <tr>
              <th style="width: 25px;">#</th>
              <th>Nama / Kontak</th>
              <th>Grup</th>
              <th style="width: 32px;">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(c, idx) in filteredContacts" :key="c.id">
              <td style="font-size: 0.65rem; color: #94a3b8;">{{ idx + 1 }}</td>
              <td>
                <div class="ac-contact-cell">
                  <span class="ac-contact-name" style="font-size: 0.72rem;">{{ c.name }}</span>
                  <span class="ac-contact-phone ac-code-font" style="font-size: 0.68rem;">{{ c.phone }}</span>
                </div>
              </td>
              <td>
                <span class="ac-subtext" style="font-size: 0.65rem; display: block; max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  {{ c.groupName }}
                </span>
              </td>
              <td>
                <button
                  class="ac-btn secondary sm"
                  style="padding: 2px 5px; font-size: 0.68rem;"
                  title="Buka Chat WA"
                  @click="openDirectChat(c.phone)"
                >
                  💬
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Notification Toast / Banner -->
    <div v-if="toastMessage" class="ac-toast-banner" :class="toastType">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { GrabbedContact } from '../../types'
import {
  detectActiveGroup,
  grabContactsFromActiveGroup,
  detectAllGroupsInChatList,
  exportContactsToCSV,
  openGroupByTitle,
  type ActiveGroupInfo,
  type DetectedGroupItem
} from '../../utils/groupGrabber'
import {
  getIsPremium,
  getGroupGrabberUsage,
  getGrabbedContacts,
  clearGrabbedContacts,
  getCRMContacts,
  setCRMContacts
} from '../../utils/storage'
import { openPhoneChat } from '../../utils/waAutomation'
import { generateId, delay } from '../../utils/helpers'

const emit = defineEmits<{
  (e: 'navigate-tab', tabId: string): void
  (e: 'fill-broadcast-numbers', numbers: string): void
}>()

const isPremium = ref(false)
const currentUsage = ref(0)
const isGrabbing = ref(false)
const statusMessage = ref('')
const activeGroup = ref<ActiveGroupInfo>({ isGroup: false, groupName: '' })
const scannedGroups = ref<DetectedGroupItem[]>([])
const contacts = ref<GrabbedContact[]>([])
const searchFilter = ref('')
const toastMessage = ref('')
const toastType = ref<'success' | 'warning' | 'error'>('success')

const maxQuota = computed(() => (isPremium.value ? 1000 : 50))
const remainingQuota = computed(() => Math.max(0, maxQuota.value - currentUsage.value))
const usagePercent = computed(() => {
  if (maxQuota.value <= 0) return 100
  return Math.min(100, Math.round((currentUsage.value / maxQuota.value) * 100))
})

const filteredContacts = computed(() => {
  if (!searchFilter.value) return contacts.value
  const q = searchFilter.value.toLowerCase()
  return contacts.value.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.phone.includes(q) ||
    c.groupName.toLowerCase().includes(q)
  )
})

function showToast(msg: string, type: 'success' | 'warning' | 'error' = 'success') {
  toastMessage.value = msg
  toastType.value = type
  setTimeout(() => {
    toastMessage.value = ''
  }, 4500)
}

async function loadData() {
  isPremium.value = await getIsPremium()
  const usage = await getGroupGrabberUsage()
  currentUsage.value = usage.count
  contacts.value = await getGrabbedContacts()
  checkActiveGroup()
}

function checkActiveGroup() {
  activeGroup.value = detectActiveGroup()
}

function scanChatListGroups() {
  scannedGroups.value = detectAllGroupsInChatList()
  if (scannedGroups.value.length === 0) {
    showToast('Tidak ada grup yang terdeteksi di chat list saat ini.', 'warning')
  } else {
    showToast(`${scannedGroups.value.length} grup berhasil dideteksi di chat list.`, 'success')
  }
}

async function selectAndGrabGroup(groupName: string) {
  showToast(`Membuka obrolan grup ${groupName}...`, 'success')
  const ok = await openGroupByTitle(groupName)
  if (ok) {
    await delay(1000)
    checkActiveGroup()
    await startGrab()
  } else {
    showToast(`Gagal membuka grup ${groupName}. Silakan klik manual di WA Web.`, 'error')
  }
}

async function startGrab() {
  if (remainingQuota.value <= 0) {
    showToast(`Batas kuota bulanan (${maxQuota.value} kontak) telah habis. Reset tgl 1 awal bulan.`, 'warning')
    return
  }

  isGrabbing.value = true
  statusMessage.value = 'Mempersiapkan...'

  try {
    const result = await grabContactsFromActiveGroup((msg) => {
      statusMessage.value = msg
    })

    contacts.value = await getGrabbedContacts()
    const usage = await getGroupGrabberUsage()
    currentUsage.value = usage.count

    if (result.addedCount > 0) {
      showToast(`Berhasil mengambil ${result.addedCount} kontak baru dari ${activeGroup.value.groupName}!`, 'success')
    } else if (result.limitReached) {
      showToast('Batas kuota bulanan telah tercapai.', 'warning')
    } else {
      showToast('Semua kontak dari grup ini sudah pernah diambil sebelumnya.', 'warning')
    }
  } catch (err: any) {
    showToast(err.message || 'Gagal mengambil kontak grup.', 'error')
  } finally {
    isGrabbing.value = false
    statusMessage.value = ''
    checkActiveGroup()
  }
}

function exportCSV() {
  if (contacts.value.length === 0) return
  const title = activeGroup.value.groupName ? `kontak_${activeGroup.value.groupName}` : 'semua_kontak_grup'
  exportContactsToCSV(contacts.value, title)
  showToast('File CSV berhasil diunduh.', 'success')
}

function copyAllNumbers() {
  if (contacts.value.length === 0) return
  const text = contacts.value.map(c => c.phone).join('\n')
  navigator.clipboard.writeText(text).then(() => {
    showToast(`${contacts.value.length} nomor berhasil disalin ke clipboard!`, 'success')
  }).catch(() => {
    showToast('Gagal menyalin nomor ke clipboard.', 'error')
  })
}

function sendToBroadcast() {
  if (contacts.value.length === 0) return
  const rawList = contacts.value.map(c => c.phone).join('\n')
  emit('fill-broadcast-numbers', rawList)
  emit('navigate-tab', 'broadcast')
}

async function saveContactsToCRM() {
  if (contacts.value.length === 0) return
  const existingCRM = await getCRMContacts()
  const crmPhones = new Set(existingCRM.map(c => c.phone))
  let added = 0

  for (const gc of contacts.value) {
    if (!crmPhones.has(gc.phone)) {
      existingCRM.unshift({
        id: generateId(),
        name: gc.name,
        phone: gc.phone,
        stage: 'lead',
        source: `Grup: ${gc.groupName}`,
        tags: ['Group Grab'],
        notes: `Diambil dari grup ${gc.groupName} pada ${gc.grabbedAt}`,
        lastUpdated: new Date().toISOString()
      })
      crmPhones.add(gc.phone)
      added++
    }
  }

  await setCRMContacts(existingCRM)
  showToast(`${added} kontak berhasil disimpan ke CRM (Stage Lead)!`, 'success')
}

async function clearAllContacts() {
  if (!confirm('Hapus seluruh riwayat kontak grab ini? (Kuota pemakaian bulanan tidak berkurang)')) return
  await clearGrabbedContacts()
  contacts.value = []
  showToast('Riwayat kontak hasil grab berhasil dibersihkan.', 'success')
}

function openDirectChat(phone: string) {
  openPhoneChat(phone)
}

onMounted(() => {
  loadData()
  const interval = setInterval(checkActiveGroup, 3000)
  return () => clearInterval(interval)
})
</script>

<style scoped>
.ac-quota-track {
  width: 100%;
  height: 8px;
  background: #f1f5f9;
  border-radius: 9999px;
  overflow: hidden;
  margin-top: 4px;
}

.ac-quota-fill {
  height: 100%;
  background: #10b981;
  border-radius: 9999px;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.ac-quota-fill.is-warning {
  background: #f59e0b;
}

.ac-quota-fill.is-full {
  background: #ef4444;
}

.ac-quota-warning {
  padding: 8px 10px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #b91c1c;
  font-size: 0.68rem;
  line-height: 1.4;
}

.ac-active-group-box {
  padding: 10px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
}

.ac-group-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 150px;
  overflow-y: auto;
  margin-top: 6px;
}

.ac-group-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.ac-group-name {
  font-size: 0.72rem;
  font-weight: 500;
  color: #1e293b;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ac-toast-banner {
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 500;
  text-align: center;
  animation: fadeIn 0.2s ease-in;
}

.ac-toast-banner.success {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.ac-toast-banner.warning {
  background: #fffbeb;
  color: #92400e;
  border: 1px solid #fde68a;
}

.ac-toast-banner.error {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
