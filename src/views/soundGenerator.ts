export class SoundGenerator {
  private audio: number[] = [] // Audio samples buffer
  private sampleRate: number = 44100 // Default sample rate

  /**
   * Appends silence to the audio buffer.
   * @param durationMilliseconds Duration of silence in milliseconds.
   */
  appendSilence(durationMilliseconds: number = 500): void {
    const numSamples = durationMilliseconds * (this.sampleRate / 1000.0)
    for (let i = 0; i < Math.floor(numSamples); i++) {
      this.audio.push(0.0)
    }
  }

  /**
   * Appends a sine wave to the audio buffer.
   * @param freq Frequency of the sine wave.
   * @param durationMilliseconds Duration of the sine wave in milliseconds.
   * @param volume Volume of the sine wave (default is 1.0).
   * @returns Number of samples added.
   */
  appendSinewave(freq: number, durationMilliseconds: number, volume: number = 1.0): number {
    const numSamples = durationMilliseconds * (this.sampleRate / 1000.0)
    for (let i = 0; i < Math.floor(numSamples); i++) {
      const sample = volume * Math.sin((2 * Math.PI * freq * i) / this.sampleRate)
      this.audio.push(sample)
    }
    return Math.floor(numSamples)
  }

  /**
   * Appends multiple sine waves to the audio buffer.
   * @param freqs Array of frequencies to generate sine waves for.
   * @param durationMilliseconds Duration of each sine wave in milliseconds.
   */
  appendSinewaves(freqs: number[], durationMilliseconds: number): void {
    let numSamplesActual = 0
    console.log('Amount of frequencies:', freqs.length)

    for (const freq of freqs) {
      numSamplesActual += this.appendSinewave(freq, durationMilliseconds)
    }

    const numSamplesCalculated = durationMilliseconds * freqs.length * (this.sampleRate / 1000.0)
    console.log('Number of samples actual:', numSamplesActual)
    console.log('Number of samples calculated:', numSamplesCalculated)
  }

  /**
   * Saves the audio buffer as a WAV file.
   * @param fileName The name of the output file.
   * @returns A Blob containing the WAV file data.
   */
  saveWav(fileName: string): string {
    const wavBuffer = this.generateWavBuffer()
    const blob = new Blob([wavBuffer], { type: 'audio/wav' })

    // Trigger download
    // const link = document.createElement('a')
    // link.href = URL.createObjectURL(blob)
    // link.download = fileName
    // link.click()

    return URL.createObjectURL(blob)
  }

  /**
   * Generates a WAV file buffer from the audio data.
   * @returns An ArrayBuffer containing the WAV file data.
   */
  private generateWavBuffer(): ArrayBuffer {
    const numChannels = 1
    const bitsPerSample = 16
    const blockAlign = (numChannels * bitsPerSample) / 8
    const byteRate = this.sampleRate * blockAlign
    const dataLength = this.audio.length * (bitsPerSample / 8)
    const bufferLength = 44 + dataLength

    const buffer = new ArrayBuffer(bufferLength)
    const view = new DataView(buffer)

    // Write WAV header
    this.writeString(view, 0, 'RIFF') // ChunkID
    view.setUint32(4, 36 + dataLength, true) // ChunkSize
    this.writeString(view, 8, 'WAVE') // Format
    this.writeString(view, 12, 'fmt ') // Subchunk1ID
    view.setUint32(16, 16, true) // Subchunk1Size
    view.setUint16(20, 1, true) // AudioFormat
    view.setUint16(22, numChannels, true) // NumChannels
    view.setUint32(24, this.sampleRate, true) // SampleRate
    view.setUint32(28, byteRate, true) // ByteRate
    view.setUint16(32, blockAlign, true) // BlockAlign
    view.setUint16(34, bitsPerSample, true) // BitsPerSample
    this.writeString(view, 36, 'data') // Subchunk2ID
    view.setUint32(40, dataLength, true) // Subchunk2Size

    // Write audio data
    let offset = 44
    for (const sample of this.audio) {
      const clampedSample = Math.max(-1, Math.min(1, sample))
      const intSample = clampedSample < 0 ? clampedSample * 0x8000 : clampedSample * 0x7fff
      view.setInt16(offset, intSample, true)
      offset += 2
    }

    return buffer
  }

  /**
   * Writes a string to the DataView.
   * @param view The DataView to write to.
   * @param offset The offset to start writing at.
   * @param string The string to write.
   */
  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }
}
