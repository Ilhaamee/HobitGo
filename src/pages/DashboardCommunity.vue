<template>
  <div class="dashboard-community">
    <div class="page-header">
      <div>
        <h1>🌍 Comunidad</h1>
        <p class="subtitle">Comparte tu progreso y motiva a otros</p>
      </div>
      <button class="btn-primary" @click="showPostForm = !showPostForm">
        <font-awesome-icon icon="plus" /> Nueva publicación
      </button>
    </div>

    <!-- Formulario nueva publicación -->
    <div v-if="showPostForm" class="post-form-card">
      <div class="post-form-header">
        <div class="avatar-mini">
          <img v-if="myAvatar" :src="myAvatar" />
          <div v-else class="avatar-placeholder-mini">{{ myUsername[0]?.toUpperCase() }}</div>
        </div>
        <span class="my-name">{{ myUsername }}</span>
      </div>
      <textarea
        v-model="newPostContent"
        class="post-textarea"
        placeholder="¿Qué has conseguido hoy? Comparte tu progreso con la comunidad... 💪"
        rows="3"
      ></textarea>

      <!-- Selector de hobbie/reto -->
      <div class="post-tags">
        <select v-model="postTag" class="tag-select">
          <option value="">Sin etiqueta</option>
          <optgroup label="Mis hobbies">
            <option v-for="h in myHobbies" :key="h.id" :value="'hobby:' + h.name">🎯 {{ h.name }}</option>
          </optgroup>
          <optgroup label="Mis retos">
            <option v-for="g in myGoals" :key="g.id" :value="'reto:' + g.title">🏆 {{ g.title }}</option>
          </optgroup>
        </select>
      </div>

      <div class="post-form-actions">
        <button class="btn-cancel" @click="showPostForm = false">Cancelar</button>
        <button class="btn-primary" @click="submitPost" :disabled="posting || !newPostContent.trim()">
          {{ posting ? 'Publicando...' : 'Publicar' }}
        </button>
      </div>
    </div>

    <!-- Feed -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando publicaciones...</p>
    </div>

    <div v-else-if="posts.length === 0" class="empty-feed">
      <div class="empty-icon">🌱</div>
      <h3>¡Sé el primero en compartir!</h3>
      <p>La comunidad está esperando tu primer post de progreso</p>
    </div>

    <div v-else class="feed">
      <div v-for="post in posts" :key="post.id" class="post-card">
        <div class="post-header">
          <div class="post-avatar">
            <img v-if="post.profiles?.avatar_url" :src="post.profiles.avatar_url" />
            <div v-else class="avatar-placeholder">{{ post.profiles?.username?.[0]?.toUpperCase() || '?' }}</div>
          </div>
          <div class="post-meta">
            <span class="post-username">{{ post.profiles?.username || 'Usuario' }}</span>
            <span class="post-time">{{ timeAgo(post.created_at) }}</span>
          </div>
          <div v-if="post.tag" class="post-tag" :class="post.tag.startsWith('hobby') ? 'tag-hobby' : 'tag-reto'">
            {{ post.tag.startsWith('hobby') ? '🎯' : '🏆' }} {{ post.tag.split(':')[1] }}
          </div>
          <button v-if="post.user_id === myUserId" class="delete-post-btn" @click="deletePost(post.id)">
            <font-awesome-icon icon="trash" />
          </button>
        </div>

        <div class="post-content">{{ post.content }}</div>

        <div class="post-actions">
          <button class="action-btn" :class="{ liked: post.liked_by_me }" @click="toggleLike(post)">
            <font-awesome-icon :icon="post.liked_by_me ? 'heart' : ['far', 'heart']" />
            <span>{{ post.likes_count || 0 }}</span>
          </button>
          <button class="action-btn" @click="toggleComments(post)">
            <font-awesome-icon icon="comment" />
            <span>{{ post.comments_count || 0 }}</span>
          </button>
        </div>

        <!-- Comentarios -->
        <div v-if="post.showComments" class="comments-section">
          <div v-if="post.comments?.length > 0" class="comments-list">
            <div v-for="c in post.comments" :key="c.id" class="comment-item">
              <div class="comment-avatar">
                <img v-if="c.profiles?.avatar_url" :src="c.profiles.avatar_url" />
                <div v-else class="avatar-placeholder-xs">{{ c.profiles?.username?.[0]?.toUpperCase() }}</div>
              </div>
              <div class="comment-body">
                <span class="comment-user">{{ c.profiles?.username }}</span>
                <p class="comment-text">{{ c.content }}</p>
              </div>
            </div>
          </div>
          <div class="comment-form">
            <input
              v-model="post.newComment"
              class="comment-input"
              placeholder="Escribe un comentario..."
              @keydown.enter="submitComment(post)"
            />
            <button class="btn-send" @click="submitComment(post)" :disabled="!post.newComment?.trim()">
              <font-awesome-icon icon="paper-plane" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const posts = ref([])
