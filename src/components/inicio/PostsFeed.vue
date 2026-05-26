<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../lib/supabase.js'

const props = defineProps({
  currentUser: { type: Object, default: null },
})

const router = useRouter()

const posts   = ref([])
const loading = ref(false)
const page    = ref(0)
const hasMore = ref(true)
const PAGE_SIZE = 10
const openComments      = ref({})
const commentsData      = ref({})
const commentsLoading   = ref({})
const newComment        = ref({})
const submittingComment = ref({})


// ── Perfil propio
const myProfile = ref(null)

async function loadMyProfile() {
  if (!props.currentUser?.id) return
  const { data } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", props.currentUser.id)
    .single()
  if (data) myProfile.value = data
}

function initials(name) {
  return (name || '?')[0].toUpperCase()
}
function timeAgo(ts) {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (m < 1)  return 'ahora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// Cargar feed
async function loadFeed(reset = false) {
  if (loading.value) return
  if (reset) { page.value = 0; posts.value = []; hasMore.value = true }
  if (!hasMore.value) return
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`*, profiles!fk_posts_profiles(username, avatar_url, is_public), hobbies!fk_posts_hobbies(name, gradient)`)
      .neq('user_id', props.currentUser?.id ?? '00000000-0000-0000-0000-000000000000')
      .order('created_at', { ascending: false })
      .range(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE - 1)

    if (error) { console.error('Error cargando feed:', error); loading.value = false; return }

    if (data) {
      const publicPosts = data.filter(s => s.profiles?.is_public !== false)
      const newPosts = publicPosts.map(s => ({
        id:          s.id,
        user_id:     s.user_id,
        text:        s.note,
        image_url:   s.image_url,
        minutes:     s.minutes,
        created_at:  s.created_at,
        hobby_name:  s.hobbies?.name || '',
        hobby_color: s.hobbies?.gradient?.[0] || '#ff6b9d',
        username:    s.profiles?.username || null,
        avatar_url:  s.profiles?.avatar_url || null,
        likes: 0, liked: false, likedBy: [], comments: 0,
      }))
      posts.value.push(...newPosts)
      hasMore.value = data.length === PAGE_SIZE
      page.value++
      await loadLikesForPosts(newPosts)
      await loadCommentsCount(newPosts)
    }
  } catch (err) { console.error('Error inesperado:', err) }
  loading.value = false
}

// Likes
async function loadLikesForPosts(targetPosts) {
  if (!targetPosts.length) return
  const postIds = targetPosts.map(p => p.id)
  const { data } = await supabase
    .from('post_likes')
    .select('post_id, user_id, profiles!fk_post_likes_profiles(username, avatar_url)')
    .in('post_id', postIds)
  const likesMap = {}
  data?.forEach(like => {
    if (!likesMap[like.post_id]) likesMap[like.post_id] = []
    likesMap[like.post_id].push({
      userId:   like.user_id,
      username: like.profiles?.username || 'Usuario',
      avatar:   like.profiles?.avatar_url,
    })
  })
  targetPosts.forEach(post => {
    const postLikes = likesMap[post.id] || []
    post.likes   = postLikes.length
    post.likedBy = postLikes
    post.liked   = props.currentUser ? postLikes.some(l => l.userId === props.currentUser.id) : false
  })
}

async function toggleLike(postId) {
  if (!props.currentUser) { router.push('/login'); return }
  const post = posts.value.find(p => p.id === postId)
  if (!post) return
  const isLiking = !post.liked
  post.liked = isLiking; post.likes += isLiking ? 1 : -1
  if (isLiking) {
    const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: props.currentUser.id })
    if (error) { post.liked = false; post.likes-- }
  } else {
    const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', props.currentUser.id)
    if (error) { post.liked = true; post.likes++ }
  }
}

