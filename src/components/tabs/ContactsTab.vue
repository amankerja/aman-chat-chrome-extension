<template>
  <div class="ac-contacts">
    <div class="ac-section-header">
      <h2 class="ac-section-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
        Daftar Kontak & Quick Chat
      </h2>
      <button class="ac-btn primary sm" @click="showAddDirect = true">+ Kirim Baru</button>
    </div>

    <!-- Quick Direct Chat Modal/Card -->
    <div v-if="showAddDirect" class="ac-card">
      <h3 class="ac-label">Mulai Chat WA Baru</h3>
      <div class="ac-form-group">
        <input
          v-model="quickPhone"
          type="text"
          class="ac-input"
          placeholder="Nomor HP (contoh: 628123456789 atau 08123456789)"
        />
      </div>
      <div class="ac-grid-2">
        <button class="ac-btn primary sm" :disabled="!quickPhone" @click="startDirectChat">
          Buka Chat WA
        </button>
        <button class="ac-btn secondary sm" @click="showAddDirect = false">
          Batal
        </button>
      </div>
    </div>

    <!-- Search & Filter Card -->
    <div class="ac-card">
      <input
        v-model="searchQuery"
        type="text"
        class="ac-input"
        placeholder="Cari nama atau nomor kontak CRM..."
      />
    </div>

    <!-- Contacts Table -->
    <div class="ac-card">
      <div v-if="filteredContacts.length === 0" class="ac-empty-state">
        Tidak ada kontak ditemukan. Tambahkan kontak di tab CRM.
      </div>
      <table v-else class="ac-table">
        <thead>
          <tr>
            <th>Kontak</th>
            <th>Tag</th>
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
              <span class="ac-badge lead" style="font-size: 0.65rem;">
                {{ c.stage.toUpperCase() }}
              </span>
            </td>
            <td>
              <button class="ac-btn primary sm" style="padding: 4px 8px;" title="Buka Chat WA" @click="openChat(c.phone)">
                💬 Chat
              </button>
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
import { getCRMContacts } from '../../utils/storage'
import { openPhoneChat } from '../../utils/waAutomation'
import { formatPhoneNumber } from '../../utils/helpers'

const contacts = ref<CRMContact[]>([])
const searchQuery = ref('')
const showAddDirect = ref(false)
const quickPhone = ref('')

const filteredContacts = computed(() => {
  return contacts.value.filter(c =>
    c.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    c.phone.includes(searchQuery.value)
  )
})

async function loadContacts() {
  contacts.value = await getCRMContacts()
}

function openChat(phone: string) {
  openPhoneChat(phone)
}

function startDirectChat() {
  if (!quickPhone.value) return
  const clean = formatPhoneNumber(quickPhone.value)
  openPhoneChat(clean)
  quickPhone.value = ''
  showAddDirect.value = false
}

onMounted(() => {
  loadContacts()
})
</script>

<style scoped>
.ac-contacts {
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
</style>
