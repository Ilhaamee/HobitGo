<template>
  <div class="posts-wrap">

    <PostCreate
      v-if="isOwner"
      ref="postCreateRef"
      :avatar-url="avatarUrl"
      :username="username"
      :hobbies="hobbies"
      :streak="streak"
      :sessions="sessions"
      :submitting="submitting"
      @submit="onSubmit"
    />

    <div v-if="!isOwner && !isPublic" class="private-state">
      <div class="private-icon">🔒</div>
      <p class="empty-title">Perfil privado</p>
      <p class="empty-sub">Este usuario aún no ha compartido nada</p>
    </div>

    <template v-else-if="isOwner || isPublic">

      <div v-if="posts.length === 0" class="empty-state">
        <div class="empty-rings">
          <div class="er er1"></div>
          <div class="er er2"></div>
          <div class="er er3"></div>
          <span>✦</span>
        </div>
        <p class="empty-title">Tu diario está vacío</p>
        <p class="empty-sub">Comparte tu primera sesión y empieza a inspirar</p>
      </div>

      <div v-else class="feed">
        <div class="post-featured">
          <PostCard
            :post="posts[0]"
            featured
            :is-owner="isOwner"
            :current-user="currentUser"
            @like="onLike"
            @delete="onDelete"
            @edit="$emit('edit', $event)"
            @comment-count="onCommentCount"
          />
        </div>
        <div v-if="posts.length > 1" class="post-grid">
          <PostCard
            v-for="post in posts.slice(1)"
            :key="post.id"
            :post="post"
            :is-owner="isOwner"
            :current-user="currentUser"
            @like="onLike"
            @delete="onDelete"
            @edit="$emit('edit', $event)"
            @comment-count="onCommentCount"
          />
        </div>
      </div>

    </template>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import PostCreate from './PostCreate.vue'
import PostCard   from './PostCard.vue'

const props = defineProps({
  posts:       { type: Array,   default: () => [] },
  avatarUrl:   { type: String,  default: '' },
  username:    { type: String,  default: '' },
  hobbies:     { type: Array,   default: () => [] },
  streak:      { type: Number,  default: 0 },
  submitting:  { type: Boolean, default: false },
  isOwner:     { type: Boolean, default: true },
  sessions:    { type: Array,   default: () => [] },
  isPublic:    { type: Boolean, default: true },
  currentUser: { type: Object,  default: null },
})

const emit = defineEmits(['submit', 'like', 'delete', 'edit', 'comment-count'])

const postCreateRef = ref(null)

function onSubmit(data)       { emit('submit', data) }
function onLike(id)           { emit('like', id) }
function onDelete(id)         { emit('delete', id) }
function onCommentCount(data) { emit('comment-count', data) }
</script>

<style scoped>
.posts-wrap { display: flex; flex-direction: column; gap: 0; }

.empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 50px 20px; text-align: center; }
.empty-rings { position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }
.er { position: absolute; border-radius: 50%; border: 1.5px solid rgba(255,107,157,.2); animation: pulse 3s ease-in-out infinite; }
.er1 { width:36px; height:36px; }
.er2 { width:56px; height:56px; animation-delay:.4s; border-color:rgba(255,107,157,.13); }
.er3 { width:76px; height:76px; animation-delay:.8s; border-color:rgba(255,107,157,.07); }
@keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.05);opacity:.7} }
.empty-rings > span { font-size: 22px; color: #ff6b9d; position: relative; z-index: 1; }
.empty-title { font-size: 16px; font-weight: 800; color: #22284E; margin: 0; }
.empty-sub   { font-size: 13px; color: rgba(34,40,78,.4); margin: 0; }

.feed { display: flex; flex-direction: column; gap: 12px; }
.post-featured { width: 100%; }
.post-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }

@media (min-width: 1024px) {
  .post-grid { grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .feed { gap: 20px; }
}
@media (min-width: 1400px) {
  .post-grid { grid-template-columns: repeat(4, 1fr); gap: 24px; }
}

.private-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 60px 20px; text-align: center; }
.private-icon { font-size: 40px; }
</style>