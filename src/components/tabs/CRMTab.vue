<template>
  <div class="ac-crm">
    <!-- Header Section -->
    <div class="ac-section-header">
      <h2 class="ac-section-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        CRM Kontak
      </h2>
      <div style="display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
        <button class="ac-btn secondary sm" @click="openInboxImportModal">
          💬 Ambil dari Inbox
        </button>
        <button class="ac-btn secondary sm" @click="showStageModal = true">
          🏷️ Kelola Stage
        </button>
        <button class="ac-btn primary sm" @click="openAddModal">+ Kontak Baru</button>
      </div>
    </div>

    <!-- Filter & Search Card -->
    <div class="ac-card">
      <input
        v-model="searchQuery"
        type="text"
        class="ac-input"
        placeholder="Cari nama, nomor HP, atau tag..."
      />

      <div class="ac-grid-2" style="margin-top: 6px;">
        <select v-model="stageFilter" class="ac-select">
          <option value="all">Semua Stage (Pipeline)</option>
          <option v-for="st in stages" :key="st.id" :value="st.id">
            {{ st.name }} ({{ getStageContactCount(st.id) }})
          </option>
        </select>
        <div class="ac-grid-2">
          <button class="ac-btn secondary sm" @click="exportContacts">Export</button>
          <label class="ac-btn secondary sm" style="cursor: pointer;">
            Import
            <input type="file" accept=".csv" style="display: none;" @change="importCSV" />
          </label>
        </div>
      </div>
    </div>

    <!-- Add/Edit Contact Modal/Form -->
    <div v-if="showModal" class="ac-card">
      <h3 class="ac-label">{{ editingId ? 'Edit Kontak CRM' : 'Tambah Kontak Baru' }}</h3>
      <div class="ac-form-group">
        <label class="ac-label">Nama Kontak</label>
        <input v-model="form.name" class="ac-input" placeholder="Nama Lengkap" />
      </div>
      <div class="ac-form-group">
        <label class="ac-label">Nomor WhatsApp</label>
        <input v-model="form.phone" class="ac-input" placeholder="contoh: 628123456789" />
      </div>
      <div class="ac-grid-2">
        <div class="ac-form-group">
          <label class="ac-label">Stage CRM</label>
          <select v-model="form.stage" class="ac-select">
            <option v-for="st in stages" :key="st.id" :value="st.id">{{ st.name }}</option>
          </select>
        </div>
        <div class="ac-form-group">
          <label class="ac-label">Sumber Lead</label>
          <input v-model="form.source" class="ac-input" placeholder="contoh: Ads, IG, Referral" />
        </div>
      </div>
      <div class="ac-form-group">
        <label class="ac-label">Tag Smart Lead (PRO)</label>
        <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 6px;">
          <button
            v-for="t in tagPresets"
            :key="t"
            type="button"
            class="ac-cat-pill"
            style="padding: 2px 6px; font-size: 0.68rem;"
            @click="togglePresetTag(t)"
          >
            {{ t }}
          </button>
        </div>
        <input v-model="form.tags" class="ac-input" placeholder="contoh: 🔥 Hot Lead, 💰 Sudah Membeli" />
      </div>
      <div class="ac-form-group">
        <label class="ac-label">Catatan Tambahan</label>
        <textarea v-model="form.notes" class="ac-textarea" placeholder="Tuliskan detail khusus kontak..."></textarea>
      </div>
      <div class="ac-grid-2">
        <button class="ac-btn primary sm" :disabled="!form.name || !form.phone" @click="saveContact">
          Simpan Kontak
        </button>
        <button class="ac-btn secondary sm" @click="closeModal">
          Batal
        </button>
      </div>
    </div>

    <!-- Contact List Table -->
    <div class="ac-card">
      <div v-if="filteredContacts.length === 0" class="ac-empty-state">
        Belum ada kontak dalam CRM. Klik <strong>+ Kontak Baru</strong> atau <strong>💬 Ambil dari Inbox</strong>.
      </div>
      <table v-else class="ac-table">
        <thead>
          <tr>
            <th>Kontak</th>
            <th>Stage</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in filteredContacts" :key="c.id">
            <td>
              <div class="ac-contact-cell">
                <span class="ac-contact-name">{{ c.name }}</span>
                <span class="ac-contact-phone ac-code-font">{{ c.phone }}</span>
                <div v-if="c.tags && c.tags.length > 0" style="display: flex; gap: 3px; flex-wrap: wrap; margin-top: 3px;">
                  <span v-for="tag in c.tags" :key="tag" class="ac-badge" style="font-size: 0.62rem; padding: 1px 5px; background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0;">
                    {{ tag }}
                  </span>
                </div>
              </div>
            </td>
            <td>
              <span
                class="ac-badge"
                :style="{
                  backgroundColor: `${getStageColor(c.stage)}18`,
                  color: getStageColor(c.stage),
                  border: `1px solid ${getStageColor(c.stage)}33`,
                  fontWeight: '600'
                }"
              >
                {{ getStageName(c.stage) }}
              </span>
            </td>
            <td>
              <div class="ac-contact-actions">
                <button class="ac-btn secondary sm" title="Chat WA" @click="openChat(c.phone)">💬</button>
                <button class="ac-btn secondary sm" title="Edit" @click="editContact(c)">✏️</button>
                <button class="ac-btn danger sm" title="Hapus" @click="deleteContact(c.id)">✕</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal: Kelola Stage / Kategori CRM -->
    <div v-if="showStageModal" class="ac-modal-overlay" @click.self="showStageModal = false">
      <div class="ac-modal-content" style="max-width: 420px; display: flex; flex-direction: column; max-height: 85vh;">
        <div class="ac-section-header" style="margin-bottom: 8px; flex-shrink: 0;">
          <h3 class="ac-label" style="font-size: 0.92rem; display: flex; align-items: center; gap: 6px; margin: 0; color: #0f172a;">
            🏷️ Kelola Stage & Kategori CRM
          </h3>
          <button class="ac-btn secondary sm" style="padding: 2px 8px;" @click="showStageModal = false">✕ Tutup</button>
        </div>

        <p class="ac-subtext" style="margin-bottom: 10px; flex-shrink: 0;">
          Tambah, ubah nama, pilih warna, atau hapus kategori funnel CRM sesuai alur bisnis Anda.
        </p>

        <!-- Stage List -->
        <div style="flex: 1; overflow-y: auto; max-height: 260px; display: flex; flex-direction: column; gap: 6px; padding: 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
          <div
            v-for="st in stages"
            :key="st.id"
            class="ac-stage-item"
          >
            <!-- Normal View Mode -->
            <div v-if="editingStageId !== st.id" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span
                  class="ac-stage-dot"
                  :style="{ backgroundColor: st.color || '#2563eb' }"
                ></span>
                <div>
                  <strong style="font-size: 0.78rem; color: #0f172a;">{{ st.name }}</strong>
                  <span class="ac-subtext" style="font-size: 0.68rem; margin-left: 6px;">
                    ({{ getStageContactCount(st.id) }} kontak)
                  </span>
                </div>
              </div>
              <div style="display: flex; gap: 4px;">
                <button
                  type="button"
                  class="ac-btn secondary sm"
                  style="padding: 2px 6px; font-size: 0.68rem;"
                  title="Edit Nama Stage"
                  @click="startEditStage(st)"
                >
                  ✏️ Edit
                </button>
                <button
                  type="button"
                  class="ac-btn danger sm"
                  style="padding: 2px 6px; font-size: 0.68rem;"
                  title="Hapus Stage"
                  @click="deleteStage(st.id)"
                >
                  🗑️
                </button>
              </div>
            </div>

            <!-- Inline Edit Mode -->
            <div v-else style="display: flex; flex-direction: column; gap: 6px; width: 100%;">
              <div style="display: flex; gap: 6px;">
                <input
                  v-model="stageForm.name"
                  type="text"
                  class="ac-input"
                  style="font-size: 0.74rem; padding: 4px 8px;"
                  placeholder="Nama Stage..."
                />
                <button type="button" class="ac-btn primary sm" style="padding: 2px 8px;" @click="saveEditStage">
                  Simpan
                </button>
                <button type="button" class="ac-btn secondary sm" style="padding: 2px 6px;" @click="editingStageId = null">
                  Batal
                </button>
              </div>
              <div style="display: flex; gap: 4px; align-items: center;">
                <span class="ac-subtext" style="font-size: 0.66rem;">Warna:</span>
                <span
                  v-for="col in colorPalette"
                  :key="col"
                  class="ac-color-swatch"
                  :style="{ backgroundColor: col, outline: stageForm.color === col ? '2px solid #0f172a' : 'none' }"
                  @click="stageForm.color = col"
                ></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Add New Stage Form -->
        <div style="margin-top: 10px; padding: 8px 10px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
          <span class="ac-label" style="font-size: 0.74rem; margin-bottom: 6px; display: block;">+ Tambah Stage Baru</span>
          <div style="display: flex; gap: 6px; margin-bottom: 6px;">
            <input
              v-model="newStageForm.name"
              type="text"
              class="ac-input"
              style="font-size: 0.75rem; flex: 1;"
              placeholder="Contoh: Follow Up 3 Hari, Reseller, dll..."
            />
            <button
              type="button"
              class="ac-btn primary sm"
              :disabled="!newStageForm.name.trim()"
              @click="addStage"
            >
              + Tambah
            </button>
          </div>
          <div style="display: flex; gap: 4px; align-items: center;">
            <span class="ac-subtext" style="font-size: 0.66rem;">Pilih Warna:</span>
            <span
              v-for="col in colorPalette"
              :key="col"
              class="ac-color-swatch"
              :style="{ backgroundColor: col, outline: newStageForm.color === col ? '2px solid #0f172a' : 'none' }"
              @click="newStageForm.color = col"
            ></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Impor Kontak dari Inbox / Chat ke CRM -->
    <div v-if="showInboxImportModal" class="ac-modal-overlay" @click.self="showInboxImportModal = false">
      <div class="ac-modal-content" style="max-width: 440px; display: flex; flex-direction: column; max-height: 85vh;">
        <div class="ac-section-header" style="margin-bottom: 8px; flex-shrink: 0;">
          <h3 class="ac-label" style="font-size: 0.92rem; display: flex; align-items: center; gap: 6px; margin: 0; color: #0f172a;">
            💬 Ambil Kontak dari Inbox & Chat
          </h3>
          <button class="ac-btn secondary sm" style="padding: 2px 8px;" @click="showInboxImportModal = false">✕ Tutup</button>
        </div>

        <p class="ac-subtext" style="margin-bottom: 8px; flex-shrink: 0;">
          Pilih kontak dari obrolan WhatsApp Web untuk otomatis dimasukkan ke dalam database CRM.
        </p>

        <!-- Search & Rescan -->
        <div style="display: flex; gap: 6px; margin-bottom: 8px; flex-shrink: 0;">
          <input
            v-model="inboxSearchQuery"
            type="text"
            class="ac-input"
            style="flex: 1;"
            placeholder="Cari nama atau nomor kontak..."
          />
          <button
            type="button"
            class="ac-btn secondary sm"
            style="white-space: nowrap; padding: 0 10px;"
            :disabled="isScanningInbox"
            @click="scanInboxForCRM"
          >
            {{ isScanningInbox ? '⏳ Memindai...' : '🔄 Pindai Ulang' }}
          </button>
        </div>

        <!-- Target Stage Selector Bar -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; flex-shrink: 0; gap: 8px;">
          <span class="ac-label" style="font-size: 0.72rem; margin: 0; white-space: nowrap;">Masukkan ke Stage:</span>
          <select v-model="targetImportStage" class="ac-select" style="font-size: 0.74rem; padding: 2px 6px;">
            <option v-for="st in stages" :key="st.id" :value="st.id">
              {{ st.name }}
            </option>
          </select>
        </div>

        <!-- Selection Controls -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; flex-shrink: 0;">
          <span class="ac-subtext" style="font-size: 0.7rem; font-weight: 600; color: #0f172a;">
            Total: {{ filteredInboxCandidates.length }} kontak | Terpilih: {{ selectedInboxContactIds.size }}
          </span>
          <div style="display: flex; gap: 4px;">
            <button
              type="button"
              class="ac-btn secondary sm"
              style="padding: 2px 8px; font-size: 0.66rem;"
              @click="selectAllInboxCandidates"
            >
              Pilih Semua
            </button>
            <button
              type="button"
              class="ac-btn secondary sm"
              style="padding: 2px 8px; font-size: 0.66rem;"
              @click="deselectAllInboxCandidates"
            >
              Hapus Pilihan
            </button>
          </div>
        </div>

        <!-- Contact List -->
        <div style="flex: 1; overflow-y: auto; max-height: 260px; display: flex; flex-direction: column; gap: 4px; padding: 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
          <div v-if="isScanningInbox" style="text-align: center; padding: 24px 8px; color: #64748b; font-size: 0.78rem;">
            ⏳ Sedang memindai obrolan WhatsApp Web...
          </div>
          <div v-else-if="filteredInboxCandidates.length === 0" style="text-align: center; padding: 24px 8px; color: #94a3b8; font-size: 0.78rem;">
            Tidak ada kontak ditemukan dari obrolan WhatsApp Web.
          </div>
          <div
            v-else
            v-for="c in filteredInboxCandidates"
            :key="c.id"
            class="ac-import-candidate-row"
            :class="{ selected: selectedInboxContactIds.has(c.id) }"
            @click="toggleSelectInboxContact(c)"
          >
            <input
              type="checkbox"
              :checked="selectedInboxContactIds.has(c.id)"
              style="cursor: pointer; margin-right: 6px;"
              @click.stop="toggleSelectInboxContact(c)"
            />
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                <span style="font-size: 0.78rem; font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  {{ c.name || 'Kontak WhatsApp' }}
                </span>
                <span
                  v-if="isContactAlreadyInCRM(c.phone)"
                  class="ac-badge active"
                  style="font-size: 0.62rem; padding: 1px 5px;"
                >
                  Di CRM: {{ getExistingCRMContactStage(c.phone) }}
                </span>
                <span
                  v-else
                  class="ac-badge hauling"
                  style="font-size: 0.62rem; padding: 1px 5px;"
                >
                  BARU
                </span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-top: 2px;">
                <span class="ac-code-font" style="font-size: 0.7rem; color: #2563eb;">
                  {{ c.phone }}
                </span>
                <span v-if="c.lastMessage" style="font-size: 0.65rem; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">
                  {{ c.lastMessage }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; flex-shrink: 0;">
          <button type="button" class="ac-btn secondary sm" @click="showInboxImportModal = false">
            Batal
          </button>
          <button
            type="button"
            class="ac-btn primary sm"
            :disabled="selectedInboxContactIds.size === 0"
            @click="importSelectedToCRM"
          >
            ✓ Simpan {{ selectedInboxContactIds.size }} Kontak ke CRM
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { CRMContact, CRMStage, InboxContactItem } from '../../types'
import {
  getCRMContacts,
  setCRMContacts,
  getCRMStages,
  setCRMStages,
  DEFAULT_CRM_STAGES
} from '../../utils/storage'
import { downloadCSV, parseCSV, formatDate, formatPhoneNumber } from '../../utils/helpers'
import { openPhoneChat } from '../../utils/waAutomation'
import { scanInboxChatsAndContacts } from '../../utils/inboxContacts'

const contacts = ref<CRMContact[]>([])
const stages = ref<CRMStage[]>([])
const searchQuery = ref('')
const stageFilter = ref('all')
const showModal = ref(false)
const editingId = ref<string | null>(null)

// Stage management state
const showStageModal = ref(false)
const editingStageId = ref<string | null>(null)
const stageForm = ref({ name: '', color: '#3b82f6' })
const newStageForm = ref({ name: '', color: '#3b82f6' })

const colorPalette = [
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#eab308', // Yellow
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#f97316', // Orange
  '#06b6d4', // Cyan
  '#64748b', // Slate
  '#ec4899', // Pink
  '#14b8a6'  // Teal
]

// Inbox contact import state
const showInboxImportModal = ref(false)
const isScanningInbox = ref(false)
const inboxCandidates = ref<InboxContactItem[]>([])
const inboxSearchQuery = ref('')
const selectedInboxContactIds = ref<Set<string>>(new Set())
const targetImportStage = ref('lead')

const tagPresets = [
  '🔥 Hot Lead',
  '🟡 Warm Lead',
  '🔵 New Lead',
  '💰 Sudah Membeli',
  '🔄 Follow Up',
  '❌ Tidak Tertarik',
  '⭐ VIP'
]

function togglePresetTag(tag: string) {
  const currentTags = form.value.tags ? form.value.tags.split(',').map(t => t.trim()).filter(Boolean) : []
  if (currentTags.includes(tag)) {
    form.value.tags = currentTags.filter(t => t !== tag).join(', ')
  } else {
    currentTags.push(tag)
    form.value.tags = currentTags.join(', ')
  }
}

const form = ref({
  name: '',
  phone: '',
  stage: 'lead',
  source: 'Manual',
  tags: '',
  notes: ''
})

const filteredContacts = computed(() => {
  return contacts.value.filter(c => {
    const matchesStage = stageFilter.value === 'all' || c.stage === stageFilter.value
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                          c.phone.includes(searchQuery.value) ||
                          c.notes.toLowerCase().includes(searchQuery.value.toLowerCase())
    return matchesStage && matchesSearch
  })
})

const filteredInboxCandidates = computed(() => {
  let list = inboxCandidates.value
  if (inboxSearchQuery.value.trim()) {
    const q = inboxSearchQuery.value.trim().toLowerCase()
    list = list.filter(c =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      c.phone.includes(q)
    )
  }
  return list
})

function getStageContactCount(stageId: string): number {
  return contacts.value.filter(c => c.stage === stageId).length
}

function getStageColor(stageId: string): string {
  const found = stages.value.find(s => s.id === stageId)
  return found?.color || '#2563eb'
}

function getStageName(stageId: string): string {
  const found = stages.value.find(s => s.id === stageId)
  return found ? found.name : stageId.toUpperCase()
}

async function loadStages() {
  stages.value = await getCRMStages()
}

async function loadContacts() {
  contacts.value = await getCRMContacts()
}

// Stage CRUD
async function addStage() {
  if (!newStageForm.value.name.trim()) return
  const id = newStageForm.value.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString(36).slice(-4)
  const newStage: CRMStage = {
    id,
    name: newStageForm.value.name.trim(),
    color: newStageForm.value.color
  }
  stages.value.push(newStage)
  await setCRMStages(stages.value)
  newStageForm.value = { name: '', color: '#3b82f6' }
}

function startEditStage(st: CRMStage) {
  editingStageId.value = st.id
  stageForm.value = { name: st.name, color: st.color || '#3b82f6' }
}

async function saveEditStage() {
  if (!stageForm.value.name.trim() || !editingStageId.value) return
  const st = stages.value.find(s => s.id === editingStageId.value)
  if (st) {
    st.name = stageForm.value.name.trim()
    st.color = stageForm.value.color
    await setCRMStages(stages.value)
  }
  editingStageId.value = null
}

async function deleteStage(stageId: string) {
  if (stages.value.length <= 1) {
    alert('Minimal harus ada 1 stage dalam CRM.')
    return
  }
  const st = stages.value.find(s => s.id === stageId)
  const count = getStageContactCount(stageId)
  const fallbackStage = stages.value.find(s => s.id !== stageId)
  const confirmMsg = count > 0
    ? `Hapus stage "${st?.name}"? ${count} kontak di stage ini akan otomatis dipindahkan ke stage "${fallbackStage?.name}".`
    : `Hapus stage "${st?.name}"?`

  if (!confirm(confirmMsg)) return

  // Reassign contacts
  const fallbackStageId = fallbackStage?.id || 'lead'
  let contactsModified = false
  for (const c of contacts.value) {
    if (c.stage === stageId) {
      c.stage = fallbackStageId
      contactsModified = true
    }
  }

  stages.value = stages.value.filter(s => s.id !== stageId)
  await setCRMStages(stages.value)

  if (contactsModified) {
    await setCRMContacts(contacts.value)
  }
}

// Inbox Import
async function openInboxImportModal() {
  showInboxImportModal.value = true
  targetImportStage.value = stages.value[0]?.id || 'lead'
  await scanInboxForCRM()
}

async function scanInboxForCRM() {
  isScanningInbox.value = true
  try {
    const list = await scanInboxChatsAndContacts()
    inboxCandidates.value = list
  } catch (e) {
    console.warn('[AMAN CHAT] Gagal memindai kontak inbox:', e)
  } finally {
    isScanningInbox.value = false
  }
}

function isContactAlreadyInCRM(phone: string): boolean {
  return contacts.value.some(c => c.phone === phone)
}

function getExistingCRMContactStage(phone: string): string | null {
  const c = contacts.value.find(item => item.phone === phone)
  return c ? getStageName(c.stage) : null
}

function toggleSelectInboxContact(c: InboxContactItem) {
  const set = new Set(selectedInboxContactIds.value)
  if (set.has(c.id)) {
    set.delete(c.id)
  } else {
    set.add(c.id)
  }
  selectedInboxContactIds.value = set
}

function selectAllInboxCandidates() {
  const set = new Set<string>()
  for (const c of filteredInboxCandidates.value) {
    set.add(c.id)
  }
  selectedInboxContactIds.value = set
}

function deselectAllInboxCandidates() {
  selectedInboxContactIds.value = new Set()
}

async function importSelectedToCRM() {
  const selected = inboxCandidates.value.filter(c => selectedInboxContactIds.value.has(c.id))
  if (selected.length === 0) return

  let addedCount = 0
  let updatedCount = 0

  for (const item of selected) {
    const cleanPhone = item.phone || formatPhoneNumber(item.name)
    const existing = contacts.value.find(c => c.phone === cleanPhone)
    if (existing) {
      existing.stage = targetImportStage.value
      if (!existing.name && item.name) existing.name = item.name
      existing.lastUpdated = formatDate(Date.now())
      updatedCount++
    } else {
      contacts.value.unshift({
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        name: item.name || cleanPhone,
        phone: cleanPhone,
        stage: targetImportStage.value,
        source: item.source === 'inbox' ? 'Inbox WhatsApp' : (item.source === 'grabber' ? 'Group Grabber' : 'Chat WhatsApp'),
        tags: [],
        notes: item.lastMessage || '',
        lastUpdated: formatDate(Date.now())
      })
      addedCount++
    }
  }

  await setCRMContacts(contacts.value)
  showInboxImportModal.value = false
  selectedInboxContactIds.value = new Set()
  alert(`✓ Berhasil menyimpan ke CRM:\n- ${addedCount} kontak baru ditambahkan\n- ${updatedCount} kontak diperbarui ke stage "${getStageName(targetImportStage.value)}"`)
}

// Contact Modal (Add/Edit)
function openAddModal() {
  editingId.value = null
  const defaultStage = stages.value[0]?.id || 'lead'
  form.value = { name: '', phone: '', stage: defaultStage, source: 'Manual', tags: '', notes: '' }
  showModal.value = true
}

function editContact(c: CRMContact) {
  editingId.value = c.id
  form.value = {
    name: c.name,
    phone: c.phone,
    stage: c.stage,
    source: c.source || 'Manual',
    tags: (c.tags || []).join(', '),
    notes: c.notes || ''
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingId.value = null
}

async function saveContact() {
  if (!form.value.name || !form.value.phone) return
  const cleanPhone = form.value.phone.replace(/[^0-9]/g, '')

  if (editingId.value) {
    const item = contacts.value.find(c => c.id === editingId.value)
    if (item) {
      item.name = form.value.name
      item.phone = cleanPhone
      item.stage = form.value.stage
      item.source = form.value.source
      item.tags = form.value.tags.split(',').map(t => t.trim()).filter(Boolean)
      item.notes = form.value.notes
      item.lastUpdated = formatDate(Date.now())
    }
  } else {
    const newContact: CRMContact = {
      id: Date.now().toString(),
      name: form.value.name,
      phone: cleanPhone,
      stage: form.value.stage,
      source: form.value.source,
      tags: form.value.tags.split(',').map(t => t.trim()).filter(Boolean),
      notes: form.value.notes,
      lastUpdated: formatDate(Date.now())
    }
    contacts.value.push(newContact)
  }

  await setCRMContacts(contacts.value)
  closeModal()
}

async function deleteContact(id: string) {
  contacts.value = contacts.value.filter(c => c.id !== id)
  await setCRMContacts(contacts.value)
}

function openChat(phone: string) {
  openPhoneChat(phone)
}

function csvField(value: string): string {
  return `"${(value || '').replace(/"/g, '""')}"`
}

function exportContacts() {
  let csv = 'Name,Phone,Stage,Source,Tags,Notes\n'
  contacts.value.forEach(c => {
    csv += [
      csvField(c.name),
      csvField(c.phone),
      csvField(c.stage),
      csvField(c.source),
      csvField((c.tags || []).join(';')),
      csvField(c.notes)
    ].join(',') + '\n'
  })
  downloadCSV(csv, `crm-contacts-${Date.now()}.csv`)
}

function importCSV(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (evt) => {
    const text = evt.target?.result as string
    if (text) {
      const parsed = parseCSV(text)
      parsed.forEach(p => {
        if (p.name && p.phone) {
          contacts.value.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
            name: p.name,
            phone: p.phone.replace(/[^0-9]/g, ''),
            stage: p.stage ? p.stage.toLowerCase() : (stages.value[0]?.id || 'lead'),
            source: p.source || 'Import CSV',
            tags: p.tags ? p.tags.split(';') : [],
            notes: p.notes || '',
            lastUpdated: formatDate(Date.now())
          })
        }
      })
      await setCRMContacts(contacts.value)
    }
  }
  reader.readAsText(file)
}

