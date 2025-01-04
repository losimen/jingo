<template>
  <main>
    <h1>Real-Time Audio to Black and White Image</h1>
    <button @click="startProcessing">Start Processing</button>
    <button @click="stopProcessing" :disabled="!isProcessing">Stop Processing</button>
    <svg ref="svg" xmlns="http://www.w3.org/2000/svg"></svg>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { transform, fftfreq } from './fft_small'

const svg = ref<SVGSVGElement | null>(null)
const isProcessing = ref(false)

let audioContext: AudioContext | null = null
let processor: ScriptProcessorNode | null = null
let source: MediaStreamAudioSourceNode | null = null

function startProcessing() {
  if (isProcessing.value) return

  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      audioContext = new AudioContext()
      source = audioContext.createMediaStreamSource(stream)
      processor = audioContext.createScriptProcessor(2048, 1, 1)

      processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer.getChannelData(0)
        processAudioChunk(inputBuffer, audioContext!.sampleRate)
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      isProcessing.value = true
    })
    .catch((err) => {
      console.error('Error accessing microphone:', err)
    })
}

function stopProcessing() {
  if (processor) {
    processor.disconnect()
    processor = null
  }

  if (source) {
    source.disconnect()
    source = null
  }

  if (audioContext) {
    audioContext.close()
    audioContext = null
  }

  isProcessing.value = false
}

function processAudioChunk(signal: Float32Array, sampleRate: number) {
  const CHUNK_SIZE = 2048

  const real = Float64Array.from(signal)
  const imag = new Float64Array(real.length).fill(0)

  transform(real, imag)

  const magnitude = Array.from(real.map((re, idx) => Math.sqrt(re ** 2 + imag[idx] ** 2)))
  const frequencies = fftfreq(real.length, 1 / sampleRate)

  const halfLength = Math.floor(magnitude.length / 2)
  const maxIndex = magnitude
    .slice(0, halfLength)
    .indexOf(Math.max(...magnitude.slice(0, halfLength)))
  const dominantFreq = frequencies[maxIndex]

  updateSVG(dominantFreq)
}

let currentRow = 0 // Keeps track of the current row

function updateSVG(freq: number) {
  if (!svg.value) {
    console.error('SVG element not found.')
    return
  }

  function freqToPixel(freq: number) {
    return Math.floor(((freq - 1500) / 800) * 255)
  }

  const pixelValue = Math.max(0, Math.min(255, freqToPixel(freq)))

  // Check for 1200 Hz frequency
  if (freq > 1100 && freq < 1400) {
    currentRow++ // Start a new row
  }

  const rectWidth = 2
  const rectHeight = 2

  const currentRects = svg.value.querySelectorAll('rect')
  const width = Math.sqrt(currentRects.length + 1)

  const x = currentRects.length % width // Keep X aligned within the row
  const y = currentRow * rectHeight // Update Y based on the current row

  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  rect.setAttribute('x', (x * rectWidth).toString())
  rect.setAttribute('y', y.toString())
  rect.setAttribute('width', rectWidth.toString())
  rect.setAttribute('height', rectHeight.toString())
  rect.setAttribute('fill', `rgb(${pixelValue}, ${pixelValue}, ${pixelValue})`)

  svg.value.appendChild(rect)
}
</script>

<style>
main {
  text-align: center;
  margin-top: 2rem;
}

svg {
  border: 1px solid #ccc;
  margin-top: 1rem;
  display: block;
  margin: 0 auto;
}
</style>
