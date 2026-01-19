export interface CountryChargebackStats {
  country: string
  total: number
  approved: number
  declined: number
  errors: number
  chargebacks: number
  chargeback_amount: number
  cb_rate_total: number | null
  cb_rate_approved: number | null
  alert: boolean
}

export interface ChargebackStats {
  period: string
  start_date: string
  threshold: number
  countries: CountryChargebackStats[]
  totals: Omit<CountryChargebackStats, 'country'>
}

export interface ChargebackCodeDetail {
  chargeback_code: string
  chargeback_reason: string
  total_amount: number
  occurrences: number
}

export interface ChargebackCodeTotal {
  total_amount: number
  occurrences: number
}

export interface ChargebackCodeStats {
  period: string
  start_date: string
  codes: ChargebackCodeDetail[]
  totals: ChargebackCodeTotal
}

export interface BankChargebackStats {
  bank_name: string
  total: number
  approved: number
  total_amount: number
  chargebacks: number
  chargeback_amount: number
  cb_rate: number | null
  alert: boolean
}

export interface ChargebackBankStats {
  period: string
  start_date: string
  banks: BankChargebackStats[]
  totals: {
    total: number
    approved: number
    total_amount: number
    chargebacks: number
    chargeback_amount: number
    cb_rate: number | null
  }
}
