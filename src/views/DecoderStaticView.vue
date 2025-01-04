<template>
  <main>
    <h1>Audio to Black and White Image</h1>
    <input type="file" @change="handleFileUpload" accept=".wav" />
    <svg ref="svg" xmlns="http://www.w3.org/2000/svg"></svg>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { transform, fftfreq } from './fft_small'

const svg = ref<SVGSVGElement | null>(null)

async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) {
    alert('Please select a valid WAV file.')
    return
  }

  const file = input.files[0]
  const arrayBuffer = await file.arrayBuffer()

  const audioContext = new AudioContext()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

  const signal = audioBuffer.getChannelData(0)
  const sampleRate = audioBuffer.sampleRate

  decoder(signal, sampleRate)
}

function decoder(signal: Float32Array, sampleRate: number) {
  const SEGMENT_DURATION_S = 10
  const SEGMENT_DURATION = SEGMENT_DURATION_S / 1000
  const SEGMENT_SAMPLES = Math.floor(sampleRate * SEGMENT_DURATION)
  const AMOUNT_OF_CHUNKS = Math.floor(signal.length / SEGMENT_SAMPLES)
  const CHUNK_SIZE = Math.floor(signal.length / AMOUNT_OF_CHUNKS)

  console.log(`Sample rate: ${sampleRate} Hz`)
  console.log(`Segment duration: ${SEGMENT_DURATION} ms`)
  console.log(`Segment samples: ${SEGMENT_SAMPLES}`)
  console.log(`Amount of chunks: ${AMOUNT_OF_CHUNKS}`)
  console.log(`Chunk size: ${CHUNK_SIZE}`)

  const listOfUniqueFrequencies: number[] = []
  for (let i = 0; i < signal.length; i += CHUNK_SIZE) {
    const chunk = signal.subarray(i, i + CHUNK_SIZE)

    const real = Float64Array.from(chunk)
    const imag = new Float64Array(real.length).fill(0)

    transform(real, imag)

    const magnitude = Array.from(real.map((re, idx) => Math.sqrt(re ** 2 + imag[idx] ** 2)))
    const frequencies = fftfreq(real.length, 1 / sampleRate)

    const halfLength = Math.floor(magnitude.length / 2)
    const maxIndex = magnitude
      .slice(0, halfLength)
      .indexOf(Math.max(...magnitude.slice(0, halfLength)))
    const dominantFreq = frequencies[maxIndex]

    listOfUniqueFrequencies.push(dominantFreq)
  }

  const imgMatrix = []
  let startIndex = 0
  let iteration = 0

  while (startIndex < listOfUniqueFrequencies.length) {
    const indexOf1200 = listOfUniqueFrequencies.slice(startIndex).indexOf(1200)

    if (indexOf1200 === -1) {
      imgMatrix.push(listOfUniqueFrequencies.slice(startIndex))
      break
    }

    const absoluteIndexOf1200 = indexOf1200 + startIndex

    imgMatrix.push(listOfUniqueFrequencies.slice(startIndex, absoluteIndexOf1200))

    startIndex = absoluteIndexOf1200 + 1
    iteration++

    if (iteration > 10000) break
  }

  imgMatrix.shift()

  console.log('matrix', imgMatrix)

  if (!svg.value) {
    console.error('SVG element not found.')
    return
  }

  function freqToPixel(freq: number) {
    return Math.floor(((freq - 1500) / 800) * 255)
  }

  const pixelMatrix = imgMatrix.map((row) =>
    row.map((freq) => Math.max(0, Math.min(255, freqToPixel(freq)))),
  )

  const width = pixelMatrix[0]?.length || 1
  const height = pixelMatrix.length || 1

  svg.value.innerHTML = '' // Clear the SVG content
  svg.value.setAttribute('width', `${width * 2}`)
  svg.value.setAttribute('height', `${height * 2}`)
  svg.value.style.width = `${width * 2}px`
  svg.value.style.height = `${height * 2}px`

  const rectWidth = 2
  const rectHeight = 2

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelValue = pixelMatrix[y][x]
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('x', (x * rectWidth).toString())
      rect.setAttribute('y', (y * rectHeight).toString())
      rect.setAttribute('width', rectWidth.toString())
      rect.setAttribute('height', rectHeight.toString())
      rect.setAttribute('fill', `rgb(${pixelValue}, ${pixelValue}, ${pixelValue})`)
      svg.value.appendChild(rect)
    }
  }
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
}
</style>
