import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date string to a localized date and time string.
 * @param dateString - ISO date string
 * @returns Formatted date string (e.g., "20 Jan 2026, 14:30")
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format a date string to a localized date and time string (nullable).
 * @param dateString - ISO date string or null
 * @returns Formatted date string or "—" if null
 */
export function formatDateNullable(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  return formatDate(dateString)
}

/**
 * Format a Date object to a localized date string (no time).
 * @param date - Date object
 * @returns Formatted date string (e.g., "20 Jan 2026")
 */
export function formatDateOnly(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Format a date for month/year labels in charts.
 * @param date - Date object
 * @returns Formatted string (e.g., "January 2026")
 */
export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  })
}

/**
 * Format a number as currency with locale formatting.
 * @param amount - The amount to format
 * @param currency - The currency code (e.g., "EUR", "USD")
 * @returns Formatted currency string (e.g., "1.234,56 €")
 */
export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

/**
 * Formats a file size in bytes into a human-readable string (B, KB, or MB).
 * @param bytes - The file size in bytes.
 * @returns The formatted file size string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}