<template>
  <div class="dashboard-chat">
    <h1>Chat</h1>
    <p class="subtitle">Conecta con la comunidad</p>
    
    <div class="chat-container">
      <div class="chat-list">
        <div class="chat-item active">
          <div class="chat-avatar">M</div>
          <div class="chat-info">
            <h4>Maria García</h4>
            <p>¡Hola! ¿Cómo va tu desafío?</p>
          </div>
          <span class="chat-time">2m</span>
        </div>
        
        <div class="chat-item">
          <div class="chat-avatar">J</div>
          <div class="chat-info">
            <h4>Juan Pérez</h4>
            <p>Vamos a empezar juntos</p>
          </div>
          <span class="chat-time">1h</span>
        </div>
        
        <div class="chat-item">
          <div class="chat-avatar">C</div>
          <div class="chat-info">
            <h4>Comunidad HobitGo</h4>
            <p>Nuevo desafío disponible</p>
          </div>
          <span class="chat-time">3h</span>
        </div>
      </div>
      
      <div class="chat-room">
        <div class="chat-header">
          <h3>Maria García</h3>
        </div>
        
        <div class="messages">
          <div class="message received">
            <p>¡Hola! ¿Cómo va tu desafío de lectura?</p>
            <span class="time">10:30</span>
          </div>
          <div class="message sent">
            <p>¡Muy bien! Ya llevo 15 días</p>
            <span class="time">10:32</span>
          </div>
          <div class="message received">
            <p>¡Eso es genial! Yo apenas voy por el día 7</p>
            <span class="time">10:35</span>
          </div>
        </div>
        
        <div class="message-input">
          <input type="text" placeholder="Escribe un mensaje..." />
          <button class="send-btn">
            <font-awesome-icon icon="paper-plane" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-chat {
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

.chat-container {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
  height: calc(100vh - 200px);
}

.chat-list {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.chat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.chat-item:hover, .chat-item.active {
  background: #f5f5f5;
}

.chat-item.active {
  border-left: 3px solid #E08E6B;
}

.chat-avatar {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #E08E6B;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 18px;
}

.chat-info {
  flex: 1;
}

.chat-info h4 {
  font-size: 14px;
  color: #1a1a2e;
  margin: 0 0 4px;
}

.chat-info p {
  font-size: 13px;
  color: #888;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.chat-time {
  font-size: 12px;
  color: #aaa;
}

.chat-room {
  background: #fff;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.chat-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.chat-header h3 {
  font-size: 18px;
  color: #1a1a2e;
  margin: 0;
}

.messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 16px;
}

.message.received {
  background: #f5f5f5;
  align-self: flex-start;
  border-bottom-left-radius: 4px;
}

.message.sent {
  background: #E08E6B;
  color: #fff;
  align-self: flex-end;
  border-bottom-right-radius: 4px;
}

.message p {
  margin: 0 0 4px;
  font-size: 14px;
}

.message .time {
  font-size: 11px;
  opacity: 0.7;
}

.message-input {
  padding: 16px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 12px;
}

.message-input input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #eee;
  border-radius: 24px;
  font-size: 14px;
  outline: none;
}

.message-input input:focus {
  border-color: #E08E6B;
}

.send-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #E08E6B;
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
}

.send-btn:hover {
  background: #d07a5a;
}

@media (max-width: 768px) {
  .chat-container {
    grid-template-columns: 1fr;
  }
  
  .chat-list {
    display: none;
  }
}
</style>
