export function transform(
  real: Array<number> | Float64Array,
  imag: Array<number> | Float64Array,
): void {
  const n: number = real.length
  if (n != imag.length) throw new RangeError('Mismatched lengths')
  if (n == 0) return
  else if ((n & (n - 1)) == 0)
    // Is power of 2
    transformRadix2(real, imag) // More complicated algorithm for arbitrary sizes
  else transformBluestein(real, imag)
}

export function fftfreq(n: number, d: number = 1): Float64Array {
  const val = 1.0 / (n * d)
  const results = new Float64Array(n)
  const half = Math.floor(n / 2)
  for (let i = 0; i < half; i++) results[i] = i * val
  for (let i = -half; i < 0; i++) results[n + i] = i * val
  return results
}

function inverseTransform(
  real: Array<number> | Float64Array,
  imag: Array<number> | Float64Array,
): void {
  transform(imag, real)
}

function transformRadix2(
  real: Array<number> | Float64Array,
  imag: Array<number> | Float64Array,
): void {
  // Length variables
  const n: number = real.length
  if (n != imag.length) throw new RangeError('Mismatched lengths')
  if (n == 1)
    // Trivial transform
    return
  let levels: number = -1
  for (let i = 0; i < 32; i++) {
    if (1 << i == n) levels = i // Equal to log2(n)
  }
  if (levels == -1) throw new RangeError('Length is not a power of 2')

  // Trigonometric tables
  const cosTable = new Array<number>(n / 2)
  const sinTable = new Array<number>(n / 2)
  for (let i = 0; i < n / 2; i++) {
    cosTable[i] = Math.cos((2 * Math.PI * i) / n)
    sinTable[i] = Math.sin((2 * Math.PI * i) / n)
  }

  // Bit-reversed addressing permutation
  for (let i = 0; i < n; i++) {
    const j: number = reverseBits(i, levels)
    if (j > i) {
      let temp: number = real[i]
      real[i] = real[j]
      real[j] = temp
      temp = imag[i]
      imag[i] = imag[j]
      imag[j] = temp
    }
  }

  // Cooley-Tukey decimation-in-time radix-2 FFT
  for (let size = 2; size <= n; size *= 2) {
    const halfsize: number = size / 2
    const tablestep: number = n / size
    for (let i = 0; i < n; i += size) {
      for (let j = i, k = 0; j < i + halfsize; j++, k += tablestep) {
        const l: number = j + halfsize
        const tpre: number = real[l] * cosTable[k] + imag[l] * sinTable[k]
        const tpim: number = -real[l] * sinTable[k] + imag[l] * cosTable[k]
        real[l] = real[j] - tpre
        imag[l] = imag[j] - tpim
        real[j] += tpre
        imag[j] += tpim
      }
    }
  }

  // Returns the integer whose value is the reverse of the lowest 'width' bits of the integer 'val'.
  function reverseBits(val: number, width: number): number {
    let result: number = 0
    for (let i = 0; i < width; i++) {
      result = (result << 1) | (val & 1)
      val >>>= 1
    }
    return result
  }
}

function transformBluestein(
  real: Array<number> | Float64Array,
  imag: Array<number> | Float64Array,
): void {
  // Find a power-of-2 convolution length m such that m >= n * 2 + 1
  const n: number = real.length
  if (n != imag.length) throw new RangeError('Mismatched lengths')
  let m: number = 1
  while (m < n * 2 + 1) m *= 2

  // Trigonometric tables
  const cosTable = new Array<number>(n)
  const sinTable = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    const j: number = (i * i) % (n * 2) // This is more accurate than j = i * i
    cosTable[i] = Math.cos((Math.PI * j) / n)
    sinTable[i] = Math.sin((Math.PI * j) / n)
  }

  // Temporary vectors and preprocessing
  const areal: Array<number> = newArrayOfZeros(m)
  const aimag: Array<number> = newArrayOfZeros(m)
  for (let i = 0; i < n; i++) {
    areal[i] = real[i] * cosTable[i] + imag[i] * sinTable[i]
    aimag[i] = -real[i] * sinTable[i] + imag[i] * cosTable[i]
  }
  const breal: Array<number> = newArrayOfZeros(m)
  const bimag: Array<number> = newArrayOfZeros(m)
  breal[0] = cosTable[0]
  bimag[0] = sinTable[0]
  for (let i = 1; i < n; i++) {
    breal[i] = breal[m - i] = cosTable[i]
    bimag[i] = bimag[m - i] = sinTable[i]
  }

  // Convolution
  const creal = new Array<number>(m)
  const cimag = new Array<number>(m)
  convolveComplex(areal, aimag, breal, bimag, creal, cimag)

  // Postprocessing
  for (let i = 0; i < n; i++) {
    real[i] = creal[i] * cosTable[i] + cimag[i] * sinTable[i]
    imag[i] = -creal[i] * sinTable[i] + cimag[i] * cosTable[i]
  }
}

function convolveReal(
  xvec: Array<number> | Float64Array,
  yvec: Array<number> | Float64Array,
  outvec: Array<number> | Float64Array,
): void {
  const n: number = xvec.length
  if (n != yvec.length || n != outvec.length) throw new RangeError('Mismatched lengths')
  convolveComplex(xvec, newArrayOfZeros(n), yvec, newArrayOfZeros(n), outvec, newArrayOfZeros(n))
}

function convolveComplex(
  xreal: Array<number> | Float64Array,
  ximag: Array<number> | Float64Array,
  yreal: Array<number> | Float64Array,
  yimag: Array<number> | Float64Array,
  outreal: Array<number> | Float64Array,
  outimag: Array<number> | Float64Array,
): void {
  const n: number = xreal.length
  if (
    n != ximag.length ||
    n != yreal.length ||
    n != yimag.length ||
    n != outreal.length ||
    n != outimag.length
  )
    throw new RangeError('Mismatched lengths')

  xreal = xreal.slice()
  ximag = ximag.slice()
  yreal = yreal.slice()
  yimag = yimag.slice()
  transform(xreal, ximag)
  transform(yreal, yimag)

  for (let i = 0; i < n; i++) {
    const temp: number = xreal[i] * yreal[i] - ximag[i] * yimag[i]
    ximag[i] = ximag[i] * yreal[i] + xreal[i] * yimag[i]
    xreal[i] = temp
  }
  inverseTransform(xreal, ximag)

  for (let i = 0; i < n; i++) {
    outreal[i] = xreal[i] / n
    outimag[i] = ximag[i] / n
  }
}

function newArrayOfZeros(n: number): Array<number> {
  const result: Array<number> = []
  for (let i = 0; i < n; i++) result.push(0)
  return result
}
