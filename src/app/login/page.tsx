/**
 * Login page for admin authentication with 2FA support.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'

// Import 2FA components
import { BackupCodesDisplay } from '@/components/auth/backup-codes-display'
import { OtpVerification } from '@/components/auth/otp-verification'
import { BackupCodeEntry } from '@/components/auth/backup-code-entry'

type LoginStep = 'credentials' | 'setup' | 'otp' | 'backup'

export default function LoginPage() {
  const router = useRouter()

  // -- State Management --
  const [step, setStep] = useState<LoginStep>('credentials')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // -- Data Context --
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailMasked, setEmailMasked] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])

  /**
   * Step 1: Submit Credentials
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.login(email, password)

      switch (response.status) {
        case 'authenticated':
          router.push('/admin')
          break

        case 'setup_required':
          setBackupCodes(response.backup_codes || [])
          setStep('setup')
          break

        case 'otp_required':
          setEmailMasked(response.email_masked || email)
          setStep('otp')
          break

        case 'rate_limited':
          setError('Too many attempts. Please try again later.')
          break

        default:
          setError('An unexpected error occurred.')
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Step 2: Confirm 2FA Setup
   */
  const handleSetupConfirm = async () => {
    setError('')
    setLoading(true)

    try {
      const response = await api.setup2fa(email)

      if (response.status === 'authenticated') {
        router.push('/admin')
      } else {
        // Fallback if status isn't authenticated immediately
        setError('Setup failed. Please login again.')
        setStep('credentials')
      }
    } catch (err: any) {
      setError(err.message || 'Setup failed')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Step 3: Verify OTP
   */
  const handleOtpVerify = async (code: string) => {
    setError('')
    setLoading(true)

    try {
      const response = await api.verifyOtp(email, code)
      if (response.status === 'authenticated') {
        router.push('/admin')
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Step 4: Verify Backup Code
   */
  const handleBackupVerify = async (code: string) => {
    setError('')
    setLoading(true)

    try {
      const response = await api.verifyBackupCode(email, code)
      if (response.status === 'authenticated') {
        router.push('/admin')
      }
    } catch (err: any) {
      setError(err.message || 'Invalid backup code')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Helper: Resend OTP
   */
  const handleResendOtp = async () => {
    try {
      await api.resendOtp(email)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to resend code')
      throw err
    }
  }

  // Determine Title based on Step
  const getTitle = () => {
    switch (step) {
      case 'setup': return 'Two-Factor Setup'
      case 'otp': return 'Two-Factor Authentication'
      case 'backup': return 'Account Recovery'
      default: return 'Tether Admin'
    }
  }

  const getSubtitle = () => {
    switch (step) {
      case 'setup': return 'Save your recovery codes'
      case 'otp': return 'Enter the code sent to your email'
      case 'backup': return 'Use a saved recovery code'
      default: return 'Sign in to your account'
    }
  }

  return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">{getTitle()}</CardTitle>
            <p className="text-sm text-slate-500">{getSubtitle()}</p>
          </CardHeader>
          <CardContent>
            {/* Common Error Display */}
            {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 text-center">
                  {error}
                </div>
            )}

            {/* STEP 1: CREDENTIALS */}
            {step === 'credentials' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                      Email
                    </label>
                    <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@tether.test"
                        required
                        className="mt-1"
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                      Password
                    </label>
                    <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="mt-1"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign in'}
                  </Button>
                </form>
            )}

            {/* STEP 2: SETUP REQUIRED */}
            {step === 'setup' && (
                <BackupCodesDisplay
                    codes={backupCodes}
                    onConfirm={handleSetupConfirm}
                    isLoading={loading}
                />
            )}

            {/* STEP 3: OTP VERIFICATION */}
            {step === 'otp' && (
                <OtpVerification
                    emailMasked={emailMasked}
                    onVerify={handleOtpVerify}
                    onResend={handleResendOtp}
                    onUseBackup={() => {
                      setError(null)
                      setStep('backup')
                    }}
                    isLoading={loading}
                    error={error}
                />
            )}

            {/* STEP 4: BACKUP CODE ENTRY */}
            {step === 'backup' && (
                <BackupCodeEntry
                    onVerify={handleBackupVerify}
                    onBack={() => {
                      setError(null)
                      setStep('otp')
                    }}
                    isLoading={loading}
                    error={error}
                />
            )}
          </CardContent>
        </Card>
      </div>
  )
}