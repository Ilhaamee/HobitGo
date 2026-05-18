<script setup>
import { ref, onMounted, watch } from 'vue'
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

// ── Helpers ──────────────────────────────
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

// ── Cargar feed desde tabla posts ────────
async function loadFeed(reset = false) {
  if (loading.value) return
  if (reset) {
    page.value  = 0
    posts.value = []
    hasMore.value = true
  }
  if (!hasMore.value) return

  loading.value = true

  try {
    // posts tiene FK nombradas: fk_posts_profiles y fk_posts_hobbies
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!fk_posts_profiles(username, avatar_url, is_public),
        hobbies!fk_posts_hobbies(name, gradient)
      `)
      .neq('user_id', props.currentUser?.id ?? '00000000-0000-0000-0000-000000000000')
      .order('created_at', { ascending: false })
      .range(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE - 1)
    if (error) {
      console.error('Error cargando feed:', error)
      loading.value = false
      return
    }

    if (data) {
      // Filtramos en cliente los posts de perfiles privados
      // (la RLS ya filtra, pero si hay anon puede llegar algo)
      const publicPosts = data.filter(s => s['profiles!fk_posts_profiles']?.is_public !== false)

      const newPosts = publicPosts.map(s => ({
        id:          s.id,
        user_id:     s.user_id,
        text:        s.note,
        image_url:   s.image_url,
        minutes:     s.minutes,
        created_at:  s.created_at,
        hobby_name:  s['hobbies!fk_posts_hobbies']?.name || '',
        hobby_color: s['hobbies!fk_posts_hobbies']?.gradient?.[0] || '#ff6b9d',
        profiles:    s['profiles!fk_posts_profiles'],
        likes:       0,
        liked:       false,
        likedBy:     [],
        comments:    0,
        streak:      0,
      }))

      posts.value.push(...newPosts)
      hasMore.value = data.length === PAGE_SIZE
      page.value++

      await loadLikesForPosts(newPosts)
      await loadCommentsCount(newPosts)
    }
  } catch (err) {
    console.error('Error inesperado en feed:', err)
  }

  loading.value = false
}

// ── Cargar likes ─────────────────────────
async function loadLikesForPosts(targetPosts) {
  if (!targetPosts.length) return
  const postIds = targetPosts.map(p => p.id)

  const { data, error } = await supabase
    .from('post_likes')
    .select('post_id, user_id, profiles!fk_post_likes_profiles(username, avatar_url)')
    .in('post_id', postIds)

  if (error) {
    console.warn('Error cargando likes:', error)
    return
  }

  const likesMap = {}
  data?.forEach(like => {
    if (!likesMap[like.post_id]) likesMap[like.post_id] = []
    likesMap[like.post_id].push({
      userId:   like.user_id,
      username: like['profiles!fk_post_likes_profiles']?.username || 'Usuario',
      avatar:   like['profiles!fk_post_likes_profiles']?.avatar_url,
    })
  })

  targetPosts.forEach(post => {
    const postLikes = likesMap[post.id] || []
    post.likes   = postLikes.length
    post.likedBy = postLikes
    post.liked   = props.currentUser
      ? postLikes.some(l => l.userId === props.currentUser.id)
      : false
  })
}

// ── Cargar conteo de comentarios ─────────
async function loadCommentsCount(targetPosts) {
  if (!targetPosts.length) return
  const postIds = targetPosts.map(p => p.id)

  const { data, error } = await supabase
    .from('post_comments')
    .select('post_id')
    .in('post_id', postIds)

  if (error || !data) return

  const countMap = {}
  data.forEach(c => {
    countMap[c.post_id] = (countMap[c.post_id] || 0) + 1
  })

  targetPosts.forEach(post => {
    post.comments = countMap[post.id] || 0
  })
}

// ── Toggle like ──────────────────────────
async function toggleLike(postId) {
  if (!props.currentUser) {
    router.push('/login')
    return
  }

  const post = posts.value.find(p => p.id === postId)
  if (!post) return

  const isLiking = !post.liked

  // Optimistic UI
  post.liked = isLiking
  post.likes += isLiking ? 1 : -1

  if (isLiking) {
    const { error } = await supabase
      .from('post_likes')
      .insert({ post_id: postId, user_id: props.currentUser.id })

    if (error) {
      console.error('Error dando like:', error)
      post.liked = false
      post.likes--
    }
  } else {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', props.currentUser.id)

    if (error) {
      console.error('Error quitando like:', error)
      post.liked = true
      post.likes++
    }
  }
}

// ── Navegar a perfil ─────────────────────
function goToProfile(username) {
  if (!username) return
  router.push(`/dashboard/profile/${username}`)
}

// ── Infinite scroll ──────────────────────
function onScroll(e) {
  const container = e.target
  const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200
  if (nearBottom && !loading.value && hasMore.value) {
    loadFeed()
  }
}

// ── Init ─────────────────────────────────
onMounted(() => {
  loadFeed(true)
})

// Recargar cuando currentUser llega (puede tardar en resolver)
watch(() => props.currentUser?.id, (newId, oldId) => {
  if (newId !== oldId) loadFeed(true)
})
</script>

<template>
  <section class="posts-section" @scroll="onScroll">
    <div class="posts-header">
      <h2>Publicaciones</h2>
      <button class="btn-new" @click="$router.push('/dashboard/profile')">
        <svg viewBox="0 0 16 16" fill="none" width="14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M8 1v14M1 8h14"/>
        </svg>
        Crear
      </button>
    </div>

    <!-- Loading inicial -->
    <div v-if="loading && posts.length === 0" class="loading-state">
      <div class="spinner"></div>
      <span>Cargando publicaciones...</span>
    </div>

    <!-- Empty state -->
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

    <!-- Posts list -->
    <div v-else class="posts-list">
      <article v-for="post in posts" :key="post.id" class="post-card">
        <!-- Header -->
        <div class="post-header">
          <div class="post-author" @click="goToProfile(post.profiles?.username)">
            <div class="author-avatar">
              <img v-if="post.profiles?.avatar_url" :src="post.profiles.avatar_url" />
              <span v-else>{{ initials(post.profiles?.username) }}</span>
            </div>
            <div class="author-meta">
              <span class="author-name">{{ post.profiles?.username || 'Usuario' }}</span>
              <span class="post-time">{{ timeAgo(post.created_at) }}</span>
            </div>
          </div>
          <span
            v-if="post.hobby_name"
            class="post-tag"
            :style="{ background: post.hobby_color || '#ff6b9d' }"
          >
            {{ post.hobby_name }}
          </span>
        </div>

        <!-- Content -->
        <div class="post-body">
          <p v-if="post.text" class="post-text">{{ post.text }}</p>
          <div v-if="post.image_url" class="post-image-wrap">
            <img :src="post.image_url" class="post-image" alt="" loading="lazy" />
          </div>
        </div>

        <!-- Stats bar -->
        <div class="post-stats" v-if="post.minutes">
          <span class="stat-badge mins">
            <svg viewBox="0 0 16 16" fill="none" width="12" stroke="currentColor" stroke-width="2">
              <circle cx="8" cy="8" r="6"/>
              <path d="M8 4v4l2 2" stroke-linecap="round"/>
            </svg>
            {{ post.minutes }} min
          </span>
        </div>

        <!-- Actions -->
        <div class="post-actions">
          <button
            class="action-btn like"
            :class="{ active: post.liked }"
            @click="toggleLike(post.id)"
          >
            <svg viewBox="0 0 24 24" :fill="post.liked ? 'rgba(255,107,157,.2)' : 'none'" width="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
            <span>{{ post.likes }}</span>
          </button>

          <button class="action-btn">
            <svg viewBox="0 0 24 24" fill="none" width="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
            </svg>
            <span>{{ post.comments || 0 }}</span>
          </button>

          <button class="action-btn">
            <svg viewBox="0 0 24 24" fill="none" width="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
          </button>
        </div>
      </article>

      <!-- Loading más posts -->
      <div v-if="loading && posts.length > 0" class="loading-more">
        <div class="spinner-small"></div>
      </div>

      <!-- Fin del feed -->
      <div v-if="!hasMore && posts.length > 0" class="feed-end">
        <span>No hay más publicaciones</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.posts-section { margin-bottom: 20px; }
.posts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 0 4px;
}
.posts-header h2 {
  font-size: 18px;
  font-weight: 800;
  color: #22284E;
  margin: 0;
}
.btn-new {
  display: flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 16px rgba(255,107,157,.25);
}
.btn-new:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255,107,157,.35);
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 20px;
  color: rgba(34,40,78,.4);
  font-size: 14px;
}
.spinner {
  width: 32px; height: 32px; border-radius: 50%;
  border: 3px solid rgba(34,40,78,.08);
  border-top-color: #ff6b9d;
  animation: spin 1s linear infinite;
}
.spinner-small {
  width: 20px; height: 20px; border-radius: 50%;
  border: 2px solid rgba(34,40,78,.08);
  border-top-color: #ff6b9d;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Empty */
.posts-empty {
  text-align: center;
  padding: 48px 20px;
  background: #fff;
  border-radius: 20px;
  border: 1.5px dashed rgba(34,40,78,.1);
}
.empty-illustration { margin-bottom: 16px; }
.posts-empty p {
  font-size: 15px;
  color: #22284E;
  font-weight: 600;
  margin: 0 0 4px;
}
.posts-empty span {
  font-size: 13px;
  color: rgba(34,40,78,.4);
}

/* Posts */
.posts-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.post-card {
  background: #fff;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(34,40,78,.06);
  border: 1px solid rgba(34,40,78,.06);
  transition: transform 0.2s, box-shadow 0.2s;
}
.post-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(34,40,78,.1);
}

.post-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.post-author {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: opacity 0.2s;
}
.post-author:hover { opacity: 0.8; }
.author-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  flex-shrink: 0;
}
.author-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.author-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.author-name {
  font-size: 14px;
  font-weight: 700;
  color: #22284E;
}
.post-time {
  font-size: 12px;
  color: rgba(34,40,78,.4);
}
.post-tag {
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  padding: 5px 14px;
  border-radius: 99px;
  flex-shrink: 0;
}

.post-body { margin-bottom: 14px; }
.post-text {
  font-size: 14px;
  color: rgba(34,40,78,.85);
  line-height: 1.6;
  margin: 0 0 12px;
}
.post-image-wrap {
  border-radius: 16px;
  overflow: hidden;
}
.post-image {
  width: 100%;
  height: 280px;
  object-fit: cover;
  display: block;
  transition: transform 0.3s;
}
.post-image-wrap:hover .post-image { transform: scale(1.02); }

.post-stats {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.stat-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 600;
}
.stat-badge.mins {
  background: #e3f2fd;
  color: #2196f3;
}

.post-actions {
  display: flex;
  gap: 8px;
  padding-top: 4px;
  border-top: 1px solid rgba(34,40,78,.06);
}
.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 12px;
  border: none;
  background: transparent;
  color: rgba(34,40,78,.5);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.action-btn:hover {
  background: rgba(34,40,78,.05);
  color: #22284E;
}
.action-btn.like.active {
  background: rgba(255,107,157,.12);
  color: #ff6b9d;
}
.action-btn svg { display: block; }

.loading-more {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.feed-end {
  text-align: center;
  padding: 20px;
  color: rgba(34,40,78,.35);
  font-size: 13px;
}

@media (min-width: 1024px) {
  .post-image { height: 350px; }
  .post-card { padding: 24px; }
}
</style>