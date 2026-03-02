<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  duration: {
    type: Number,
    default: 30
  },
  category: {
    type: String,
    default: 'general'
  },
  difficulty: {
    type: String,
    default: 'medium'
  },
  participants: {
    type: Number,
    default: 0
  },
  image: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <div class="challenge-card">
    <div class="card-image" v-if="image">
      <img :src="image" :alt="title" />
    </div>
    <div class="card-content">
      <div class="card-header">
        <span class="category-badge">{{ category }}</span>
        <span class="difficulty-badge" :class="difficulty">{{ difficulty }}</span>
      </div>
      
      <h3 class="card-title">{{ title }}</h3>
      <p class="card-description" v-if="description">{{ description }}</p>
      
      <div class="card-footer">
        <div class="duration">
          <span class="icon">📅</span>
          <span>{{ duration }} días</span>
        </div>
        <div class="participants" v-if="participants > 0">
          <span class="icon">👥</span>
          <span>{{ participants }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.challenge-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
}

.challenge-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.card-image {
  height: 160px;
  overflow: hidden;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-content {
  padding: 20px;
}

.card-header {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.category-badge {
  background: #f0f0f0;
  color: #666;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  text-transform: capitalize;
}

.difficulty-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.difficulty-badge.easy {
  background: #e8f5e9;
  color: #2e7d32;
}

.difficulty-badge.medium {
  background: #fff3e0;
  color: #ef6c00;
}

.difficulty-badge.hard {
  background: #ffebee;
  color: #c62828;
}

.card-title {
  margin: 0 0 8px;
  font-size: 18px;
  color: #1a1a1a;
}

.card-description {
  margin: 0 0 16px;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.card-footer {
  display: flex;
  gap: 16px;
  color: #888;
  font-size: 14px;
}

.card-footer .icon {
  margin-right: 4px;
}
</style>
