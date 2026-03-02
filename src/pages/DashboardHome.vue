<template>
  <div class="dashboard-home">
    <h1>Bienvenido a HobitGo</h1>
    <p class="subtitle">Tu espacio personal de desafíos y hobbies</p>
    
    <!-- Stats Overview -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon challenges">
          <font-awesome-icon icon="trophy" />
        </div>
        <div class="stat-info">
          <span class="stat-value">12</span>
          <span class="stat-label">Desafíos activos</span>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon hobbies">
          <font-awesome-icon icon="heart" />
        </div>
        <div class="stat-info">
          <span class="stat-value">8</span>
          <span class="stat-label">Hobbies</span>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon streak">
          <font-awesome-icon icon="fire" />
        </div>
        <div class="stat-info">
          <span class="stat-value">15</span>
          <span class="stat-label">Días de racha</span>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon points">
          <font-awesome-icon icon="star" />
        </div>
        <div class="stat-info">
          <span class="stat-value">2,450</span>
          <span class="stat-label">Puntos</span>
        </div>
      </div>
    </div>
    
    <!-- Recent Activity -->
    <div class="recent-section">
      <h2>Actividad reciente</h2>
      <div class="activity-list">
        <div class="activity-item">
          <div class="activity-icon">
            <font-awesome-icon icon="check" />
          </div>
          <div class="activity-content">
            <p class="activity-title">Completaste "Leer 30 minutos"</p>
            <span class="activity-time">Hace 2 horas</span>
          </div>
          <span class="activity-points">+50 pts</span>
        </div>
        
        <div class="activity-item">
          <div class="activity-icon">
            <font-awesome-icon icon="heart" />
          </div>
          <div class="activity-content">
            <p class="activity-title">Nuevo hobby: "Pintura"</p>
            <span class="activity-time">Ayer</span>
          </div>
          <span class="activity-points">+100 pts</span>
        </div>
        
        <div class="activity-item">
          <div class="activity-icon">
            <font-awesome-icon icon="trophy" />
          </div>
          <div class="activity-content">
            <p class="activity-title">Desafío completado: "30 días de meditación"</p>
            <span class="activity-time">Hace 3 días</span>
          </div>
          <span class="activity-points">+500 pts</span>
        </div>
      </div>
    </div>
    
    <!-- Quick Actions -->
    <div class="quick-actions">
      <button class="action-btn primary">
        <font-awesome-icon icon="plus" />
        Nuevo desafío
      </button>
      <button class="action-btn secondary">
        <font-awesome-icon icon="heart" />
        Añadir hobby
      </button>
    </div>
  </div>
</template>

<style scoped>
.dashboard-home {
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.stat-icon.challenges {
  background: #fff3e0;
  color: #ff9800;
}

.stat-icon.hobbies {
  background: #fce4ec;
  color: #e91e63;
}

.stat-icon.streak {
  background: #fff8e1;
  color: #ffc107;
}

.stat-icon.points {
  background: #e8f5e9;
  color: #4caf50;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a2e;
}

.stat-label {
  font-size: 13px;
  color: #666;
}

.recent-section {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.recent-section h2 {
  font-size: 18px;
  color: #1a1a2e;
  margin-bottom: 20px;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border-radius: 12px;
  background: #f9f9f9;
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #E08E6B;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.activity-content {
  flex: 1;
}

.activity-title {
  font-size: 14px;
  color: #1a1a2e;
  margin: 0 0 4px;
}

.activity-time {
  font-size: 12px;
  color: #888;
}

.activity-points {
  font-size: 14px;
  font-weight: 600;
  color: #4caf50;
}

.quick-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.action-btn.primary {
  background: #E08E6B;
  color: #fff;
}

.action-btn.primary:hover {
  background: #d07a5a;
}

.action-btn.secondary {
  background: #fff;
  color: #1a1a2e;
  border: 2px solid #e0e0e0;
}

.action-btn.secondary:hover {
  border-color: #E08E6B;
  color: #E08E6B;
}
</style>
