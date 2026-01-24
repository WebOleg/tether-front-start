import React, {useState, useEffect} from 'react'
import {OtpInput} from '@/components/ui/otp-input'

interface OtpVerificationProps {
    emailMasked: string
    onVerify: (code: string) => void
    onResend: () => Promise<void>
    onUseBackup: () => void
    isLoading?: boolean
    error?: string | null
}

export function OtpVerification({
    emailMasked,
    onVerify,
    onResend,
    onUseBackup,
    isLoading = false,
    error,
}: OtpVerificationProps) {
    const [otp, setOtp] = useState('')
    const [timeLeft, setTimeLeft] = useState(60)
    const [canResend, setCanResend] = useState(false)
    const [isResending, setIsResending] = useState(false)

    // Countdown timer logic
    useEffect(() => {
        if (timeLeft > 0) {
            const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
            return () => clearTimeout(timerId)
        } else {
            setCanResend(true)
        }
    }, [timeLeft])

    const handleResend = async () => {
        if (!canResend) return

        setIsResending(true)
        try {
            await onResend()
            setTimeLeft(60)
            setCanResend(false)
            setOtp('') // Optional: clear input on resend
        } catch (err) {
            console.error('Failed to resend OTP', err)
        } finally {
            setIsResending(false)
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (otp.length === 6) {
            onVerify(otp)
        }
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900">Two-Factor Authentication</h3>
                <p className="mt-2 text-sm text-gray-600">
                    We sent a 6-digit code to <strong>{emailMasked}</strong>.
                    <br/>
                    Enter it below to continue.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex justify-center">
                    <OtpInput
                        value={otp}
                        onChange={setOtp}
                        disabled={isLoading}
                        length={6}
                    />
                </div>

                {error && (
                    <div className="text-center text-sm text-red-600 bg-red-50 p-2 rounded">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={otp.length !== 6 || isLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Verifying...' : 'Verify Code'}
                </button>
            </form>

            <div className="flex flex-col items-center gap-4 text-sm">
                <div className="text-gray-600">
                    Didn't receive the code?{' '}
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={!canResend || isResending}
                        className={`font-medium focus:outline-none ${
                            canResend
                                ? 'text-blue-600 hover:text-blue-500 underline'
                                : 'text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        {isResending ? 'Sending...' : canResend ? 'Resend' : `Resend in ${timeLeft}s`}
                    </button>
                </div>

                <button
                    type="button"
                    onClick={onUseBackup}
                    className="text-gray-500 hover:text-gray-700 font-medium underline"
                >
                    Use a backup code instead
                </button>
            </div>
        </div>
    )
}