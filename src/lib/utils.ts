import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { AlertCircle, Clock } from "lucide-react"

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
 * Formats a date string into a German date format (DD.MM.YYYY).
 * Returns '-' if the input is null, undefined, or empty.
 *
 * @param dateString - The date string to format. Can be null or undefined.
 * @returns A formatted date string in 'DD.MM.YYYY' format, or '-' if input is invalid.
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  return new Intl.DateTimeFormat('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(dateString))
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
 * Calculates the number of days remaining until a given date and returns
 * an object containing a descriptive text, a color class, and an optional icon.
 *
 * @param dateString - The target date as a string.
 * @returns An object with:
 *   - text: A string describing the due status (e.g., "Due today", "Tomorrow", "in X days", "X days overdue").
 *   - color: A CSS class string for styling the text based on urgency.
 *   - icon: An optional icon component (AlertCircle for overdue, Clock for today/tomorrow, null otherwise).
 */
export function getDaysRemaining(dateString: string) {
  const target = new Date(dateString)
  const today = new Date()
  target.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const diffTime = target.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return { text: `${Math.abs(diffDays)} days overdue`, color: 'text-red-600 font-medium', icon: AlertCircle }
  if (diffDays === 0) return { text: 'Due today', color: 'text-orange-600 font-medium', icon: Clock }
  if (diffDays === 1) return { text: 'Tomorrow', color: 'text-blue-600', icon: Clock }
  return { text: `in ${diffDays} days`, color: 'text-slate-500', icon: null }
}

/**
 * Formats a given Date object into a simple string representation in the German date format (DD.MM.YYYY).
 *
 * @param date - The Date object to format.
 * @returns A string representing the date in 'DD.MM.YYYY' format.
 */
export function formatSimpleDate(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Formats a Date object into a string in ISO date format (YYYY-MM-DD), removing the time part.
 *
 * @param date - The Date object to format.
 * @returns A string representing the date in 'YYYY-MM-DD' format.
 */
export function formatIsoDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Format a number as currency with locale formatting.
 * @param amount - The amount to format
 * @param currency - The currency code (e.g., "EUR", "USD")
 * @returns Formatted currency string (e.g., "1.234,56 €")
 */
export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
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

/**
 * Formats a numeric value as a percentage string with two decimal places.
 * If the value is undefined or null, it defaults to "0.00%".
 * @param value - The numeric value to format. Can be a number, null, or undefined.
 * @returns A string representing the value as a percentage with two decimals.
 */
export function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null) return '0.00%'
  return `${value.toFixed(2)}%`
}

/**
 * Generates an array of month options starting from November 2025 up to the current month.
 * Each option includes a value (YYYY-MM format), a human-readable label (e.g., "January 2026"),
 * and the numeric month and year.
 * The options are returned in reverse chronological order (most recent first).
 *
 * @returns An array of objects, each containing:
 *   - value: string (e.g., "2026-1")
 *   - label: string (e.g., "January 2026")
 *   - month: number (1-12)
 *   - year: number
 */
export function generateMonthOptions() {
  const options: { value: string; label: string; month: number; year: number }[] = []
  const startDate = new Date(2025, 10, 1)
  const endDate = new Date()

  let current = new Date(startDate)
  while (current <= endDate) {
    const month = current.getMonth() + 1
    const year = current.getFullYear()
    const label = current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    options.push({ value: `${year}-${month}`, label, month, year })
    current.setMonth(current.getMonth() + 1)
  }

  return options.reverse()
}