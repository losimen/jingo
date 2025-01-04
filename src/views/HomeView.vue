<template>
  <main>
    <h1>Real-Time Audio Processing</h1>
    <button @click="startAudio">Start Audio</button>
    <button @click="stopAudio" :disabled="!isStreaming">Stop Audio</button>
    <canvas ref="canvas" width="800" height="300"></canvas>

    <router-link to="encoder-static"> Encoder Static </router-link>
    <router-link to="decoder-static"> Decoder Static </router-link>
    <router-link to="decoder-dynamic"> Decoder Dynamic </router-link>
  </main>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const isStreaming = ref(false)
const canvas = ref<HTMLCanvasElement | null>(null)
let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let dataArray: Uint8Array | null = null
let animationFrameId: number | null = null

function startAudio() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Your browser does not support audio input.')
    return
  }

  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      isStreaming.value = true

      audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      dataArray = new Uint8Array(analyser.frequencyBinCount)

      source.connect(analyser)

      visualize()
    })
    .catch((error) => {
      console.error('Error accessing audio input:', error)
    })
}

function stopAudio() {
  if (audioContext) {
    audioContext.close()
    audioContext = null
  }
  isStreaming.value = false
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

function visualize() {
  if (!canvas.value || !analyser || !dataArray) return

  const ctx = canvas.value.getContext('2d')
  if (!ctx) return

  function draw() {
    if (!analyser || !dataArray || !isStreaming.value || !ctx || !canvas.value) return

    analyser.getByteTimeDomainData(dataArray)

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)

    // Draw waveform
    ctx.lineWidth = 2
    ctx.strokeStyle = '#00ff00'
    ctx.beginPath()

    const sliceWidth = canvas.value.width / dataArray.length
    let x = 0

    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 128.0
      const y = (v * canvas.value.height) / 2

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }

      x += sliceWidth
    }

    ctx.lineTo(canvas.value.width, canvas.value.height / 2)
    ctx.stroke()

    animationFrameId = requestAnimationFrame(draw)
  }

  draw()
}

onUnmounted(() => {
  stopAudio()
})
</script>

<style>
main {
  text-align: center;
  margin-top: 2rem;
}

canvas {
  border: 1px solid #ccc;
  margin-top: 1rem;
}
</style>
