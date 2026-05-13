<template>
  <div class="page">

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <template v-else>

      <!-- Cover + avatar + mini stats -->
      <ProfileCover
        :profile="profile"
        :avatar-url="avatarUrl"
        :hobbies="hobbies"
        :user-level="userLevel"
        :level-name="levelName"
        :level-progress="levelProgress"
        :stats="stats"
        @upload="uploadAvatar"
      />

      <!-- Tabs -->
      <ProfileTabs v-model="activeTab" :tabs="tabs" />

      <!-- Contenido -->
      <Transition name="fade-tab" mode="out-in">

        <!-- Posts: Diario de Progreso -->
        <ProfilePosts
          v-if="activeTab === 'posts'"
          key="posts"
          :posts="posts"
          :avatar-url="avatarUrl"
          :username="profile.username"
          :hobbies="hobbies"
          :streak="maxStreak"
          :submitting="submittingPost"
          :is-owner="true"
          @submit="onSubmitPost"
          @like="onLikePost"
          @delete="onDeletePost"
          @edit="editingPost = $event"
        />

        <!-- Estadísticas estilo GitHub -->
        <ProfileStats
          v-else-if="activeTab === 'stats'"
          key="stats"
          :sessions="sessions"
          :hobbies="hobbies"
          :stats="stats"
        />

        <!-- Ajustes -->
        <ProfileSettings
          v-else-if="activeTab === 'settings'"
          key="settings"
          :username="editUsername"
          :bio="editBio"
          :email="currentUser?.email"
          :saving-profile="savingProfile"
          :profile-success="profileSuccess"
          :profile-error="profileError"
          :saving-password="savingPassword"
          :password-success="passwordSuccess"
          :password-error="passwordError"
          @save-profile="onSaveProfile"
          @save-password="onSavePassword"
          @logout="logout"
        />

      </Transition>

      <PostEdit
        :show="!!editingPost"
        :post="editingPost"
        :hobbies="hobbies"
        :saving="savingEdit"
        @close="editingPost = null"
        @save="onEditPost"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase }        from '../lib/supabase'
import { useProfile }      from '../funciones/useProfile.js'
import ProfileCover        from '../components/profile/Profilecover.vue'
import ProfileTabs         from '../components/profile/Profiletabs.vue'
import ProfilePosts        from '../components/profile/ProfilePosts.vue'
import ProfileStats        from '../components/profile/Profilestats.vue'
import ProfileSettings     from '../components/profile/ProfileSettings.vue'
import PostEdit           from '../components/profile/PostEdit.vue'

/* ── Composable ─────────────────────────── */
const {
  loading, currentUser, profile, avatarUrl, hobbies, stats,
  editUsername, editBio,
  savingProfile, profileSuccess, profileError,
  newPassword, confirmPassword, savingPassword, passwordSuccess, passwordError,
  userLevel, levelName, levelProgress,
  load, uploadAvatar, saveProfile, changePassword, logout,
} = useProfile()

/* ── Sessions (necesarias para stats y posts) */
const sessions = ref([])

async function loadSessions() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data } = await supabase
    .from('hobby_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (data) sessions.value = data
}

/* ── Posts ──────────────────────────────── */
const posts          = ref([])
const submittingPost = ref(false)

async function loadPosts() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  // Usamos sesiones con nota como posts
  const { data } = await supabase
    .from('hobby_sessions')
    .select('*, hobbies(name, gradient)')
    .eq('user_id', user.id)
    .eq('is_post', true)
    .order('created_at', { ascending: false })

  if (data) {
    posts.value = data.map(s => ({
      id:          s.id,
      hobby_id:    s.hobby_id,
      hobby_name:  s.hobbies?.name || '',
      hobby_color: s.hobbies?.gradient?.[0] || '#ff6b9d',
      text:        s.note,
      minutes:     s.minutes,
      image_url:   s.image_url || null,
      streak:      0,
      created_at:  s.created_at,
      likes:       0,
      liked:       false,
    }))
  }
}