// Comentarios: conteo inicial 
async function loadCommentsCount(targetPosts) {
  if (!targetPosts.length) return
  const { data } = await supabase.from('post_comments').select('post_id').in('post_id', targetPosts.map(p => p.id))
  if (!data) return
  const countMap = {}
  data.forEach(c => { countMap[c.post_id] = (countMap[c.post_id] || 0) + 1 })
  targetPosts.forEach(post => { post.comments = countMap[post.id] || 0 })
}

// Comentarios: abrir/cerrar
async function toggleComments(postId) {
  if (openComments.value[postId]) { openComments.value[postId] = false; return }
  openComments.value[postId] = true
  newComment.value[postId] = newComment.value[postId] || ''
  if (!commentsData.value[postId]) await fetchComments(postId)
}

async function fetchComments(postId) {
  commentsLoading.value[postId] = true
  const { data } = await supabase
    .from('post_comments')
    .select('*, profiles(id, username, avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
  commentsData.value[postId]    = data || []
  commentsLoading.value[postId] = false
}

// Comentarios: enviar 
async function submitComment(postId) {
  if (!props.currentUser) { router.push('/login'); return }
  const text = (newComment.value[postId] || '').trim()
  if (!text) return
  submittingComment.value[postId] = true
  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, user_id: props.currentUser.id, content: text })
    .select('*, profiles(id, username, avatar_url)')
    .single()
  if (!error && data) {
    if (!commentsData.value[postId]) commentsData.value[postId] = []
    commentsData.value[postId].push(data)
    newComment.value[postId] = ''
    const post = posts.value.find(p => p.id === postId)
    if (post) post.comments++
    await nextTick()
    const el = document.getElementById(`cl-${postId}`)
    if (el) el.scrollTop = el.scrollHeight
  }
  submittingComment.value[postId] = false
}

// Comentarios: borrar
async function deleteComment(postId, commentId) {
  const { error } = await supabase.from('post_comments').delete().eq('id', commentId)
  if (!error) {
    commentsData.value[postId] = commentsData.value[postId].filter(c => c.id !== commentId)
    const post = posts.value.find(p => p.id === postId)
    if (post && post.comments > 0) post.comments--
  }
}

function goToProfile(username) {
  if (!username) return
  router.push(`/dashboard/profile/${username}`)
}

// Infinite scroll
function onScroll(e) {
  const c = e.target
  if (c.scrollHeight - c.scrollTop - c.clientHeight < 200 && !loading.value && hasMore.value) loadFeed()
}

onMounted(() => { loadFeed(true); loadMyProfile() })
watch(() => props.currentUser?.id, (newId, oldId) => { if (newId !== oldId) { loadFeed(true); loadMyProfile() } })
</script>

