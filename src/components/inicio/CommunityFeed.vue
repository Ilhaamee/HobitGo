<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

const props = defineProps({
  currentUserId: { type: String, default: null },
})

const emit = defineEmits(['like'])

const posts   = ref([])
const loading = ref(true)
const isVisible = ref(false)

onMounted(() => {
  loadFeed()
  setTimeout(() => isVisible.value = true, 500)
})

async function loadFeed() {
  loading.value = true

  const { data } = await supabase
    .from('hobby_sessions')
    .select(`
      id, note, minutes, image_url, created_at, user_id,
      hobbies ( name, gradient ),
      profiles ( id, username, avatar_url )
    `)
    .not('note', 'is', null)
    .neq('user_id', props.currentUserId || '')
    .order('created_at', { ascending: false })
    .limit(20)

  if (data) {
    posts.value = data.map((s, i) => ({
      id:          s.id,
      hobbyName:   s.hobbies?.name || '',
      hobbyColor:  s.hobbies?.gradient?.[0] || '#ff6b9d',
      hobbyColor2: s.hobbies?.gradient?.[1] || '#ffb3c6',
      text:        s.note,
      minutes:     s.minutes,
      imageUrl:    s.image_url || null,
      createdAt:   s.created_at,
      username:    s.profiles?.username || 'Usuario',
      avatarUrl:   s.profiles?.avatar_url || null,
      likes:       Math.floor(Math.random() * 15) + 1,
      liked:       false,
      index:       i,
    }))
  }

  loading.value = false
}

function toggleLike(post) {
  post.liked = !post.liked
  post.likes = (post.likes || 0) + (post.liked ? 1 : -1)
  emit('like', post.id)
}

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'Ahora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'Ayer' : `${d}d`
}

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function getCardHeight(index) {
  // Vary heights for masonry effect
  const heights = ['auto', 'auto', 'auto']
  return heights[index % 3]
}
</script>

<template>
  <div class="cf-wrap" :class="{ visible: isVisible }">
    <!-- Header -->
    <div class="cf-header">
      <div class="cf-header-left">
        <h2 class="cf-title">Comunidad</h2>
        <span class="cf-sub">Lo que practica la gente</span>
      </div>
      <button class="cf-refresh" @click="loadFeed" :disabled="loading">
        <svg viewBox="0 0 16 16" fill="none" width="14" :class="{ spinning: loading }">
          <path d="M1 8a7 7 0 0112.5-4.5M15 8a7 7 0 01-12.5 4.5M15 3v4h-4M1 13v-4h4" 
            stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="cf-skeletons">
      <div v-for="i in 6" :key="i" class="cf-skeleton" :style="{ animationDelay: `${i * 0.05}s` }">
        <div class="cf-sk-header">
          <div class="cf-sk-avatar"></div>
          <div class="cf-sk-lines">
            <div class="cf-sk-line cf-sk-short"></div>
            <div class="cf-sk-line cf-sk-long"></div>
          </div>
        </div>
        <div class="cf-sk-media"></div>
        <div class="cf-sk-body">
          <div class="cf-sk-line cf-sk-full"></div>
          <div class="cf-sk-line cf-sk-mid"></div>
        </div>
      </div>
    </div>

    <!-- Feed -->
    <div v-else-if="posts.length > 0" class="cf-feed">
      <div
        v-for="post in posts"
        :key="post.id"
        class="cf-card"
        :class="{ 'has-image': post.imageUrl, 'is-visible': isVisible }"
        :style="{ 
          animationDelay: `${0.1 + post.index * 0.06}s`,
          '--card-color': post.hobbyColor,
          '--card-color2': post.hobbyColor2
        }"
      >
        <!-- Image -->
        <div
          v-if="post.imageUrl"
          class="cf-media"
          :style="{ backgroundImage: `url(${post.imageUrl})` }"
        >
          <div class="cf-media-overlay"></div>
          <span class="cf-media-hobby" :style="{ background: post.hobbyColor }">
            {{ post.hobbyName }}
          </span>
        </div>

        <!-- Color band if no image -->
        <div
          v-else
          class="cf-color-band"
          :style="{ background: `linear-gradient(135deg, ${post.hobbyColor}, ${post.hobbyColor2})` }"
        >
          <span class="cf-band-hobby">{{ post.hobbyName }}</span>
          <div class="cf-band-decor">
            <span>✨</span>
          </div>
        </div>

        <!-- Body -->
        <div class="cf-body">
          <div class="cf-user">
            <div class="cf-avatar" :style="{ background: post.hobbyColor }">
              <img v-if="post.avatarUrl" :src="post.avatarUrl" />
              <span v-else>{{ initials(post.username) }}</span>
            </div>
            <div class="cf-user-info">
              <span class="cf-username">{{ post.username }}</span>
              <span class="cf-time">{{ timeAgo(post.createdAt) }}</span>
            </div>
            <span v-if="post.minutes" class="cf-mins">{{ post.minutes }}m</span>
          </div>

          <p v-if="post.text" class="cf-text">{{ post.text }}</p>

          <div class="cf-actions">
            <button
              class="cf-like"
              :class="{ liked: post.liked }"
              @click="toggleLike(post)"
            >
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                <path
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  :fill="post.liked ? 'currentColor' : 'none'"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
              </svg>
              <span>{{ post.likes || 0 }}</span>
            </button>
            
            <button class="cf-comment">
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" 
                  stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            
            <button class="cf-share">
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" 
                  stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else class="cf-empty">
      <div class="cf-empty-icon">🌿</div>
      <p class="cf-empty-title">Aún no hay publicaciones</p>
      <p class="cf-empty-sub">Sé el primero en compartir tu progreso</p>
    </div>
  </div>
