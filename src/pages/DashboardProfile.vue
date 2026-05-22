<template>
  <div class="page">

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <!-- Perfil privado (no owner + no público) -->
    <div v-else-if="!isOwner && !isPublic" class="private-profile">
      <div class="private-icon">🔒</div>
      <h2>Perfil privado</h2>
      <p>Este usuario tiene su perfil en privado.</p>
      <button class="btn-back" @click="$router.push('/dashboard')">Volver al inicio</button>
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
        :is-owner="isOwner"
        @upload="uploadAvatar"
      />

      <!-- Tabs -->
      <ProfileTabs v-model="activeTab" :tabs="visibleTabs" />

      <!-- Contenido -->
      <Transition name="fade-tab" mode="out-in">

        <ProfilePosts
            v-if="activeTab === 'posts'"
            key="posts"
            :posts="posts"
            :avatar-url="avatarUrl"
            :username="profile.username"
            :hobbies="hobbies"
            :streak="maxStreak"
            :sessions="sessions"
            :submitting="submittingPost"
            :is-owner="isOwner"
            :is-public="isPublic"
            :current-user="currentUser"
            @submit="onSubmitPost"
            @like="onLikePost"
            @delete="onDeletePost"
            @edit="editingPost = $event"
            @comment-count="onCommentCount"
          />

        <ProfileStats
          v-else-if="activeTab === 'stats'"
          key="stats"
          :sessions="sessions"
          :hobbies="hobbies"
          :stats="stats"
        />

        <ProfileSettings
          v-else-if="activeTab === 'settings' && isOwner"
          key="settings"
          :username="editUsername"
          :bio="editBio"
          :email="currentUser?.email"
          :is-public="isPublic"
          :saving-profile="savingProfile"
          :profile-success="profileSuccess"
          :profile-error="profileError"
          :saving-password="savingPassword"
          :password-success="passwordSuccess"
          :password-error="passwordError"
          @save-profile="onSaveProfile"
          @save-password="onSavePassword"
          @toggle-privacy="togglePrivacy"
          @logout="logout"
        />

      </Transition>

      <PostEdit
        v-if="isOwner"
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
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { supabase }        from '../lib/supabase'
import { useProfile }      from '../funciones/useProfile.js'
import ProfileCover        from '../components/profile/ProfileCover.vue'
import ProfileTabs         from '../components/profile/ProfileTabs.vue'
import ProfilePosts        from '../components/profile/ProfilePosts.vue'
import ProfileStats        from '../components/profile/ProfileStats.vue'
import ProfileSettings     from '../components/profile/ProfileSettings.vue'
import PostEdit            from '../components/profile/PostEdit.vue'

const props = defineProps({
  username: { type: String, default: null }
})

const route = useRoute()

const {
  loading, currentUser, profile, avatarUrl, hobbies, stats,
  isOwner, isPublic,
  editUsername, editBio,
  savingProfile, profileSuccess, profileError,
  newPassword, confirmPassword, savingPassword, passwordSuccess, passwordError,
  userLevel, levelName, levelProgress,
  load, uploadAvatar, saveProfile, changePassword, logout,
} = useProfile()

// ── Sesiones (para racha y stats) ────────────────────────────
// hobby_sessions sigue siendo la fuente de sesiones puras
const sessions = ref([])

async function loadSessions(userId = null) {
  const targetId = userId || currentUser.value?.id
  if (!targetId) return
  const { data } = await supabase
    .from('hobby_sessions')
    .select('*')
    .eq('user_id', targetId)
    .order('created_at', { ascending: false })
  if (data) sessions.value = data
}

