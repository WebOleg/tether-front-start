import React, { useState } from 'react'

interface BackupCodeEntryProps {
    onVerify: (code: string) => void
    onBack: () => void
    isLoading?: boolean
    error?: string | null
}

export function BackupCodeEntry({
    onVerify,
    onBack,
    isLoading = false,
    error,
}: BackupCodeEntryProps) {
    const [code, setCode] = useState('')

    /**
     * Handle input changes to enforce XXXX-XXXX format.
     */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.toUpperCase()

        // Remove any non-alphanumeric characters
        value = value.replace(/[^A-Z0-9]/g, '')

        // Limit to 8 characters (excluding hyphen)
        if (value.length > 8) {
            value = value.slice(0, 8)
        }

        // Insert hyphen after 4th character
        if (value.length > 4) {
            value = value.slice(0, 4) + '-' + value.slice(4)
        }

        setCode(value)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // Verify only if full format is met (9 chars including hyphen)
        if (code.length === 9) {
            onVerify(code)
        }
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900">Enter Backup Code</h3>
                <p className="mt-2 text-sm text-gray-600">
                    Enter one of the 8-character recovery codes you saved during setup.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="backup-code" className="sr-only">
                        Backup Code
                    </label>
                    <input
                        id="backup-code"
                        type="text"
                        value={code}
                        onChange={handleChange}
                        placeholder="XXXX-XXXX"
                        maxLength={9}
                        disabled={isLoading}
                        className="block w-full text-center text-2xl font-mono tracking-widest border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-lg p-3 uppercase placeholder-gray-300"
                        autoComplete="off"
                    />
                </div>

                {error && (
                    <div className="text-center text-sm text-red-600 bg-red-50 p-2 rounded">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={code.length !== 9 || isLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Verifying...' : 'Verify Backup Code'}
                </button>
            </form>

            <div className="text-center">
                <button
                    type="button"
                    onClick={onBack}
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                    &larr; Back to OTP verification
                </button>
            </div>
        </div>
    )
}