<template>
  <section class="posts-section" @scroll="onScroll">
    <div class="posts-header">
      <h2>Publicaciones</h2>
      <button class="btn-new" @click="$router.push('/dashboard/profile')">
        <svg viewBox="0 0 16 16" fill="none" width="14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M8 1v14M1 8h14"/></svg>
        Crear
      </button>
    </div>

    <div v-if="loading && posts.length === 0" class="loading-state">
      <div class="spinner"></div>
      <span>Cargando publicaciones...</span>
    </div>

    <div v-else-if="posts.length === 0" class="posts-empty">
      <div class="empty-illustration">
        <svg viewBox="0 0 48 48" fill="none" width="48">
          <rect x="8" y="8" width="32" height="32" rx="8" stroke="#e8eaf0" stroke-width="2"/>
          <circle cx="18" cy="20" r="3" fill="#e8eaf0"/>
          <path d="M8 32l8-8 6 6 10-10 8 8" stroke="#e8eaf0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <p>Aún no hay publicaciones</p>
      <span>Sé el primero en compartir tu progreso</span>
    </div>

    <div v-else class="posts-list">
      <article v-for="post in posts" :key="post.id" class="post-card">

        <!-- Header -->
        <div class="post-header">
          <div class="post-author" @click="goToProfile(post.username)">
            <div class="author-avatar">
              <img v-if="post.avatar_url" :src="post.avatar_url" />
              <span v-else>{{ initials(post.username) }}</span>
            </div>
            <div class="author-meta">
              <span class="author-name">{{ post.username || 'Usuario' }}</span>
              <span class="post-time">{{ timeAgo(post.created_at) }}</span>
            </div>
          </div>
          <span v-if="post.hobby_name" class="post-tag" :style="{ background: post.hobby_color }">{{ post.hobby_name }}</span>
        </div>

        <!-- Body -->
        <div class="post-body">
          <p v-if="post.text" class="post-text">{{ post.text }}</p>
          <div v-if="post.image_url" class="post-image-wrap">
            <img :src="post.image_url" class="post-image" alt="" loading="lazy" />
          </div>
        </div>

        <!-- Stats -->
        <div v-if="post.minutes" class="post-stats">
          <span class="stat-badge mins">
            <svg viewBox="0 0 16 16" fill="none" width="12" stroke="currentColor" stroke-width="2">
              <circle cx="8" cy="8" r="6"/><path d="M8 4v4l2 2" stroke-linecap="round"/>
            </svg>
            {{ post.minutes }} min
          </span>
        </div>

        <!-- Actions -->
        <div class="post-actions">
          <button class="action-btn like" :class="{ active: post.liked }" @click="toggleLike(post.id)">
            <svg viewBox="0 0 24 24" :fill="post.liked ? 'rgba(255,107,157,.25)' : 'none'" width="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
            <span>{{ post.likes }}</span>
          </button>

          <button class="action-btn comment" :class="{ active: openComments[post.id] }" @click="toggleComments(post.id)">
            <svg viewBox="0 0 24 24" fill="none" width="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
            </svg>
            <span>{{ post.comments || 0 }}</span>
          </button>
        </div>

        <!-- Comentarios inline -->
        <Transition name="comments-slide">
          <div v-if="openComments[post.id]" class="comments-section">

            <div :id="`cl-${post.id}`" class="comments-list">
              <div v-if="commentsLoading[post.id]" class="comments-loading">
                <div class="spinner-xs"></div>
              </div>
              <div v-else-if="!commentsData[post.id]?.length" class="comments-empty">
                Sé el primero en comentar
              </div>
              <div v-else v-for="c in commentsData[post.id]" :key="c.id" class="comment-item">
                <div class="comment-avatar">
                  <img v-if="c.profiles?.avatar_url" :src="c.profiles.avatar_url" />
                  <span v-else>{{ initials(c.profiles?.username) }}</span>
                </div>
                <div class="comment-bubble">
                  <span class="comment-author">{{ c.profiles?.username || 'Usuario' }}</span>
                  <p class="comment-text">{{ c.content }}</p>
                </div>
                <button
                  v-if="currentUser && c.user_id === currentUser.id"
                  class="comment-delete"
                  @click="deleteComment(post.id, c.id)"
                >
                  <svg viewBox="0 0 12 12" fill="none" width="10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                    <path d="M1 1l10 10M11 1L1 11"/>
                  </svg>
                </button>
              </div>
            </div>

            <div v-if="currentUser" class="comment-input-row">
              <div class="comment-input-avatar">
                <img v-if="myProfile?.avatar_url" :src="myProfile.avatar_url" />
                <span v-else>{{ initials(myProfile?.username || currentUser?.email) }}</span>
              </div>
              <input
                v-model="newComment[post.id]"
                class="comment-input"
                placeholder="Escribe un comentario..."
                maxlength="300"
                @keyup.enter="submitComment(post.id)"
              />
              <button
                class="comment-send"
                :disabled="!newComment[post.id]?.trim() || submittingComment[post.id]"
                @click="submitComment(post.id)"
              >
                <svg viewBox="0 0 20 20" fill="none" width="16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 2L9 11M18 2l-6 16-3-7-7-3 16-6z"/>
                </svg>
              </button>
            </div>
            <div v-else class="comment-login-prompt">
              <span @click="router.push('/login')">Inicia sesión para comentar</span>
            </div>

          </div>
        </Transition>

      </article>

      <div v-if="loading && posts.length > 0" class="loading-more"><div class="spinner-small"></div></div>
      <div v-if="!hasMore && posts.length > 0" class="feed-end"><span>No hay más publicaciones</span></div>
    </div>
  </section>