function handleStorageChange(changes: Record<string, chrome.storage.StorageChange>, areaName: string) {
  if (areaName === 'local') {
    if (changes.wku_crm_contacts) {
      contacts.value = (changes.wku_crm_contacts.newValue as CRMContact[]) || []
    }
    if (changes.wku_crm_stages) {
      stages.value = (changes.wku_crm_stages.newValue as CRMStage[]) || DEFAULT_CRM_STAGES
    }
  }
}

onMounted(async () => {
  await loadStages()
  await loadContacts()
  chrome.storage.onChanged.addListener(handleStorageChange)
})

onUnmounted(() => {
  chrome.storage.onChanged.removeListener(handleStorageChange)
})
</script>

<style scoped>
.ac-crm {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ac-contact-cell {
  display: flex;
  flex-direction: column;
}
.ac-contact-name {
  font-weight: 600;
  font-size: 0.8rem;
}
.ac-contact-phone {
  font-size: 0.7rem;
  color: #64748b;
}
.ac-contact-actions {
  display: flex;
  gap: 4px;
}
.ac-cat-pill {
  padding: 3px 8px;
  border-radius: 9999px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 0.7rem;
  font-weight: 500;
  cursor: pointer;
  color: #64748b;
  transition: all 0.15s ease;
}
.ac-cat-pill.active {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
}
.ac-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(3px);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
}
.ac-modal-content {
  background: #ffffff;
  border-radius: 12px;
  padding: 14px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.08);
}
.ac-stage-item {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
.ac-stage-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
.ac-color-swatch {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  cursor: pointer;
  display: inline-block;
  transition: transform 0.15s ease;
}
.ac-color-swatch:hover {
  transform: scale(1.15);
}
.ac-import-candidate-row {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.ac-import-candidate-row:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}
.ac-import-candidate-row.selected {
  background: #eff6ff;
  border-color: #93c5fd;
}
</style>