</template>

<style scoped>
.cf-wrap {
  margin-bottom: 24px;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.6s var(--ease-out);
}

.cf-wrap.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Header */
.cf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.cf-header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cf-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--c-text);
  margin: 0;
  letter-spacing: -0.5px;
}

.cf-sub {
  font-size: 12px;
  color: var(--c-text-muted);
  font-weight: 500;
}

.cf-refresh {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--c-border);
  background: var(--c-bg-card);
  color: var(--c-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s var(--ease-smooth);
}

.cf-refresh:hover {
  background: var(--c-text);
  color: #fff;
  border-color: var(--c-text);
  transform: rotate(180deg);
}

.cf-refresh svg.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Skeletons */
.cf-skeletons {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.cf-skeleton {
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  opacity: 0;
  animation: fadeUp 0.4s var(--ease-out) forwards;
}

.cf-sk-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
}

.cf-sk-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(90deg, rgba(26,29,46,0.06) 25%, rgba(26,29,46,0.1) 50%, rgba(26,29,46,0.06) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  flex-shrink: 0;
}

.cf-sk-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cf-sk-line {
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(90deg, rgba(26,29,46,0.06) 25%, rgba(26,29,46,0.1) 50%, rgba(26,29,46,0.06) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.cf-sk-short { width: 40%; }
.cf-sk-long { width: 70%; }
.cf-sk-full { width: 100%; }
.cf-sk-mid { width: 60%; }

.cf-sk-media {
  height: 160px;
  background: linear-gradient(90deg, rgba(26,29,46,0.06) 25%, rgba(26,29,46,0.1) 50%, rgba(26,29,46,0.06) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.cf-sk-body {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Feed - Masonry style */
.cf-feed {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.cf-card {
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  opacity: 0;
  transform: translateY(15px) scale(0.98);
  animation: fadeUp 0.5s var(--ease-out) forwards;
  transition: all 0.35s var(--ease-smooth);
  break-inside: avoid;
}

.cf-card:hover {
  transform: translateY(-4px) scale(1.01);
  box-shadow: var(--shadow-lg);
  border-color: var(--c-border-hover);
}

/* Media */
.cf-media {
  height: 180px;
  background-size: cover;
  background-position: center;
  position: relative;
  transition: transform 0.5s var(--ease-smooth);
}

.cf-card:hover .cf-media {
  transform: scale(1.03);
}

.cf-media-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 30%, rgba(20, 22, 50, 0.5));
  transition: opacity 0.3s;
}

.cf-media-hobby {
  position: absolute;
  bottom: 10px;
  left: 12px;
  font-size: 10px;
  font-weight: 800;
  color: #fff;
  padding: 5px 12px;
  border-radius: var(--radius-full);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* Color band */
.cf-color-band {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  position: relative;
  overflow: hidden;
}

.cf-band-hobby {
  font-size: 14px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  position: relative;
  z-index: 1;
}

.cf-band-decor {
  font-size: 24px;
  opacity: 0.3;
  animation: float 3s ease-in-out infinite;
}

/* Body */
.cf-body {
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cf-user {
  display: flex;
  align-items: center;
  gap: 9px;
}

.cf-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  overflow: hidden;
  flex-shrink: 0;
  transition: transform 0.3s var(--ease-spring);
}

.cf-card:hover .cf-avatar {
  transform: scale(1.1);
}

.cf-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cf-user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.cf-username {
  font-size: 13px;
  font-weight: 700;
  color: var(--c-text);
}

.cf-time {
  font-size: 11px;
  color: var(--c-text-muted);
}

.cf-mins {
  font-size: 11px;
  font-weight: 700;
  color: var(--c-text-muted);
  background: var(--c-border);
  padding: 3px 9px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.cf-text {
  font-size: 13px;
  color: var(--c-text-secondary);
  line-height: 1.55;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Actions */
.cf-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-top: 6px;
  border-top: 1px solid var(--c-border);
}

.cf-like,
.cf-comment,
.cf-share {
  display: flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
  color: var(--c-text-muted);
  transition: all 0.2s var(--ease-smooth);
  border-radius: var(--radius-sm);
  font-family: inherit;
}

.cf-like:hover,
.cf-comment:hover,
.cf-share:hover {
  background: var(--c-border);
  color: var(--c-text);
}

.cf-like.liked {
  color: var(--c-primary);
  background: var(--c-primary-soft);
}

.cf-like.liked svg {
  animation: heartBeat 0.5s var(--ease-spring);
}

/* Empty */
.cf-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 50px 20px;
  text-align: center;
  background: var(--c-bg-card);
  border: 2px dashed var(--c-border);
  border-radius: var(--radius-xl);
}

.cf-empty-icon {
  font-size: 36px;
  line-height: 1;
  animation: float 3s ease-in-out infinite;
}

.cf-empty-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--c-text);
  margin: 0;
}

.cf-empty-sub {
  font-size: 12px;
  color: var(--c-text-muted);
  margin: 0;
}

/* Responsive */
@media (max-width: 600px) {
  .cf-feed {
    grid-template-columns: 1fr;
  }
}
</style>