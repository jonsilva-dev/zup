import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number) {
  // Truncate to 2 decimal places (do not round up)
  // Math.trunc works for both positive and negative numbers correctly for this purpose
  // (e.g. 10.559 -> 10.55, -10.559 -> -10.55)
  // Note: Float precision issues might still occur (e.g. 1.005 * 100 = 100.49999) 
  // To be safe for currency which is usually 2 decimals, we adds a tiny epsilon before floor/trunc 
  // if the source was already "supposed" to be 2 decimals but became .55999999 due to float math.
  // But strictly following "never round up" usually implies simple truncation.

  const truncated = Math.trunc(value * 100) / 100

  return truncated.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}
