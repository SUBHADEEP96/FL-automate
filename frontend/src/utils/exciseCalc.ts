/**
 * Excise Calculation Utilities for West Bengal State Excise Regulations
 */

export function calculateBulkLitres(bottles: number, packSizeMl: number): number {
  if (!bottles || bottles <= 0 || !packSizeMl) return 0;
  return Number(((bottles * packSizeMl) / 1000).toFixed(4));
}

export function calculateLondonProofLitres(bulkLitres: number, strengthPct: number): number {
  if (!bulkLitres || bulkLitres <= 0 || !strengthPct) return 0;
  return Number((bulkLitres * (strengthPct / 57.12)).toFixed(4));
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
}

export function formatBL(bl: number): string {
  return (bl || 0).toFixed(3) + ' BL';
}

export function formatLPL(lpl: number): string {
  return (lpl || 0).toFixed(3) + ' LPL';
}
