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
  REJECT: 'Reject',
} as const

export const CHARGEBACK_RULES: Record<string, ChargebackRule> = {
  AC01: {
    risk: 'medium',
    detail: 'Incorrect account number',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Contact customer to confirm account',
    ],
  },
  AC04: {
    risk: 'high',
    detail: 'Closed account number',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Ask customer for new account',
    ],
  },
  AC06: {
    risk: 'high',
    detail: 'Blocked account',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Ask customer to unblock',
    ],
  },
  AC13: {
    risk: 'medium',
    detail: 'Invalid debtor account type',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Confirm account type',
    ],
  },
  AG01: {
    risk: 'medium',
    detail: 'Transaction forbidden',
    action: [
      'Try another payment method',
    ],
  },
  AG02: {
    risk: 'low',
    detail: 'Invalid bank operation code',
    action: [
      CHARGEBACK_ACTIONS.FIX_DATA,
      CHARGEBACK_ACTIONS.RETRY,
    ],
  },
  AM04: {
    risk: 'medium',
    detail: 'Insufficient funds',
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
    detail: 'Unrecognised Initiating Party',
    action: [
      'Check details (Creditor ID)',
      CHARGEBACK_ACTIONS.RETRY,
    ],
  },
  BE10: {
    risk: 'low',
    detail: 'Invalid Debtor Country',
    action: [
      'Validate debtor ISO-2 country code',
      CHARGEBACK_ACTIONS.RETRY,
    ],
  },
  CNOR: {
    risk: 'high',
    detail: 'Creditor bank is not registered',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Verify SEPA setup with customer',
    ],
  },
  DNOR: {
    risk: 'high',
    detail: 'Debtor bank is not registered',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Request customer for different bank',
    ],
  },
  ED05: {
    risk: 'high',
    detail: 'Settlement failed',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Investigate settlement issue',
    ],
  },
  MD01: {
    risk: 'high',
    detail: 'No mandate',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Collect new mandate',
    ],
  },
  MD02: {
    risk: 'high',
    detail: 'Missing mandatory information in mandate',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Correct mandate',
    ],
  },
  MD06: {
    risk: 'high',
    detail: 'Refund Requested by End Customer',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Review mandate details',
    ],
  },
  MD07: {
    risk: 'high',
    detail: 'End customer deceased',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Cancel mandate / Close customer account',
    ],
  },
  MS02: {
    risk: 'high',
    detail: 'Not Specified Reason, Customer Generated',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
    ],
  },
  MS03: {
    risk: 'high',
    detail: 'Not Specified Reason, Agent Generated',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Contact bank / customer',
    ],
  },
  RC01: {
    risk: 'medium',
    detail: 'Bank identifier incorrect',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Correct details and retry',
    ],
  },
  RR01: {
    risk: 'low',
    detail: 'Missing debtor account or identification',
    action: [
      'Add transaction data',
      CHARGEBACK_ACTIONS.RETRY,
    ],
  },
  RR02: {
    risk: 'low',
    detail: 'Missing debtor name or address',
    action: [
      CHARGEBACK_ACTIONS.UPDATE_PROFILE,
      CHARGEBACK_ACTIONS.RETRY,
    ],
  },
  RR03: {
    risk: 'low',
    detail: 'Missing creditor name or address',
    action: [
      'Update transaction data',
      CHARGEBACK_ACTIONS.RETRY,
    ],
  },
  RR04: {
    risk: 'medium',
    detail: 'Regulatory reason',
    action: [
      CHARGEBACK_ACTIONS.CONTACT_BANK,
    ],
  },
  SL01: {
    risk: 'medium',
    detail: 'Due To Specific Service Offered By Debtor Agent',
    action: [
      CHARGEBACK_ACTIONS.STOP_BILLING,
      'Ask customer to change bank settings',
    ],
  },
  XT13: {
    risk: 'high',
    detail: 'Unsupported XML field',
    action: [
      CHARGEBACK_ACTIONS.REJECT,
      'Remove unsupported XML field and resend',
    ],
  },
  XT33: {
    risk: 'high',
    detail: 'Invalid data format',
    action: [
      CHARGEBACK_ACTIONS.REJECT,
      'Fix field data formats and resend',
    ],
  },
  XT73: {
    risk: 'high',
    detail: 'Invalid country code',
    action: [
      CHARGEBACK_ACTIONS.REJECT,
      'Correct country code (ISO-2) and resend',
    ],
  },
  XT75: {
    risk: 'high',
    detail: 'Invalid original transaction status',
    action: [
      CHARGEBACK_ACTIONS.REJECT,
      'Verify original transaction status and resend',
    ],
  },
  XT77: {
    risk: 'high',
    detail: 'Interbank Settlement Amount mismatch',
    action: [
      CHARGEBACK_ACTIONS.REJECT,
      'Reconcile settlement amount and resend',
    ],
  },
  XT78: {
    risk: 'high',
    detail: 'Compensation amount check failed',
    action: [
      CHARGEBACK_ACTIONS.REJECT,
      'Recalculate compensation amount and resend',
    ],
  },
  XT79: {
    risk: 'high',
    detail: 'Debtor Agent not allowed to receive DD',
    action: [
      CHARGEBACK_ACTIONS.REJECT,
      'Use a debtor agent allowed to receive DD',
    ],
  },
  XT80: {
    risk: 'high',
    detail: 'Creditor Agent not allowed to send DD',
    action: [
      CHARGEBACK_ACTIONS.REJECT,
      'Use a creditor agent allowed to send DD',
    ],
  },
  XT81: {
    risk: 'high',
    detail: 'Field not permitted in SDD Service',
    action: [
      CHARGEBACK_ACTIONS.REJECT,
      'Remove non-permitted SDD field and resend',
    ],
  },
  XT87: {
    risk: 'high',
    detail: 'R-Message route mismatch',
    action: [
      CHARGEBACK_ACTIONS.REJECT,
      'Verify R-message routing and resend',
    ],
  },
  XT88: {
    risk: 'high',
    detail: 'Excess transactions cancelled',
    action: [
      CHARGEBACK_ACTIONS.REJECT,
      'Reduce batch size / split transactions and resend',
    ],
  },
  XT90: {
    risk: 'high',
    detail: 'Invalid use of Technical BIC',
    action: [
      CHARGEBACK_ACTIONS.REJECT,
      'Replace Technical BIC with valid BIC and resend',
    ],
  },
  XT91: {
    risk: 'high',
    detail: 'Creditor/Debtor Agent not part of SEPACOM CUG',
    action: [
      CHARGEBACK_ACTIONS.REJECT,
      'Confirm SEPACOM CUG membership (use allowed agent)',
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