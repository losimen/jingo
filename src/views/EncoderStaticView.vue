<template>
  <main>
    <h1>Img to Audio Encoder</h1>
    <input type="file" @change="handleImageUpload" accept="image/png, image/jpeg" />
    <canvas ref="canvas" width="500" height="500" style="border: 1px solid black"></canvas>
    <button v-if="audioUrl" @click="downloadAudio">Download Audio</button>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { SoundGenerator } from './soundGenerator'

const DURATION_PER_TONE = 10
const audioUrl = ref<string | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)

async function handleImageUpload(event: Event) {
  const input = event.target as HTMLInputElement

  if (!input.files || input.files.length === 0) {
    alert('Please upload a valid image.')
    return
  }

  const file = input.files[0]

  const img = await createImageFromFile(file)

  if (canvas.value) {
    const context = canvas.value.getContext('2d')
    if (!context) throw new Error('Could not get 2D context from canvas.')

    canvas.value.width = img.width
    canvas.value.height = img.height
    context.drawImage(img, 0, 0)

    const imgData = context.getImageData(0, 0, canvas.value.width, canvas.value.height)

    const allHzValues: number[] = []
    for (let y = 0; y < imgData.height; y++) {
      const row = []
      for (let x = 0; x < imgData.width; x++) {
        const index = (y * imgData.width + x) * 4
        const pixel = imgData.data[index]
        row.push(pixel)
      }

      const hzRow = convertToHerz(row)
      allHzValues.push(...hzRow)
    }

    const soundGenerator = new SoundGenerator()
    soundGenerator.appendSinewaves(allHzValues, DURATION_PER_TONE)
    const outputWaveName = 'output.wav'
    const b = soundGenerator.saveWav(outputWaveName)

    audioUrl.value = b
    console.log('Audio generated and ready for download.')
  }
}

function createImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = () => {
      img.src = reader.result as string
      img.onload = () => resolve(img)
      img.onerror = (err) => reject(err)
    }

    reader.onerror = (err) => reject(err)

    reader.readAsDataURL(file)
  })
}

function convertToHerz(pixelRow: number[]): number[] {
  const result = [1200]
  for (const pixel of pixelRow) {
    const freq = 1500 + (pixel / 255) * 800
    result.push(freq)
  }
  return result
}

function downloadAudio() {
  if (!audioUrl.value) return

  const link = document.createElement('a')
  link.href = audioUrl.value
  link.download = 'output.wav'
  link.click()
}
</script>

<style>
main {
  text-align: center;
  margin-top: 2rem;
}

canvas {
  margin-top: 1rem;
}
</style>
