export interface SizeOption {
  label: string
  w: number
  h: number
  /** Default qubit limit for this size. */
  q: number
  /** Smallest qubit limit that can still encode this maze. */
  minQ?: number
}

export const SIZES: SizeOption[] = [
  { label: 'Small 8 × 6', w: 8, h: 6, q: 8 },
  { label: 'Medium 12 × 8', w: 12, h: 8, q: 10 },
  { label: 'Large 16 × 10', w: 16, h: 10, q: 12 },
  { label: 'Extra large 20 × 13', w: 20, h: 13, q: 14 },
  { label: 'Huge 24 × 16', w: 24, h: 16, q: 14, minQ: 14 },
  { label: 'Giant 30 × 20 (slow)', w: 30, h: 20, q: 16, minQ: 16 },
]

export const QUBIT_CAPS = [8, 10, 12, 14, 16]

export const DEFAULT_SIZE_INDEX = 1
