<template>
  <div class="dashboard-calendar">
    <h1>Calendario</h1>
    <p class="subtitle">Planifica tus actividades y desafíos</p>
    
    <div class="calendar-card">
      <div class="calendar-header">
        <button class="nav-btn"><font-awesome-icon icon="chevron-left" /></button>
        <h2>Marzo 2026</h2>
        <button class="nav-btn"><font-awesome-icon icon="chevron-right" /></button>
      </div>
      
      <div class="calendar-grid">
        <div class="day-header" v-for="day in ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']" :key="day">{{ day }}</div>
        <div 
          class="calendar-day" 
          v-for="day in calendarDays" 
          :key="day.date"
          :class="{ 
            'other-month': day.otherMonth, 
            'today': day.isToday,
            'has-event': day.hasEvent 
          }"
        >
          <span class="day-number">{{ day.dateNum }}</span>
          <span v-if="day.hasEvent" class="event-dot"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const generateCalendarDays = () => {
  const days = []
  const today = new Date()
  
  // Generate days for current month
  for (let i = 1; i <= 31; i++) {
    days.push({
      date: `2026-03-${i.toString().padStart(2, '0')}`,
      dateNum: i,
      otherMonth: false,
      isToday: i === today.getDate(),
      hasEvent: [5, 8, 12, 15, 20, 22, 28].includes(i)
    })
  }
  
  return days
}

const calendarDays = ref(generateCalendarDays())
</script>

<style scoped>
.dashboard-calendar {
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

.calendar-card {
  background: #fff;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.05);
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.calendar-header h2 {
  font-size: 20px;
  color: #1a1a2e;
}

.nav-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: none;
  background: #f5f5f5;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
}

.nav-btn:hover {
  background: #E08E6B;
  color: #fff;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.day-header {
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: #888;
  padding: 8px;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;
}

.calendar-day:hover {
  background: #f5f5f5;
}

.calendar-day.other-month {
  color: #ccc;
}

.calendar-day.today {
  background: #E08E6B;
  color: #fff;
}

.calendar-day.today:hover {
  background: #d07a5a;
}

.day-number {
  font-size: 14px;
  font-weight: 500;
}

.event-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #4CAF50;
  position: absolute;
  bottom: 8px;
}

.calendar-day.today .event-dot {
  background: #fff;
}
</style>
