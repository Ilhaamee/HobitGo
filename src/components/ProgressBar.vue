<script setup>
import { computed } from 'vue'

const props = defineProps({
  current: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    default: 30
  },
  showLabel: {
    type: Boolean,
    default: true
  },
  size: {
    type: String,
    default: 'medium'
  },
  color: {
    type: String,
    default: 'primary'
  }
})

const percentage = computed(() => {
  return Math.min(100, Math.round((props.current / props.total) * 100))
})
</script>

<template>
  <div class="progress-container" :class="size">
    <div class="progress-bar" v-if="showLabel">
      <div class="progress-info">
        <span class="progress-label">Progreso</span>
        <span class="progress-value">{{ current }}/{{ total }} días</span>
      </div>
    </div>
    
    <div class="progress-track">
      <div 
        class="progress-fill" 
        :class="color"
        :style="{ width: percentage + '%' }"
      ></div>
    </div>
    
    <div class="progress-percentage" v-if="showLabel">
      {{ percentage }}%
    </div>
  </div>
</template>

<style scoped>
.progress-container {
  width: 100%;
}

.progress-container.small .progress-track {
  height: 6px;
}

.progress-container.medium .progress-track {
  height: 10px;
}

.progress-container.large .progress-track {
  height: 16px;
}

.progress-bar {
  margin-bottom: 8px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.progress-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.progress-value {
  font-size: 14px;
  color: #333;
  font-weight: 600;
}

.progress-track {
  background: #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 10px;
  transition: width 0.5s ease;
}

.progress-fill.primary {
  background: linear-gradient(90deg, #E08E6B, #f5a882);
}

.progress-fill.success {
  background: linear-gradient(90deg, #4CAF50, #81c784);
}

.progress-fill.warning {
  background: linear-gradient(90deg, #ff9800, #ffb74d);
}

.progress-fill.info {
  background: linear-gradient(90deg, #2196F3, #64b5f6);
}

.progress-percentage {
  text-align: right;
  font-size: 12px;
  color: #888;
  margin-top: 4px;
}
</style>