</template>

<style scoped>
.posts-section { margin-bottom: 20px; }
.posts-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding: 0 4px; }
.posts-header h2 { font-size: 18px; font-weight: 800; color: #22284E; margin: 0; }
.btn-new {
  display: flex; align-items: center; gap: 6px;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff; border: none; border-radius: 12px; padding: 10px 16px;
  font-size: 13px; font-weight: 700; cursor: pointer; transition: all .2s;
  box-shadow: 0 4px 16px rgba(255,107,157,.25);
}
.btn-new:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(255,107,157,.35); }

.loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 20px; color: rgba(34,40,78,.4); font-size: 14px; }
.spinner      { width: 32px; height: 32px; border-radius: 50%; border: 3px solid rgba(34,40,78,.08); border-top-color: #ff6b9d; animation: spin 1s linear infinite; }
.spinner-small { width: 20px; height: 20px; border-radius: 50%; border: 2px solid rgba(34,40,78,.08); border-top-color: #ff6b9d; animation: spin 1s linear infinite; }
.spinner-xs   { width: 13px; height: 13px; border-radius: 50%; border: 2px solid rgba(34,40,78,.15); border-top-color: #ff6b9d; animation: spin .8s linear infinite; display: inline-block; }
.spinner-xs.white { border-color: rgba(255,255,255,.3); border-top-color: #fff; }
@keyframes spin { to { transform: rotate(360deg); } }

.posts-empty { text-align: center; padding: 48px 20px; background: #fff; border-radius: 20px; border: 1.5px dashed rgba(34,40,78,.1); }
.empty-illustration { margin-bottom: 16px; }
.posts-empty p { font-size: 15px; color: #22284E; font-weight: 600; margin: 0 0 4px; }
.posts-empty span { font-size: 13px; color: rgba(34,40,78,.4); }

.posts-list { display: flex; flex-direction: column; gap: 16px; }
.post-card { background: #fff; border-radius: 20px; padding: 20px; box-shadow: 0 2px 12px rgba(34,40,78,.06); border: 1px solid rgba(34,40,78,.06); transition: box-shadow .2s; overflow: hidden; }
.post-card:hover { box-shadow: 0 8px 24px rgba(34,40,78,.1); }

.post-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.post-author { display: flex; align-items: center; gap: 10px; cursor: pointer; transition: opacity .2s; }
.post-author:hover { opacity: .8; }
.author-avatar { width: 40px; height: 40px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, #ff6b9d, #ffb3c6); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 14px; font-weight: 800; flex-shrink: 0; }
.author-avatar img { width: 100%; height: 100%; object-fit: cover; }
.author-meta { display: flex; flex-direction: column; gap: 2px; }
.author-name { font-size: 14px; font-weight: 700; color: #22284E; }
.post-time { font-size: 12px; color: rgba(34,40,78,.4); }
.post-tag { font-size: 11px; font-weight: 700; color: #fff; padding: 5px 14px; border-radius: 99px; flex-shrink: 0; }

.post-body { margin-bottom: 14px; }
.post-text { font-size: 14px; color: rgba(34,40,78,.85); line-height: 1.6; margin: 0 0 12px; }
.post-image-wrap { border-radius: 16px; overflow: hidden; }
.post-image { width: 100%; height: 280px; object-fit: cover; display: block; transition: transform .3s; }
.post-image-wrap:hover .post-image { transform: scale(1.02); }

.post-stats { display: flex; gap: 8px; margin-bottom: 14px; }
.stat-badge { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 99px; font-size: 12px; font-weight: 600; }
.stat-badge.mins { background: #e3f2fd; color: #2196f3; }

.post-actions { display: flex; gap: 8px; padding-top: 4px; border-top: 1px solid rgba(34,40,78,.06); }
.action-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 12px; border: none; background: transparent; color: rgba(34,40,78,.5); font-size: 13px; font-weight: 600; cursor: pointer; transition: all .2s; }
.action-btn:hover { background: rgba(34,40,78,.05); color: #22284E; }
.action-btn.like.active { background: rgba(255,107,157,.12); color: #ff6b9d; }
.action-btn.comment.active { background: rgba(59,130,246,.1); color: #3b82f6; }

.action-btn svg { display: block; }

/* ── Comentarios inline ── */
.comments-section { margin-top: 14px; border-top: 1px solid rgba(34,40,78,.06); padding-top: 14px; }

.comments-slide-enter-active,
.comments-slide-leave-active { transition: all .25s ease; overflow: hidden; }
.comments-slide-enter-from,
.comments-slide-leave-to { opacity: 0; transform: translateY(-6px); }

.comments-list { display: flex; flex-direction: column; gap: 10px; max-height: 300px; overflow-y: auto; padding-right: 4px; margin-bottom: 12px; }
.comments-list::-webkit-scrollbar { width: 4px; }
.comments-list::-webkit-scrollbar-thumb { background: rgba(34,40,78,.1); border-radius: 99px; }
.comments-loading { display: flex; justify-content: center; padding: 16px; }
.comments-empty { text-align: center; font-size: 13px; color: rgba(34,40,78,.4); padding: 12px; }

.comment-item { display: flex; align-items: flex-start; gap: 8px; }
.comment-avatar { width: 28px; height: 28px; border-radius: 50%; overflow: hidden; flex-shrink: 0; background: linear-gradient(135deg, #ff6b9d, #ffb3c6); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 10px; font-weight: 800; }
.comment-avatar img { width: 100%; height: 100%; object-fit: cover; }
.comment-bubble { flex: 1; background: rgba(34,40,78,.04); border-radius: 12px; padding: 8px 12px; }
.comment-author { font-size: 11px; font-weight: 700; color: #22284E; display: block; margin-bottom: 2px; }
.comment-text { font-size: 13px; color: rgba(34,40,78,.8); margin: 0; line-height: 1.5; }
.comment-delete { background: none; border: none; cursor: pointer; color: rgba(34,40,78,.25); padding: 4px; border-radius: 6px; opacity: 0; transition: all .2s; flex-shrink: 0; align-self: center; }
.comment-item:hover .comment-delete { opacity: 1; }
.comment-delete:hover { color: #ef4444; background: rgba(239,68,68,.08); }

.comment-input-row { display: flex; align-items: center; gap: 8px; }
.comment-input-avatar { width: 28px; height: 28px; border-radius: 50%; overflow: hidden; flex-shrink: 0; background: linear-gradient(135deg, #ff6b9d, #ffb3c6); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 10px; font-weight: 800; }
.comment-input-avatar img { width: 100%; height: 100%; object-fit: cover; }
.comment-input { flex: 1; border: 1.5px solid rgba(34,40,78,.1); border-radius: 20px; padding: 8px 14px; font-size: 13px; color: #22284E; font-family: inherit; background: rgba(34,40,78,.02); outline: none; transition: border-color .2s; }
.comment-input:focus { border-color: #ff6b9d; background: #fff; }
.comment-input::placeholder { color: rgba(34,40,78,.35); }
.comment-send { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #ff6b9d, #ffb3c6); border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff; transition: all .2s; flex-shrink: 0; }
.comment-send:disabled { opacity: .4; cursor: not-allowed; }
.comment-send:not(:disabled):hover { transform: scale(1.08); }
.comment-login-prompt { text-align: center; font-size: 13px; color: rgba(34,40,78,.4); padding: 8px; }
.comment-login-prompt span { color: #ff6b9d; cursor: pointer; font-weight: 600; }

.feed-end { text-align: center; padding: 20px; color: rgba(34,40,78,.35); font-size: 13px; }

@media (min-width: 1024px) {
  .post-image { height: 350px; }
  .post-card { padding: 24px; }
}
</style>