<template>
  <div class="ac-crm">
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
      <button class="ac-btn primary sm" @click="openAddModal">+ Kontak Baru</button>
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
          <option value="lead">Lead</option>
          <option value="prospect">Prospect</option>
          <option value="customer">Customer</option>
          <option value="churned">Churned</option>
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
            <option value="lead">Lead</option>
            <option value="prospect">Prospect</option>
            <option value="customer">Customer</option>
            <option value="churned">Churned</option>
          </select>
        </div>
        <div class="ac-form-group">
          <label class="ac-label">Sumber Lead</label>
          <input v-model="form.source" class="ac-input" placeholder="contoh: Ads, IG, Referral" />
        </div>
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
        Belum ada kontak dalam CRM.
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
              </div>
            </td>
            <td>
              <span class="ac-badge" :class="getStageClass(c.stage)">
                {{ c.stage.toUpperCase() }}
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { CRMContact } from '../../types'
import { getCRMContacts, setCRMContacts } from '../../utils/storage'
import { downloadCSV, parseCSV, formatDate } from '../../utils/helpers'

const contacts = ref<CRMContact[]>([])
const searchQuery = ref('')
const stageFilter = ref('all')
const showModal = ref(false)
const editingId = ref<string | null>(null)

const form = ref({
  name: '',
  phone: '',
  stage: 'lead' as CRMContact['stage'],
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

async function loadContacts() {
  contacts.value = await getCRMContacts()
}

function getStageClass(stage: CRMContact['stage']) {
  switch (stage) {
    case 'customer': return 'customer'
    case 'prospect': return 'prospect'
    case 'lead': return 'lead'
    case 'churned': return 'churned'
    default: return 'lead'
  }
}

function openAddModal() {
  editingId.value = null
  form.value = { name: '', phone: '', stage: 'lead', source: 'Manual', tags: '', notes: '' }
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
  window.open(`https://web.whatsapp.com/send?phone=${phone}`, '_blank')
}

function exportContacts() {
  let csv = 'Name,Phone,Stage,Source,Tags,Notes\n'
  contacts.value.forEach(c => {
    csv += `"${c.name}","${c.phone}","${c.stage}","${c.source}","${(c.tags || []).join(';')}", "${c.notes}"\n`
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
            stage: (p.stage.toLowerCase() as CRMContact['stage']) || 'lead',
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

onMounted(() => {
  loadContacts()
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
</style>