async function onSubmitPost(data) {
  submittingPost.value = true
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { submittingPost.value = false; return }

  let imageUrl = null

  // Subir imagen si existe
  if (data.imageFile) {
    const ext  = data.imageFile.name.split('.').pop()
    const path = `posts/${user.id}/${Date.now()}.${ext}`
    const { data: upData, error: upErr } = await supabase.storage
      .from('hobbies')
      .upload(path, data.imageFile, { upsert: true })
    if (!upErr) {
      const { data: urlData } = supabase.storage.from('hobbies').getPublicUrl(path)
      imageUrl = urlData.publicUrl
    }
  }

  // Guardar sesión con nota e imagen
  const { data: sess } = await supabase
    .from('hobby_sessions')
    .insert({
      user_id:   user.id,
      hobby_id:  data.hobbyId,
      minutes:   data.minutes || 0,
      note:      data.text || null,
      image_url: imageUrl,
      is_post:   true,
    })
    .select('*, hobbies(name, gradient)')

  if (sess?.[0]) {
    const s = sess[0]
    posts.value.unshift({
      id:          s.id,
      hobby_id:    s.hobby_id,
      hobby_name:  s.hobbies?.name || data.hobbyName,
      hobby_color: s.hobbies?.gradient?.[0] || data.hobbyColor,
      text:        s.note,
      minutes:     s.minutes,
      image_url:   imageUrl,
      streak:      0,
      created_at:  s.created_at,
      likes:       0,
      liked:       false,
      streak: maxStreak.value,
    })
    sessions.value.unshift(s)
  }

  submittingPost.value = false
}

function onLikePost(id) {
  const post = posts.value.find(p => p.id === id)
  if (!post) return
  post.liked = !post.liked
  post.likes = (post.likes || 0) + (post.liked ? 1 : -1)
}

async function onDeletePost(id) {
  await supabase.from('hobby_sessions').delete().eq('id', id)
  posts.value    = posts.value.filter(p => p.id !== id)
  sessions.value = sessions.value.filter(s => s.id !== id)
}

const editingPost = ref(null)
const savingEdit  = ref(false)

// 3. Handler
async function onEditPost(data) {
  savingEdit.value = true
  await supabase.from('hobby_sessions').update({
    hobby_id: data.hobbyId,
    note:     data.text,
    minutes:  data.minutes,
  }).eq('id', data.id)

  const idx = posts.value.findIndex(p => p.id === data.id)
  if (idx !== -1) {
    posts.value[idx].text       = data.text
    posts.value[idx].hobby_id   = data.hobbyId
    posts.value[idx].hobby_name = data.hobbyName
    posts.value[idx].minutes    = data.minutes
  }
  editingPost.value = null
  savingEdit.value  = false
}

/* ── Tabs ───────────────────────────────── */
const activeTab = ref('posts')

const tabs = computed(() => [
  { key: 'posts',    label: 'Posts',        icon: '◈' },
  { key: 'stats',    label: 'Estadísticas', icon: '◉' },
  { key: 'settings', label: 'Ajustes',      icon: '◌' },
])

/* ── Racha máxima (para PostCreate) ─────── */
const maxStreak = computed(() => {
  if (!sessions.value.length) return 0
  const dates = [...new Set(
    sessions.value.map(s => new Date(s.created_at).toDateString())
  )].map(d => new Date(d)).sort((a,b) => b - a)
  let streak = 0, cur = new Date(); cur.setHours(0,0,0,0)
  for (const d of dates) {
    if (Math.round((cur - d) / 86400000) <= 1) { streak++; cur = d } else break
  }
  return streak
})

/* ── Handlers ajustes ───────────────────── */
function onSaveProfile({ username, bio }) {
  editUsername.value = username
  editBio.value      = bio
  saveProfile()
}

function onSavePassword({ password, confirm }) {
  newPassword.value     = password
  confirmPassword.value = confirm
  changePassword()
}

/* ── Init ───────────────────────────────── */
onMounted(async () => {
  await load()
  await Promise.all([loadSessions(), loadPosts()])
})
</script>

<style scoped>
.page {
  max-width: 680px;
  margin: 0 auto;
  padding-bottom: 60px;
}

.loading-state {
  display: flex; align-items: center; justify-content: center;
  height: 50vh;
}
.spinner {
  width: 40px; height: 40px; border-radius: 50%;
  border: 3px solid rgba(34,40,78,.08);
  border-top-color: #ff6b9d;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.fade-tab-enter-active,
.fade-tab-leave-active { transition: opacity .2s ease, transform .2s ease; }
.fade-tab-enter-from   { opacity: 0; transform: translateY(8px); }
.fade-tab-leave-to     { opacity: 0; transform: translateY(-6px); }

@media (max-width: 480px) {
  .page { padding-bottom: 90px; }
}
</style>