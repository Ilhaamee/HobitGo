<script setup>
import { onMounted } from 'vue'

const props = defineProps({
  hobbyName: { type: String, required: true },
  points:    { type: Number, default: 10 },
  gifUrl:    { type: String, default: 'https://i.pinimg.com/originals/11/82/59/118259993924863bd3f6457da365e2ac.gif' },
})
const emit = defineEmits(['close'])

onMounted(() => {
  setTimeout(() => emit('close'), 5000)
})
</script>

<<template>
  <Transition name="celebrate">
    <div class="celebration-overlay" @click.self="emit('close')">
      <div class="celebration-card">
        <div class="gif-container">
          <img :src="gifUrl" alt="Celebración" class="celebration-gif" />
        </div>
        
        <h2 class="celebration-title">¡Reto completado!</h2>
        <p class="celebration-text">
          Has completado <strong>{{ hobbyName }}</strong>
        </p>
        
        <div class="points-badge">
          <span class="points-icon">✨</span>
          <span class="points-text">+{{ points }} pts</span>
        </div>
        
        <button class="celebration-close" @click="emit('close')">
          ¡Genial!
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.celebration-overlay {
  position: fixed; inset: 0;
  background: rgba(34,40,78,.6);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 4000;
  padding: 20px;
}
.celebration-card {
  background: #fff;
  border-radius: 28px;
  padding: 36px 32px;
  text-align: center;
  max-width: 340px;
  width: 100%;
  box-shadow: 0 24px 60px rgba(34,40,78,.25);
  animation: popIn 0.5s cubic-bezier(.4,0,.2,1);
}
@keyframes popIn {
  0% { transform: scale(.85); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.gif-container {
  width: 140px;
  height: 140px;
  margin: 0 auto 20px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  display: flex;
  align-items: center;
  justify-content: center;
}
.celebration-gif {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.celebration-title {
  font-size: 24px;
  font-weight: 900;
  color: #22284E;
  margin: 0 0 8px;
}
.celebration-text {
  font-size: 15px;
  color: rgba(34,40,78,.6);
  margin: 0 0 24px;
  line-height: 1.5;
}
.points-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
  color: #fff;
  padding: 12px 24px;
  border-radius: 99px;
  font-size: 18px;
  font-weight: 800;
  margin-bottom: 24px;
  box-shadow: 0 4px 16px rgba(245,158,11,.3);
  animation: pointsPulse 1.5s ease-in-out infinite;
}
@keyframes pointsPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
.points-icon { font-size: 22px; }

.celebration-close {
  width: 100%;
  padding: 14px;
  background: #22284E;
  color: #fff59e;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all .2s;
}
.celebration-close:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(34,40,78,.2);
}

.celebrate-enter-active, .celebrate-leave-active {
  transition: all .3s ease;
}
.celebrate-enter-from, .celebrate-leave-to {
  opacity: 0;
  transform: scale(.9);
}
</style>