<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import Matter from 'matter-js'

const props = defineProps({
  text:                    { type: String,  default: '' },
  highlightWords:          { type: Array,   default: () => [] },
  highlightClass:          { type: String,  default: 'highlighted' },
  trigger:                 { type: String,  default: 'auto' },   
  backgroundColor:         { type: String,  default: 'transparent' },
  wireframes:              { type: Boolean, default: false },
  gravity:                 { type: Number,  default: 1 },
  mouseConstraintStiffness:{ type: Number,  default: 0.2 },
  fontSize:                { type: String,  default: '1rem' },
})

const containerRef      = ref(null)
const textRef           = ref(null)
const canvasContainerRef= ref(null)
const effectStarted     = ref(false)

function renderWords() {
  if (!textRef.value) return
  const words = props.text.split(' ')
  textRef.value.innerHTML = words.map(word => {
    const isHighlighted = props.highlightWords.some(hw => word.startsWith(hw))
    return `<span class="fall-word ${isHighlighted ? props.highlightClass : ''}">${word}</span>`
  }).join(' ')
}

let engine, render, runner, rafId, observer

function startEffect() {
  if (!containerRef.value || !textRef.value || !canvasContainerRef.value) return

  const { Engine, Render, World, Bodies, Runner, Mouse, MouseConstraint } = Matter

  const rect   = containerRef.value.getBoundingClientRect()
  const width  = rect.width
  const height = rect.height
  if (width <= 0 || height <= 0) return

  engine = Engine.create()
  engine.world.gravity.y = props.gravity

  render = Render.create({
    element: canvasContainerRef.value,
    engine,
    options: {
      width,
      height,
      background:  props.backgroundColor,
      wireframes:  props.wireframes,
    }
  })

  const wall = { isStatic: true, render: { fillStyle: 'transparent' } }
  const floor      = Bodies.rectangle(width / 2, height + 25, width, 50, wall)
  const leftWall   = Bodies.rectangle(-25,        height / 2, 50, height, wall)
  const rightWall  = Bodies.rectangle(width + 25, height / 2, 50, height, wall)
  const ceiling    = Bodies.rectangle(width / 2, -25,         width, 50,  wall)

  const wordSpans  = textRef.value.querySelectorAll('.fall-word')
  const wordBodies = [...wordSpans].map(elem => {
    const r = elem.getBoundingClientRect()
    const x = r.left - rect.left + r.width  / 2
    const y = r.top  - rect.top  + r.height / 2

    const body = Bodies.rectangle(x, y, r.width, r.height, {
      render:     { fillStyle: 'transparent' },
      restitution: 0.8,
      frictionAir: 0.01,
      friction:    0.2,
    })
    Matter.Body.setVelocity(body, { x: (Math.random() - 0.5) * 5, y: 0 })
    Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.05)
    return { elem, body }
  })

  wordBodies.forEach(({ elem, body }) => {
    elem.style.position = 'absolute'
    elem.style.left     = `${body.position.x}px`
    elem.style.top      = `${body.position.y}px`
    elem.style.transform= 'translate(-50%, -50%)'
  })

  const mouse           = Mouse.create(containerRef.value)
  const mouseConstraint = MouseConstraint.create(engine, {
    mouse,
    constraint: { stiffness: props.mouseConstraintStiffness, render: { visible: false } }
  })
  render.mouse = mouse

  World.add(engine.world, [
    floor, leftWall, rightWall, ceiling,
    mouseConstraint,
    ...wordBodies.map(wb => wb.body)
  ])

  runner = Runner.create()
  Runner.run(runner, engine)
  Render.run(render)

  const loop = () => {
    wordBodies.forEach(({ body, elem }) => {
      elem.style.left      = `${body.position.x}px`
      elem.style.top       = `${body.position.y}px`
      elem.style.transform = `translate(-50%, -50%) rotate(${body.angle}rad)`
    })
    rafId = requestAnimationFrame(loop)
  }
  loop()
}

function stopEffect() {
  if (rafId)  cancelAnimationFrame(rafId)
  if (render) {
    Matter.Render.stop(render)
    if (render.canvas && canvasContainerRef.value?.contains(render.canvas)) {
      canvasContainerRef.value.removeChild(render.canvas)
    }
  }
  if (runner) Matter.Runner.stop(runner)
  if (engine) {
    Matter.World.clear(engine.world)
    Matter.Engine.clear(engine)
  }
}

watch(effectStarted, (val) => { if (val) startEffect() })

function handleInteract() {
  if (!effectStarted.value && (props.trigger === 'click' || props.trigger === 'hover')) {
    effectStarted.value = true
  }
}

onMounted(() => {
  renderWords()

  if (props.trigger === 'auto') {
    effectStarted.value = true
    return
  }

  if (props.trigger === 'scroll' && containerRef.value) {
    observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        effectStarted.value = true
        observer.disconnect()
      }
    }, { threshold: 0.1 })
    observer.observe(containerRef.value)
  }
})

onUnmounted(() => {
  stopEffect()
  if (observer) observer.disconnect()
})
</script>

<template>
  <div
    ref="containerRef"
    class="falling-text-container"
    :style="{ position: 'relative', overflow: 'hidden' }"
    @click="trigger === 'click' ? handleInteract() : null"
    @mouseenter="trigger === 'hover' ? handleInteract() : null"
  >
    <div
      ref="textRef"
      class="falling-text-target"
      :style="{ fontSize, lineHeight: 1.4 }"
    />
    <div ref="canvasContainerRef" class="falling-text-canvas" />
  </div>
</template>

<style scoped>
.falling-text-container {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  cursor: default;
  text-align: center;
  padding-top: 2em;
}
.falling-text-target {
  display: inline-block;
}
.falling-text-canvas {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
}
</style>

<style>
.fall-word {
  display: inline-block;
  margin: 0 2px;
  user-select: none;
}
.highlighted {
  color: #22284E;
  font-weight: 900;
}
</style>