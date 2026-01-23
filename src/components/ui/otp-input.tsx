import React, { useRef, useEffect, KeyboardEvent, ClipboardEvent, ChangeEvent } from 'react'

interface OtpInputProps {
    length?: number
    value: string
    onChange: (value: string) => void
    disabled?: boolean
    className?: string
}

export function OtpInput({
                             length = 6,
                             value,
                             onChange,
                             disabled = false,
                             className = '',
                         }: OtpInputProps) {
    // Array of refs to manage focus for each input field
    const inputRefs = useRef<(HTMLInputElement | null)[]>([])

    // Initialize refs array based on length
    useEffect(() => {
        inputRefs.current = inputRefs.current.slice(0, length)
    }, [length])

    /**
     * Handle individual input changes.
     */
    const handleChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
        const newValue = e.target.value

        // Allow only numeric input
        if (!/^\d*$/.test(newValue)) return

        // Take only the last character entered (prevents stacking chars in one input)
        const char = newValue.substring(newValue.length - 1)

        const newOtp = value.split('')
        // Ensure array is correct length padded with empty strings
        while (newOtp.length < length) newOtp.push('')

        newOtp[index] = char
        const combinedOtp = newOtp.join('').substring(0, length)

        onChange(combinedOtp)

        // Auto-focus next input if a character was added
        if (char && index < length - 1 && inputRefs.current[index + 1]) {
            inputRefs.current[index + 1]?.focus()
        }
    }

    /**
     * Handle Backspace and Navigation keys.
     */
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace') {
            // If current input is empty, move focus to previous and delete that one
            if (!value[index] && index > 0 && inputRefs.current[index - 1]) {
                inputRefs.current[index - 1]?.focus()
                // Determine new value by removing the char at index-1
                const newOtp = value.split('')
                newOtp[index - 1] = ''
                onChange(newOtp.join(''))
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            e.preventDefault()
            inputRefs.current[index - 1]?.focus()
        } else if (e.key === 'ArrowRight' && index < length - 1) {
            e.preventDefault()
            inputRefs.current[index + 1]?.focus()
        }
    }

    /**
     * Handle Paste event (splits digits across inputs).
     */
    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault()
        if (disabled) return

        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
        if (!pastedData) return

        onChange(pastedData)

        // Focus the last input filled or the next empty one
        const focusIndex = Math.min(pastedData.length, length - 1)
        inputRefs.current[focusIndex]?.focus()
    }

    return (
        <div className={`flex gap-2 ${className}`}>
            {Array.from({ length }).map((_, index) => (
                <input
                    key={index}
                    ref={(el) => {
                        inputRefs.current[index] = el
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={value[index] || ''}
                    disabled={disabled}
                    onChange={(e) => handleChange(e, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onPaste={handlePaste}
                    aria-label={`Digit ${index + 1}`}
                    className={`
            w-10 h-12 text-center text-xl font-bold rounded-md border 
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
            ${value[index] ? 'border-blue-500' : 'border-gray-300'}
          `}
                />
            ))}
        </div>
    )
}