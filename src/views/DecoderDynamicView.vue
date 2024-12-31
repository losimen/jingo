<template>
  <main>
    <h1>Decoder Audio Processing</h1>
    <button @click="startAudio">Start Audio</button>
    <button @click="stopAudio" :disabled="!isStreaming">Stop Audio</button>
    <canvas ref="canvasDominant" width="800" height="300"></canvas>
    <canvas ref="canvasFFT" width="800" height="300"></canvas>
  </main>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const isStreaming = ref(false)
const canvasDominant = ref<HTMLCanvasElement | null>(null)
const canvasFFT = ref<HTMLCanvasElement | null>(null)
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
  if (!canvasDominant.value || !analyser || !dataArray) return

  const ctx = canvasDominant.value.getContext('2d')
  if (!ctx) return

  function draw() {
    if (
      !analyser ||
      !dataArray ||
      !isStreaming.value ||
      !canvasDominant.value ||
      !ctx ||
      !audioContext
    )
      return

    analyser.getByteFrequencyData(dataArray)

    ctx.clearRect(0, 0, canvasDominant.value.width, canvasDominant.value.height)

    ctx.fillStyle = '#00ff00'
    const barWidth = canvasDominant.value.width / dataArray.length

    let maxAmplitude = 0
    let dominantFrequencyIndex = 0

    for (let i = 0; i < dataArray.length; i++) {
      const barHeight = dataArray[i]
      ctx.fillRect(i * barWidth, canvasDominant.value.height - barHeight, barWidth, barHeight)

      if (dataArray[i] > maxAmplitude) {
        maxAmplitude = dataArray[i]
        dominantFrequencyIndex = i
      }
    }

    const nyquist = audioContext.sampleRate / 2
    const dominantFrequency = (dominantFrequencyIndex / dataArray.length) * nyquist

    ctx.fillStyle = '#ffffff'
    ctx.font = '16px Arial'
    ctx.fillText(`Dominant Frequency: ${dominantFrequency.toFixed(2)} Hz`, 10, 20)

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
