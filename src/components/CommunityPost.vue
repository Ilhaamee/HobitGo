<script setup>
defineProps({
  username: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: ''
  },
  challenge: {
    type: String,
    required: true
  },
  day: {
    type: Number,
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: ''
  },
  likes: {
    type: Number,
    default: 0
  },
  comments: {
    type: Number,
    default: 0
  },
  timeAgo: {
    type: String,
    default: 'ahora'
  }
})
</script>

<template>
  <div class="community-post">
    <div class="post-header">
      <div class="user-avatar">
        <img v-if="avatar" :src="avatar" :alt="username" />
        <span v-else class="avatar-placeholder">{{ username.charAt(0).toUpperCase() }}</span>
      </div>
      <div class="user-info">
        <span class="username">{{ username }}</span>
        <span class="challenge-info">{{ challenge }} - Día {{ day }}</span>
      </div>
      <span class="time-ago">{{ timeAgo }}</span>
    </div>
    
    <div class="post-content" v-if="content">
      <p>{{ content }}</p>
    </div>
    
    <div class="post-image" v-if="image">
      <img :src="image" alt="Post image" />
    </div>
    
    <div class="post-stats">
      <button class="stat-button like">
        <span class="icon">❤️</span>
        <span>{{ likes }}</span>
      </button>
      <button class="stat-button comment">
        <span class="icon">💬</span>
        <span>{{ comments }}</span>
      </button>
      <button class="stat-button share">
        <span class="icon">🔗</span>
        <span>Compartir</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.community-post {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.post-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 20px;
  font-weight: 600;
  color: #666;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.username {
  font-weight: 600;
  color: #1a1a1a;
}

.challenge-info {
  font-size: 13px;
  color: #4CAF50;
  font-weight: 500;
}

.time-ago {
  font-size: 12px;
  color: #999;
}

.post-content {
  margin-bottom: 16px;
}

.post-content p {
  margin: 0;
  line-height: 1.6;
  color: #333;
}

.post-image {
  margin-bottom: 16px;
  border-radius: 12px;
  overflow: hidden;
}

.post-image img {
  width: 100%;
  display: block;
}

.post-stats {
  display: flex;
  gap: 16px;
  border-top: 1px solid #eee;
  padding-top: 12px;
}

.stat-button {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.stat-button:hover {
  background: #f5f5f5;
}

.stat-button .icon {
  font-size: 16px;
}
</style>
