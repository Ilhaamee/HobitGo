<script setup>
defineProps({
  points: {
    type: Number,
    required: true
  },
  label: {
    type: String,
    default: 'puntos'
  },
  size: {
    type: String,
    default: 'medium'
  },
  showIcon: {
    type: Boolean,
    default: true
  },
  trend: {
    type: String,
    default: null // 'up', 'down', null
  }
})
</script>

<template>
  <div class="points-badge" :class="size">
    <span class="points-icon" v-if="showIcon">⭐</span>
    <span class="points-value">{{ points.toLocaleString() }}</span>
    <span class="points-label">{{ label }}</span>
    <span class="points-trend up" v-if="trend === 'up'">↑</span>
    <span class="points-trend down" v-if="trend === 'down'">↓</span>
  </div>
</template>

<style scoped>
.points-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
  padding: 8px 16px;
  border-radius: 24px;
  border: 2px solid #ffc107;
}

.points-badge.small {
  padding: 4px 10px;
  font-size: 12px;
}

.points-badge.medium {
  padding: 8px 16px;
  font-size: 14px;
}

.points-badge.large {
  padding: 12px 24px;
  font-size: 18px;
}

.points-icon {
  font-size: 1.2em;
}

.points-value {
  font-weight: 700;
  color: #f57c00;
}

.points-label {
  color: #795548;
  font-weight: 500;
}

.points-trend {
  font-weight: bold;
  margin-left: 4px;
}

.points-trend.up {
  color: #4CAF50;
}

.points-trend.down {
  color: #f44336;
}
</style>