/* ── Racha por hobby ─────────────────────────────────────── */
function getHobbyStreak(hobbyId) {
  if (!hobbyId || !sessions.value.length) return 0
  const today = new Date(); today.setHours(0,0,0,0)

  const dates = [...new Set(
    sessions.value
      .filter(s => s.hobby_id === hobbyId)
      .map(s => {
        const d = new Date(s.created_at)
        d.setHours(0,0,0,0)
        return d.getTime()
      })
  )].sort((a, b) => b - a).map(t => new Date(t))

  if (!dates.length) return 0

  let streak = 0
  let checkDate = new Date(today)

  for (const sessionDate of dates) {
    const diffDays = Math.round((checkDate - sessionDate) / 86400000)
    if (diffDays <= 1) {
      streak++
      checkDate = new Date(sessionDate)
    } else {
      break
    }
  }
  return streak
}

/* ── Posts — ahora desde la tabla `posts` ────────────────── */
const posts = ref([])
const submittingPost = ref(false)

async function loadPosts(userId = null) {
  const targetId = userId || currentUser.value?.id
  if (!targetId) return

  const { data, error } = await supabase
    .from('posts')
    .select('*, hobbies!fk_posts_hobbies(name, gradient)')
    .eq('user_id', targetId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error cargando posts del perfil:', error)
    return
  }

  if (data) {
    posts.value = data.map(s => ({
      id:          s.id,
      hobby_id:    s.hobby_id,
      hobby_name:  s['hobbies!fk_posts_hobbies']?.name || '',
      hobby_color: s['hobbies!fk_posts_hobbies']?.gradient?.[0] || '#ff6b9d',
      text:        s.note,
      minutes:     s.minutes,
      image_url:   s.image_url || null,
      streak:      getHobbyStreak(s.hobby_id),
      created_at:  s.created_at,
      likes:       0,
      liked:       false,
      likedBy:     [],
      comments:    0,
    }))
  }

  await loadLikesForPosts()
  await loadCommentsCount()
}

/* ── Conteo de comentarios ─────────────────────────────────── */
async function loadCommentsCount() {
  if (!posts.value.length) return
  const postIds = posts.value.map(p => p.id)
  const { data } = await supabase.from('post_comments').select('post_id').in('post_id', postIds)
  if (!data) return
  const countMap = {}
  data.forEach(c => { countMap[c.post_id] = (countMap[c.post_id] || 0) + 1 })
  posts.value.forEach(post => { post.comments = countMap[post.id] || 0 })
}

/* ── Likes persistentes ──────────────────────────────────── */
async function loadLikesForPosts() {
  if (!posts.value.length) return
  const postIds = posts.value.map(p => p.id)

  const { data, error } = await supabase
    .from('post_likes')
    .select('post_id, user_id, profiles!fk_post_likes_profiles(username, avatar_url)')
    .in('post_id', postIds)

  if (error) {
    console.error('Error cargando likes:', error)
    return
  }
  if (!data) return

  const likesMap = {}
  data.forEach(like => {
    if (!likesMap[like.post_id]) likesMap[like.post_id] = []
    likesMap[like.post_id].push({
      userId:   like.user_id,
      username: like['profiles!fk_post_likes_profiles']?.username || 'Usuario',
      avatar:   like['profiles!fk_post_likes_profiles']?.avatar_url,
    })
  })

  posts.value.forEach(post => {
    const postLikes = likesMap[post.id] || []
    post.likes   = postLikes.length
    post.likedBy = postLikes
    post.liked   = postLikes.some(l => l.userId === currentUser.value?.id)
  })
}

async function onLikePost(postId) {
  if (!currentUser.value) return
  const post = posts.value.find(p => p.id === postId)
  if (!post) return

  const isLiking = !post.liked

  // Optimistic UI
  post.liked = isLiking
  post.likes += isLiking ? 1 : -1

  if (isLiking) {
    const { error } = await supabase
      .from('post_likes')
      .insert({ post_id: postId, user_id: currentUser.value.id })
    if (error) {
      post.liked = false
      post.likes--
      console.error('Error dando like:', error)
    }
  } else {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', currentUser.value.id)
    if (error) {
      post.liked = true
      post.likes++
      console.error('Error quitando like:', error)
    }
  }

  await loadLikesForPosts()
}

