/**
 * Chargeback rules and utilities
 */

export interface ChargebackRule {
  risk: 'low' | 'medium' | 'high'
  detail?: string
  action: string[]
}

// Action constants to avoid repetition
export const CHARGEBACK_ACTIONS = {
  STOP_BILLING: 'Stop billing',
  RETRY: 'Retry',
  RETRY_LATER: 'Retry later',
  CONTACT_CUSTOMER: 'Contact customer',
  CONTACT_BANK: 'Contact bank',
  FIX_DATA: 'Fix transaction data',
  UPDATE_PROFILE: 'Update customer profile',
  CHECK_DUPLICATES: 'Check duplicates',
} as const

export const CHARGEBACK_RULES: Record<string, ChargebackRule> = {
  AC01: {
    risk: 'medium',
    detail: 'Incorrect Account Number',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Contact customer to confirm account',
    ],
  },
  AC04: {
    risk: 'high',
    detail: 'Closed Account Number',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Ask customer for new account',
    ],
  },
  AC06: {
    risk: 'high',
    detail: 'Blocked Account',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Ask customer to unblock',
    ],
  },
  AC13: {
    risk: 'medium',
    detail: 'Invalid Debtor Account Type',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Confirm account type',
    ],
  },
  AG01: {
    risk: 'medium',
    detail: 'Transaction Forbidden',
    action: [
      'Try another payment method',
    ],
  },
  AG02: {
    risk: 'low',
    detail: 'Invalid Bank Operation Code',
    action: [
      CHARGEBACK_ACTIONS.FIX_DATA,
      CHARGEBACK_ACTIONS.RETRY,
    ],
  },
  AM04: {
    risk: 'medium',
    detail: 'Insufficient Funds',
    action: [
      CHARGEBACK_ACTIONS.RETRY_LATER,
    ],
  },
  AM05: {
    risk: 'medium',
    detail: 'Duplication',
    action: [
      CHARGEBACK_ACTIONS.CHECK_DUPLICATES,
      'Cancel extra collections',
    ],
  },
  BE05: {
    risk: 'low',
    detail: 'Identifier of Creditor Incorrect',
    action: [
      'Check details (Creditor ID)',
      CHARGEBACK_ACTIONS.RETRY,
    ],
  },
  CNOR: {
    risk: 'high',
    detail: 'Creditor Bank Is Not Registered',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Verify SEPA setup with customer',
    ],
  },
  DNOR: {
    risk: 'high',
    detail: 'Debtor Bank Is Not Registered',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Request customer for different bank',
    ],
  },
  ED05: {
    risk: 'high',
    detail: 'Settlement Failed',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Investigate settlement issue',
    ],
  },
  MD01: {
    risk: 'high',
    detail: 'No Mandate',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Collect new mandate',
    ],
  },
  MD02: {
    risk: 'high',
    detail: 'Missing Mandatory Information In Mandate',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Correct mandate',
    ],
  },
  MD06: {
    risk: 'high',
    detail: 'Refund Request By End Customer',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Review mandate details',
    ],
  },
  MD07: {
    risk: 'high',
    detail: 'End Customer Deceased',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Cancel mandate / Close customer account',
    ],
  },
  MS02: {
    risk: 'high',
    detail: 'Not Specified Reason Customer Generated',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
    ],
  },
  MS03: {
    risk: 'high',
    detail: 'Not Specified Reason Agent Generated',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Contact bank / customer',
    ],
  },
  RC01: {
    risk: 'medium',
    detail: 'Bank Identifier Incorrect',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Correct details and retry',
    ],
  },
  RR01: {
    risk: 'low',
    detail: 'Missing Debtor Account Or Identification',
    action: [
      'Add transaction data',
      CHARGEBACK_ACTIONS.RETRY,
    ],
  },
  RR02: {
    risk: 'low',
    detail: 'Missing Debtor Name Or Address',
    action: [
      CHARGEBACK_ACTIONS.UPDATE_PROFILE,
      CHARGEBACK_ACTIONS.RETRY,
    ],
  },
  RR03: {
    risk: 'low',
    detail: 'Missing Creditor Name Or Address',
    action: [
      'Update transaction data',
      CHARGEBACK_ACTIONS.RETRY,
    ],
  },
  RR04: {
    risk: 'medium',
    detail: 'Regulatory Reason',
    action: [
      CHARGEBACK_ACTIONS.CONTACT_BANK,
    ],
  },
  SL01: {
    risk: 'medium',
    detail: 'Specific Service Offered By Debtor Agent',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Ask customer to change bank settings',
    ],
  },
} as const

/**
 * Get chargeback rule for a given code
 */
export function getChargebackRule(code: string): ChargebackRule | undefined {
  return CHARGEBACK_RULES[code]
}

/**
 * Check if a chargeback code exists
 */
export function isValidChargebackCode(code: string): boolean {
  return code in CHARGEBACK_RULES
}

/**
 * Get all chargeback codes
 */
export function getChargebackCodes(): string[] {
  return Object.keys(CHARGEBACK_RULES)
}

/**
 * Get chargebacks by risk level
 */
export function getChargebacksByRisk(risk: 'low' | 'medium' | 'high'): Record<string, ChargebackRule> {
  return Object.fromEntries(
    Object.entries(CHARGEBACK_RULES).filter(([_, rule]) => rule.risk === risk)
  )
}