const loading = ref(true)
const showPostForm = ref(false)
const newPostContent = ref('')
const postTag = ref('')
const posting = ref(false)
const myUserId = ref(null)
const myUsername = ref('Usuario')
const myAvatar = ref(null)
const myHobbies = ref([])
const myGoals = ref([])

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `Hace ${mins} min`
  const h = Math.floor(mins / 60)
  if (h < 24) return `Hace ${h}h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'Ayer'
  return `Hace ${d} días`
}

async function loadMyData() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  myUserId.value = user.id

  const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single()
  if (profile) { myUsername.value = profile.username; myAvatar.value = profile.avatar_url }

  const { data: hobbies } = await supabase.from('hobbies').select('id, name').eq('user_id', user.id).limit(10)
  if (hobbies) myHobbies.value = hobbies

  const { data: goals } = await supabase.from('goals').select('id, title').eq('user_id', user.id).eq('completed', false).limit(10)
  if (goals) myGoals.value = goals
}

async function loadPosts() {
  loading.value = true
  const { data } = await supabase
    .from('community_posts')
    .select('*, profiles(username, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(30)

  if (data) {
    const { data: { user } } = await supabase.auth.getUser()
    // Cargar likes
    const postIds = data.map(p => p.id)
    const { data: myLikes } = await supabase.from('post_likes').select('post_id').eq('user_id', user.id)
    const likedSet = new Set((myLikes || []).map(l => l.post_id))

    posts.value = data.map(p => ({
      ...p,
      liked_by_me: likedSet.has(p.id),
      showComments: false,
      comments: [],
      newComment: ''
    }))
  }
  loading.value = false
}

async function submitPost() {
  if (!newPostContent.value.trim()) return
  posting.value = true
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('community_posts').insert({
    user_id: user.id,
    content: newPostContent.value.trim(),
    tag: postTag.value || null,
    likes_count: 0,
    comments_count: 0
  }).select('*, profiles(username, avatar_url)')

  if (!error && data) {
    posts.value.unshift({ ...data[0], liked_by_me: false, showComments: false, comments: [], newComment: '' })
    newPostContent.value = ''
    postTag.value = ''
    showPostForm.value = false
    // +5 puntos por publicar
    await supabase.from('activity_log').insert({ user_id: user.id, type: 'message', title: 'Publicó en la comunidad', points: 5, activity_date: new Date().toISOString().slice(0,10) })
  }
  posting.value = false
}

async function toggleLike(post) {
  const { data: { user } } = await supabase.auth.getUser()
  if (post.liked_by_me) {
    await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id)
    post.likes_count = Math.max(0, (post.likes_count || 1) - 1)
    await supabase.from('community_posts').update({ likes_count: post.likes_count }).eq('id', post.id)
    post.liked_by_me = false
  } else {
    await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id })
    post.likes_count = (post.likes_count || 0) + 1
    await supabase.from('community_posts').update({ likes_count: post.likes_count }).eq('id', post.id)
    post.liked_by_me = true
  }
}

async function toggleComments(post) {
  post.showComments = !post.showComments
  if (post.showComments && post.comments.length === 0) {
    const { data } = await supabase
      .from('post_comments')
      .select('*, profiles(username, avatar_url)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
    if (data) post.comments = data
  }
}

async function submitComment(post) {
  if (!post.newComment?.trim()) return
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('post_comments').insert({
    post_id: post.id,
    user_id: user.id,
    content: post.newComment.trim()
  }).select('*, profiles(username, avatar_url)')
  if (!error && data) {
    post.comments.push(data[0])
    post.comments_count = (post.comments_count || 0) + 1
    await supabase.from('community_posts').update({ comments_count: post.comments_count }).eq('id', post.id)
    post.newComment = ''
  }
}

async function deletePost(id) {
  await supabase.from('community_posts').delete().eq('id', id)
  posts.value = posts.value.filter(p => p.id !== id)
}

onMounted(async () => {
  await loadMyData()
  await loadPosts()
})
</script>

<style scoped>
.dashboard-community { max-width: 700px; margin: 0 auto; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; gap: 12px; }
h1 { font-size: 26px; color: var(--text-primary); margin-bottom: 4px; }
.subtitle { color: var(--text-secondary); font-size: 14px; }

.btn-primary { background: #E08E6B; color: #fff; border: none; border-radius: 10px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: opacity 0.2s; white-space: nowrap; }
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-cancel { background: #f0f0f0; color: #666; border: none; border-radius: 10px; padding: 10px 16px; font-size: 14px; cursor: pointer; }

.post-form-card { background: var(--bg-card); border-radius: 16px; padding: 20px; margin-bottom: 24px; box-shadow: 0 2px 10px var(--shadow); }
.post-form-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.avatar-mini { width: 36px; height: 36px; border-radius: 50%; overflow: hidden; flex-shrink: 0; }
.avatar-mini img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder-mini { width: 100%; height: 100%; background: #E08E6B; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
.my-name { font-weight: 600; color: var(--text-primary); }
.post-textarea { width: 100%; border: 1px solid #e0e0e0; border-radius: 10px; padding: 12px; font-size: 14px; resize: none; font-family: inherit; box-sizing: border-box; background: var(--bg-secondary); color: var(--text-primary); }
.post-textarea:focus { outline: none; border-color: #E08E6B; }
.post-tags { margin: 10px 0; }
.tag-select { border: 1px solid #ddd; border-radius: 8px; padding: 8px 10px; font-size: 13px; font-family: inherit; background: var(--bg-secondary); color: var(--text-primary); }
.post-form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px; }

.loading-state { text-align: center; padding: 60px 20px; color: #888; }
.spinner { width: 36px; height: 36px; border: 3px solid #eee; border-top-color: #E08E6B; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-feed { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-feed h3 { font-size: 18px; color: var(--text-primary); margin-bottom: 8px; }
.empty-feed p { color: #888; font-size: 14px; }

.feed { display: flex; flex-direction: column; gap: 16px; }

.post-card { background: var(--bg-card); border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px var(--shadow); }
.post-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.post-avatar { width: 44px; height: 44px; border-radius: 50%; overflow: hidden; flex-shrink: 0; }
.post-avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder { width: 100%; height: 100%; background: #22284E; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; }
.post-meta { flex: 1; display: flex; flex-direction: column; }
.post-username { font-weight: 700; font-size: 15px; color: var(--text-primary); }
.post-time { font-size: 12px; color: #999; }
.post-tag { font-size: 11px; padding: 4px 10px; border-radius: 20px; font-weight: 600; }
.tag-hobby { background: #e3f2fd; color: #1565c0; }
.tag-reto { background: #fff3e0; color: #e65100; }
.delete-post-btn { background: none; border: none; color: #ccc; cursor: pointer; padding: 4px 8px; font-size: 14px; transition: color 0.2s; }
.delete-post-btn:hover { color: #e53935; }

.post-content { font-size: 15px; color: var(--text-primary); line-height: 1.6; margin-bottom: 16px; }

.post-actions { display: flex; gap: 16px; padding-top: 12px; border-top: 1px solid var(--border); }
.action-btn { display: flex; align-items: center; gap: 6px; background: none; border: none; color: #999; cursor: pointer; font-size: 14px; transition: color 0.2s; padding: 4px 8px; border-radius: 8px; }
.action-btn:hover { color: #E08E6B; background: #fef3ee; }
.action-btn.liked { color: #e91e63; }
.action-btn.liked:hover { background: #fce4ec; }

.comments-section { margin-top: 16px; border-top: 1px solid var(--border); padding-top: 14px; }
.comments-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
.comment-item { display: flex; gap: 8px; align-items: flex-start; }
.comment-avatar { width: 30px; height: 30px; border-radius: 50%; overflow: hidden; flex-shrink: 0; }
.comment-avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder-xs { width: 100%; height: 100%; background: #E08E6B; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
.comment-body { background: var(--bg-secondary); border-radius: 10px; padding: 8px 12px; flex: 1; }
.comment-user { font-size: 12px; font-weight: 700; color: var(--text-primary); display: block; margin-bottom: 2px; }
.comment-text { font-size: 13px; color: var(--text-secondary); margin: 0; }
.comment-form { display: flex; gap: 8px; }
.comment-input { flex: 1; border: 1px solid #ddd; border-radius: 20px; padding: 8px 14px; font-size: 13px; font-family: inherit; background: var(--bg-secondary); color: var(--text-primary); }
.comment-input:focus { outline: none; border-color: #E08E6B; }
.btn-send { background: #E08E6B; color: #fff; border: none; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: opacity 0.2s; }
.btn-send:hover { opacity: 0.9; }
.btn-send:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