/* ── +10 puntos por post ─────────────────────────────────── */
async function addActivityPoints(userId, title, points = 10) {
  await supabase.from('activity_log').insert({
    user_id:       userId,
    type:          'post',
    title:         title,
    points:        points,
    activity_date: new Date().toISOString().split('T')[0],
  })
}

/* ── Crear post — INSERT en tabla posts ──────────────────── */
async function onSubmitPost(data) {
  if (!isOwner.value) return

  submittingPost.value = true
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { submittingPost.value = false; return }

  // Subir imagen si hay
  let imageUrl = null
  if (data.imageFile) {
    const ext  = data.imageFile.name.split('.').pop()
    const path = `posts/${user.id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('hobbies')
      .upload(path, data.imageFile, { upsert: true })
    if (!upErr) {
      const { data: urlData } = supabase.storage.from('hobbies').getPublicUrl(path)
      imageUrl = urlData.publicUrl
    }
  }

  // INSERT en posts (ya no en hobby_sessions)
  const { data: newPost, error: insertErr } = await supabase
    .from('posts')
    .insert({
      user_id:  user.id,
      hobby_id: data.hobbyId,
      minutes:  data.minutes || 0,
      note:     data.text || null,
      image_url: imageUrl,
    })
    .select('*, hobbies!fk_posts_hobbies(name, gradient)')
    .single()

  if (insertErr) {
    console.error('Error creando post:', insertErr)
    submittingPost.value = false
    return
  }

  if (newPost) {
    // También registrar sesión en hobby_sessions para stats/racha
    await supabase.from('hobby_sessions').insert({
      user_id:  user.id,
      hobby_id: data.hobbyId,
      minutes:  data.minutes || 0,
      note:     data.text || null,
      done:     true,
    })

    await loadSessions()
    await addActivityPoints(user.id, `Nuevo post: ${data.hobbyName || 'General'}`, 10)

    const hobbyStreak = getHobbyStreak(newPost.hobby_id)

    posts.value.unshift({
      id:          newPost.id,
      hobby_id:    newPost.hobby_id,
      hobby_name:  newPost['hobbies!fk_posts_hobbies']?.name || data.hobbyName || '',
      hobby_color: newPost['hobbies!fk_posts_hobbies']?.gradient?.[0] || data.hobbyColor || '#ff6b9d',
      text:        newPost.note,
      minutes:     newPost.minutes,
      image_url:   imageUrl,
      streak:      hobbyStreak,
      created_at:  newPost.created_at,
      likes:       0,
      liked:       false,
      likedBy:     [],
    })
  }

  submittingPost.value = false
}

/* ── Borrar post ─────────────────────────────────────────── */
async function onDeletePost(id) {
  if (!isOwner.value) return
  const { error } = await supabase.from('posts').delete().eq('id', id)
  if (!error) {
    posts.value = posts.value.filter(p => p.id !== id)
  }
}

/* ── Editar post ─────────────────────────────────────────── */
const editingPost = ref(null)
const savingEdit  = ref(false)

async function onEditPost(data) {
  if (!isOwner.value) return
  savingEdit.value = true

  let imageUrl = undefined // undefined = no tocar, null = quitar

  if (data.removeImage) {
    imageUrl = null
  } else if (data.newImage) {
    const ext  = data.newImage.name.split('.').pop()
    const path = `posts/${currentUser.value.id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('hobbies')
      .upload(path, data.newImage, { upsert: true })
    if (!upErr) {
      const { data: urlData } = supabase.storage.from('hobbies').getPublicUrl(path)
      imageUrl = urlData.publicUrl
    }
  }

  const updateData = {
    hobby_id: data.hobbyId,
    note:     data.text,
    minutes:  data.minutes,
  }
  if (imageUrl !== undefined) updateData.image_url = imageUrl

  const { error } = await supabase
    .from('posts')
    .update(updateData)
    .eq('id', data.id)

  if (!error) {
    const idx = posts.value.findIndex(p => p.id === data.id)
    if (idx !== -1) {
      posts.value[idx].text        = data.text
      posts.value[idx].hobby_id    = data.hobbyId
      posts.value[idx].hobby_name  = data.hobbyName
      posts.value[idx].hobby_color = data.hobbyColor
      posts.value[idx].minutes     = data.minutes
      posts.value[idx].streak      = getHobbyStreak(data.hobbyId)
      if (imageUrl !== undefined) posts.value[idx].image_url = imageUrl
    }
  }

  editingPost.value = null
  savingEdit.value  = false
}

/* ── Comentarios: actualizar conteo desde PostCard ─────── */
function onCommentCount({ postId, delta }) {
  const post = posts.value.find(p => p.id === postId)
  if (post) post.comments = Math.max(0, (post.comments || 0) + delta)
}

/* ── Tabs ────────────────────────────────────────────────── */
const activeTab = ref('posts')

const tabs = computed(() => [
  { key: 'posts',    label: 'Posts',        icon: '◈' },
  { key: 'stats',    label: 'Estadísticas', icon: '◉' },
  { key: 'settings', label: 'Ajustes',      icon: '◌' },
])

const visibleTabs = computed(() => {
  if (isOwner.value) return tabs.value
  return tabs.value.filter(t => t.key !== 'settings')
})

const maxStreak = computed(() => {
  if (!sessions.value.length) return 0
  const dates = [...new Set(
    sessions.value.map(s => new Date(s.created_at).toDateString())
  )].map(d => new Date(d)).sort((a, b) => b - a)
  let streak = 0, cur = new Date(); cur.setHours(0,0,0,0)
  for (const d of dates) {
    if (Math.round((cur - d) / 86400000) <= 1) { streak++; cur = d } else break
  }
  return streak
})

/* ── Privacidad ──────────────────────────────────────────── */
async function togglePrivacy() {
  if (!isOwner.value) return
  const newValue = !isPublic.value
  const { error } = await supabase
    .from('profiles')
    .update({ is_public: newValue })
    .eq('id', currentUser.value.id)
  if (!error) {
    profile.value.is_public = newValue
  }
}

/* ── Handlers ajustes ────────────────────────────────────── */
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

/* ── Init ────────────────────────────────────────────────── */
async function init() {
  await load(props.username)
  const userId = profile.value?.id || currentUser.value?.id
  if (userId && (isOwner.value || isPublic.value)) {
    await Promise.all([loadSessions(userId), loadPosts(userId)])
  }
}

onMounted(init)

watch(() => props.username, () => {
  init()
})
</script>

<style scoped>
/* ── MOBILE (default) ───────────────────── */
.page {
  width: 100%;
  margin: 0 auto;
  padding: 0 0 60px;
}

/* ── DESKTOP (solo expandir, nada más) ───── */
@media (min-width: 768px) {
  .page {
    max-width: 720px;
    padding: 0 20px 60px;
  }
}

@media (min-width: 1024px) {
  .page {
    max-width: 1000px;
    padding: 0 40px 60px;
  }
}

@media (min-width: 1400px) {
  .page {
    max-width: 1200px;
    padding: 0 60px 60px;
  }
}

@media (max-width: 480px) {
  .page { padding-bottom: 90px; }
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

/* Perfil privado */
.private-profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
  text-align: center;
  padding: 40px 20px;
}

.private-icon {
  font-size: 64px;
  opacity: 0.5;
}

.private-profile h2 {
  font-size: 22px;
  font-weight: 800;
  color: #22284E;
  margin: 0;
}

.private-profile p {
  font-size: 14px;
  color: rgba(34,40,78,.5);
  margin: 0;
}

.btn-back {
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 8px;
}
</style>