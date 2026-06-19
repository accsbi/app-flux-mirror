export interface RandomSource {
  nextInt(maxExclusive: number): number
}

export class MathRandomSource implements RandomSource {
  nextInt(maxExclusive: number): number {
    return Math.floor(Math.random() * maxExclusive)
  }
}

export class SeededRandomSource implements RandomSource {
  private seed: number

  constructor(seed: number) {
    this.seed = seed >>> 0
  }

  nextInt(maxExclusive: number): number {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0
    return this.seed % maxExclusive
  }
}
