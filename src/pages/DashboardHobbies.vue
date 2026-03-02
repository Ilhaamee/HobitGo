<template>
  <div class="dashboard-hobbies">
    <h1>Mis Hobbies</h1>
    <p class="subtitle">Gestiona tus pasatiempos y actividades</p>
    
    <div class="hobbies-grid">
      <div class="hobby-card" v-for="hobby in hobbies" :key="hobby.id">
        <div class="hobby-icon" :style="{ background: hobby.color }">
          <font-awesome-icon :icon="hobby.icon" />
        </div>
        <div class="hobby-info">
          <h3>{{ hobby.name }}</h3>
          <p>{{ hobby.description }}</p>
          <div class="hobby-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: hobby.progress + '%', background: hobby.color }"></div>
            </div>
            <span>{{ hobby.progress }}%</span>
          </div>
        </div>
      </div>
    </div>
    
    <button class="add-hobby-btn">
      <font-awesome-icon icon="plus" />
      Añadir hobby
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const hobbies = ref([
  { id: 1, name: 'Lectura', description: 'Leer 30 minutos al día', icon: 'book', color: '#E91E63', progress: 75 },
  { id: 2, name: 'Pintura', description: 'Pintar cada fin de semana', icon: 'palette', color: '#9C27B0', progress: 45 },
  { id: 3, name: 'Ejercicio', description: '30 minutos de ejercicio', icon: 'dumbbell', color: '#2196F3', progress: 90 },
  { id: 4, name: 'Meditación', description: '10 minutos de meditación', icon: 'spa', color: '#4CAF50', progress: 60 }
])
</script>

<style scoped>
.dashboard-hobbies {
  max-width: 1000px;
  margin: 0 auto;
}

h1 {
  font-size: 28px;
  color: #1a1a2e;
  margin-bottom: 8px;
}

.subtitle {
  color: #666;
  margin-bottom: 32px;
}

.hobbies-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.hobby-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  gap: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.hobby-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #fff;
  flex-shrink: 0;
}

.hobby-info {
  flex: 1;
}

.hobby-info h3 {
  font-size: 16px;
  color: #1a1a2e;
  margin: 0 0 4px;
}

.hobby-info p {
  font-size: 13px;
  color: #666;
  margin: 0 0 12px;
}

.hobby-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.hobby-progress span {
  font-size: 13px;
  font-weight: 600;
  color: #666;
  min-width: 40px;
}

.add-hobby-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 16px;
  background: transparent;
  border: 2px dashed #ddd;
  border-radius: 16px;
  color: #888;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-hobby-btn:hover {
  border-color: #E08E6B;
  color: #E08E6B;
}
</style>
