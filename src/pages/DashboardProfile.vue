<template>
  <div class="dashboard-profile">
    <h1>Mi Perfil</h1>
    <p class="subtitle">Gestiona tu información personal</p>
    
    <div class="profile-header">
      <div class="profile-avatar">
        <img src="../assets/logo.png" alt="Profile" />
        <button class="edit-avatar">
          <font-awesome-icon icon="camera" />
        </button>
      </div>
      <div class="profile-info">
        <h2>Usuario HobitGo</h2>
        <p>usuario@email.com</p>
        <div class="profile-stats">
          <span><strong>12</strong> Desafíos completados</span>
          <span><strong>15</strong> Días de racha</span>
        </div>
      </div>
    </div>
    
    <div class="profile-sections">
      <div class="profile-section">
        <h3>Información personal</h3>
        <div class="form-group">
          <label>Nombre</label>
          <input type="text" value="Usuario HobitGo" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" value="usuario@email.com" />
        </div>
        <div class="form-group">
          <label>Biografía</label>
          <textarea placeholder="Cuéntanos sobre ti..."></textarea>
        </div>
        <button class="save-btn">Guardar cambios</button>
      </div>
      
      <div class="profile-section">
        <h3>Preferencias</h3>
        <div class="preference-item">
          <div>
            <h4>Notificaciones</h4>
            <p>Recibe recordatorios diario</p>
          </div>
          <label class="toggle">
            <input type="checkbox" checked />
            <span class="slider"></span>
          </label>
        </div>
        <div class="preference-item">
          <div>
            <h4>Newsletter</h4>
            <p>Recibe noticias semanales</p>
          </div>
          <label class="toggle">
            <input type="checkbox" />
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-profile {
  max-width: 800px;
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

.profile-header {
  display: flex;
  align-items: center;
  gap: 24px;
  background: #fff;
  padding: 32px;
  border-radius: 20px;
  margin-bottom: 32px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.profile-avatar {
  position: relative;
  width: 100px;
  height: 100px;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 20px;
  object-fit: cover;
}

.edit-avatar {
  position: absolute;
  bottom: -8px;
  right: -8px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #E08E6B;
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-info h2 {
  font-size: 24px;
  color: #1a1a2e;
  margin: 0 0 4px;
}

.profile-info p {
  color: #666;
  margin: 0 0 16px;
}

.profile-stats {
  display: flex;
  gap: 24px;
}

.profile-stats span {
  font-size: 14px;
  color: #666;
}

.profile-stats strong {
  color: #1a1a2e;
}

.profile-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.profile-section {
  background: #fff;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.profile-section h3 {
  font-size: 18px;
  color: #1a1a2e;
  margin: 0 0 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #eee;
  border-radius: 10px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: #E08E6B;
}

.form-group textarea {
  min-height: 100px;
  resize: vertical;
}

.save-btn {
  background: #E08E6B;
  color: #fff;
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.save-btn:hover {
  background: #d07a5a;
}

.preference-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid #eee;
}

.preference-item:last-child {
  border-bottom: none;
}

.preference-item h4 {
  font-size: 14px;
  color: #1a1a2e;
  margin: 0 0 4px;
}

.preference-item p {
  font-size: 13px;
  color: #888;
  margin: 0;
}

.toggle {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 28px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 28px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle input:checked + .slider {
  background-color: #E08E6B;
}

.toggle input:checked + .slider:before {
  transform: translateX(22px);
}
</style>
