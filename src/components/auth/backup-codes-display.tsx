import React, { useState } from 'react'

interface BackupCodesDisplayProps {
    codes: string[]
    onConfirm: () => void
    isLoading?: boolean
}

export function BackupCodesDisplay({ codes, onConfirm, isLoading = false }: BackupCodesDisplayProps) {
    const [hasCopied, setHasCopied] = useState(false)
    const [isAcknowledged, setIsAcknowledged] = useState(false)

    /**
     * Copy codes to clipboard.
     */
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(codes.join('\n'))
            setHasCopied(true)
            setTimeout(() => setHasCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy codes', err)
        }
    }

    /**
     * Download codes as a .txt file.
     */
    const handleDownload = () => {
        const element = document.createElement('a')
        const file = new Blob([codes.join('\n')], { type: 'text/plain' })
        element.href = URL.createObjectURL(file)
        element.download = 'tether-recovery-codes.txt'
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900">Save your backup codes</h3>
                <p className="mt-2 text-sm text-gray-600">
                    If you lose access to your device, these codes will be the only way to recover your account.
                    <strong> Keep them safe.</strong>
                </p>
            </div>

            {/* Codes Grid */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="grid grid-cols-2 gap-3 text-center">
                    {codes.map((code, index) => (
                        <code key={index} className="font-mono text-sm font-semibold text-gray-800 tracking-wider">
                            {code}
                        </code>
                    ))}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={handleCopy}
                    className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    {hasCopied ? (
                        <span className="text-green-600">Copied!</span>
                    ) : (
                        <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy Codes
                        </>
                    )}
                </button>

                <button
                    type="button"
                    onClick={handleDownload}
                    className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download .txt
                </button>
            </div>

            {/* Acknowledgment Checkbox */}
            <div className="flex items-start">
                <div className="flex items-center h-5">
                    <input
                        id="acknowledge"
                        name="acknowledge"
                        type="checkbox"
                        checked={isAcknowledged}
                        onChange={(e) => setIsAcknowledged(e.target.checked)}
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                </div>
                <div className="ml-3 text-sm">
                    <label htmlFor="acknowledge" className="font-medium text-gray-700">
                        I have saved these codes in a secure place.
                    </label>
                </div>
            </div>

            {/* Submit Button */}
            <button
                type="button"
                onClick={onConfirm}
                disabled={!isAcknowledged || isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <span className="flex items-center">
             <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
             Processing...
          </span>
                ) : (
                    'Continue'
                )}
            </button>
        </div>
    )
}