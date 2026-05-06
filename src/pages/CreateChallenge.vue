<script setup>
import inicioImage from '../assets/inicio.png'

const props = defineProps({
  show: Boolean
})

const emit = defineEmits(['close', 'signin'])
</script>

<template>
  <div v-if="show" class="overlay" @click.self="$emit('close')" role="dialog" aria-modal="true" aria-labelledby="planning-title">
    <div class="modal">
      <!-- Marco decorativo con shadow -->
      <div class="color-shade top-shade"></div>
      <div class="color-shade bottom-shade"></div>
      
      <button class="close" @click="$emit('close')" aria-label="Cerrar modal">✕</button>

      <h2 id="planning-title">Start your plan free in minutes</h2>
      <p>Organiza tu día, crea hábitos y empieza tu reto de 30 días con HobitGo.</p>

      <!-- Botones -->
      <div class="actions">
        <button class="btn-primary" @click="$emit('signin')">Plan in browser</button>
        <div class="btn-secondary-container">
          <button class="btn-secondary">
            <font-awesome-icon class="icon" :icon="['fab', 'apple']" />
            iOS
          </button>
          <button class="btn-secondary">
            <font-awesome-icon class="icon" :icon="['fab', 'android']" />
            Android
          </button>
        </div>
      </div>

      <!-- Imagen en corner -->
      <div class="corner-image">
        <img :src="inicioImage" alt="HobitGo Preview" class="preview-image" />
      </div>

      <!-- QR Code -->
      <div class="qr-section">
        <div class="qr-container">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://hobitgo.com/app" alt="QR Code" class="qr-image" />
        </div>
        <p class="qr-text">Escanea para empezar desde tu móvil</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: #fff;
  padding: 40px;
  padding-top: 60px;
  padding-bottom: 340px;
  width: 700px;
  max-width: 95vw;
  max-height: 85vh;
  border-radius: 20px;
  position: relative;
  text-align: center;
  /* Borde atractivo con gradiente y glow */
  border: 2px solid transparent;
  background-clip: padding-box;
  box-shadow: 
    0 10px 40px rgba(0,0,0,0.1),
    0 0 0 1px rgba(224, 142, 107, 0.1),
    0 0 30px rgba(224, 142, 107, 0.15),
    inset 0 0 60px rgba(224, 142, 107, 0.03);
  overflow: hidden;
  position: relative;
}

/* Borde decorativo alrededor del modal */
.modal::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 22px;
  background: linear-gradient(135deg, #E08E6B 0%, #f5a882 50%, #E08E6B 100%);
  z-index: -1;
  opacity: 0.6;
}

.modal::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
  padding: 2px;
  background: linear-gradient(135deg, rgba(224, 142, 107, 0.8), rgba(245, 168, 130, 0.6), rgba(224, 142, 107, 0.8));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

/* Marco decorativo con shadow de color */
.color-shade {
  position: absolute;
  left: 30px;
  right: 30px;
  height: 4px;
  border-radius: 2px;
}

.top-shade {
  top: 20px;
  background: linear-gradient(90deg, transparent, #E08E6B, transparent);
  box-shadow: 0 0 20px rgba(224, 142, 107, 0.5);
}

.bottom-shade {
  bottom: 60px;
  background: linear-gradient(90deg, transparent, #E08E6B, transparent);
  box-shadow: 0 0 20px rgba(224, 142, 107, 0.5);
}

/* QR Section */
.qr-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px dashed #e0e0e0;
}

.qr-container {
  display: inline-block;
  padding: 15px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border: 2px solid #f0f0f0;
}

.qr-image {
  width: 120px;
  height: 120px;
  display: block;
}

.qr-text {
  margin-top: 12px;
  font-size: 14px;
  color: #666;
  font-weight: 500;
  margin-left: 12px;
}

.extras {
  margin-top: 20px;
  font-size: 13px;
  color: #555;
}

.close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: transparent;
  border: none;
  font-size: 20px;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.close:hover {
  opacity: 0.7;
}

.calendar {
  margin: 20px 0;
  text-align: left;
}

.image-container {
  margin: 20px 0;
  position: relative;
}

.corner-image {
  position: absolute;
  bottom: 60px;
  left: 30px;
  width: 180px;
  z-index: 10;
}

.corner-image .preview-image {
  width: 100%;
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
  transform: rotate(-8deg);
}

.preview-image {
  width: 100%;
  max-width: 320px;
  border-radius: 16px;
  display: block;
  margin: 0 auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.image-shape {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: calc(100% - 20px);
  max-width: 320px;
  height: 20px;
  background: rgba(224, 142, 107, 0.3);
  border-radius: 50%;
  filter: blur(20px);
  z-index: 0;
}

.actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
}

.actions .btn-primary {
  width: 100%;
  max-width: 300px;
}

.actions .btn-secondary-container {
  display: flex;
  gap: 12px;
  width: 100%;
  max-width: 300px;
}

.actions .btn-secondary-container .btn-secondary {
  flex: 1;
}

.btn-primary {
  background: linear-gradient(135deg, #E08E6B 0%, #f5a882 100%);
  color: #fff;
  padding: 16px 32px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 16px;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(224, 142, 107, 0.4);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(224, 142, 107, 0.5);
}

.btn-secondary {
  background: #f8f8f8;
  padding: 14px 24px;
  border-radius: 12px;
  font-weight: 500;
  font-size: 14px;
  border: 1px solid #e0e0e0;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-secondary:hover {
  background: #fff;
  border-color: #ccc;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.btn-secondary .icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.btn-secondary .icon.fa-android {
  color: #333333;
}

/* Responsive: mobile and small screens */
@media (max-width: 600px) {
  .modal {
    padding-bottom: 220px !important;
  }
  
  .corner-image {
    display: block;
    position: absolute;
    bottom: 10px;
    left: 15px;
    width: 90px;
  }
  
  .corner-image .preview-image {
    transform: rotate(-8deg);
    width: 100%;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  }
  
  .qr-section {
    display: none;
  }
}

.btn-secondary .icon-text {
  font-weight: bold;
  font-size: 16px;
}

.extras {
  margin-top: 20px;
  font-size: 13px;
  color: #555;
}
</style>