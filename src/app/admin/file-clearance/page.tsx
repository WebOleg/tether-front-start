'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { api, ApiError } from '@/lib/api'
import type { FileClearanceStatus } from '@/lib/api'
import { toast } from 'sonner'
import { formatFileSize } from '@/lib/utils'
import {
    FileCheck,
    FileUp,
    FileSpreadsheet,
    Download,
    Loader2,
    CheckCircle,
    XCircle,
    AlertCircle,
    ShieldCheck,
    ShieldX,
    RefreshCw,
    X,
    ArrowRight,
    Sparkles,
    Ban,
    Search,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'

const VALID_EXTENSIONS = ['.csv', '.txt', '.xlsx', '.xls']
const VALID_MIMES = [
    'text/csv',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
]

function isValidFile(file: File): boolean {
    const hasExt = VALID_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))
    const hasMime = VALID_MIMES.includes(file.type)
    return hasExt || hasMime
}

export default function FileClearancePage() {
    const [file, setFile] = useState<File | null>(null)
    const [isDragActive, setIsDragActive] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const [token, setToken] = useState<string | null>(null)
    const [status, setStatus] = useState<string | null>(null)
    const [progress, setProgress] = useState<FileClearanceStatus | null>(null)
    const [result, setResult] = useState<FileClearanceStatus | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const dropZoneRef = useRef<HTMLDivElement>(null)
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const STORAGE_KEY = 'file_clearance_token'

    // Restore active session on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (!saved) return

        try {
            const parsed = JSON.parse(saved)
            const { token: savedToken, originalFile, status: savedStatus, result: savedResult } = parsed

            if (!savedToken) return

            // Restore completed results directly
            if (savedStatus === 'completed' && savedResult) {
                setToken(savedToken)
                setStatus('completed')
                setProgress(savedResult)
                setResult(savedResult)
                return
            }

            // Restore in-progress — polling will pick it up
            setToken(savedToken)
            setStatus('processing')
            setProgress({
                status: 'processing',
                total_rows: 0,
                processed: 0,
                cleared_rows: 0,
                excluded_rows: 0,
                vop_resolved: 0,
                vop_failed: 0,
                progress: 0,
                error: null,
                headers: null,
                excluded_details: null,
                original_file: originalFile || null,
                completed_at: null,
            })
        } catch {
            localStorage.removeItem(STORAGE_KEY)
        }
    }, [])

    // Persist token when it changes
    useEffect(() => {
        if (token && status && status !== 'completed' && status !== 'failed') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                token,
                originalFile: progress?.original_file || null,
            }))
        }
    }, [token, status, progress?.original_file])

    const reset = useCallback(() => {
        setFile(null)
        setError(null)
        setToken(null)
        setStatus(null)
        setProgress(null)
        setResult(null)
        setIsUploading(false)
        setIsDownloading(false)
        localStorage.removeItem(STORAGE_KEY)
        if (pollRef.current) clearInterval(pollRef.current)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }, [])

    const pickFile = useCallback((f: File | null) => {
        if (!f) return
        if (!isValidFile(f)) {
            setError('Invalid file type. Upload CSV, TXT, XLSX, or XLS.')
            return
        }
        if (f.size > 50 * 1024 * 1024) {
            setError('File too large. Maximum size is 50MB.')
            return
        }
        setFile(f)
        setError(null)
        setResult(null)
        setToken(null)
        setStatus(null)
    }, [])

    const handleSubmit = useCallback(async () => {
        if (!file) return
        setError(null)
        setIsUploading(true)

        try {
            const res = await api.uploadFileClearance(file)
            setToken(res.data.token)
            setStatus('queued')
            setProgress({
                status: 'queued',
                total_rows: res.data.total_rows,
                processed: 0,
                cleared_rows: 0,
                excluded_rows: 0,
                vop_resolved: 0,
                vop_failed: 0,
                progress: 0,
                error: null,
                headers: null,
                excluded_details: null,
                original_file: res.data.original_file,
                completed_at: null,
            })
            toast.success('File accepted — processing in background')
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message)
            } else {
                setError('Upload failed. Please try again.')
            }
        } finally {
            setIsUploading(false)
        }
    }, [file])

    const handleDownload = useCallback(async () => {
        if (!token || !result) return
        setIsDownloading(true)
        try {
            const blob = await api.downloadFileClearance(token)
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = result.original_file
                ? result.original_file.replace(/\.[^.]+$/, '_cleared.csv')
                : 'cleared.csv'
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            a.remove()
            toast.success('Download started')
        } catch {
            toast.error('Download failed. Please try again.')
        } finally {
            setIsDownloading(false)
        }
    }, [token, result])

    // Polling
    useEffect(() => {
        if (!token || status === 'completed' || status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current)
            return
        }

        const poll = async () => {
            try {
                const d = await api.getFileClearanceStatus(token)
                setProgress(d)
                setStatus(d.status)

                if (d.status === 'completed') {
                    setResult(d)
                    localStorage.setItem(STORAGE_KEY, JSON.stringify({
                        token: token,
                        originalFile: d.original_file,
                        status: 'completed',
                        result: d,
                    }))
                    toast.success(`Clearance complete — ${d.cleared_rows} rows cleared`)
                    if (pollRef.current) clearInterval(pollRef.current)
                } else if (d.status === 'failed') {
                    setError(d.error || 'Processing failed.')
                    localStorage.removeItem(STORAGE_KEY)
                    if (pollRef.current) clearInterval(pollRef.current)
                }
            } catch {
                // retry next tick
            }
        }

        poll()
        pollRef.current = setInterval(poll, 2000)
        return () => { if (pollRef.current) clearInterval(pollRef.current) }
    }, [token, status])

    const isIdle = !status && !result
    const isProcessing = status === 'queued' || status === 'processing'
    const isDone = status === 'completed' && result
    const isFailed = status === 'failed'

    const clearanceRate = result && result.total_rows > 0
        ? Math.round((result.cleared_rows / result.total_rows) * 100)
        : null

    return (
        <>
            <Header
                title="File Clearance"
                description="Resolve BICs via VOP and filter out blacklisted IBANs & BICs"
            />
            <div className="p-6 space-y-6">

                {/* ─── UPLOAD ZONE ─── */}
                {isIdle && (
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileCheck className="h-5 w-5 text-slate-500" />
                                    <CardTitle>Upload File</CardTitle>
                                </div>
                                <Badge variant="outline" className="text-xs font-normal text-slate-500">
                                    Only IBAN column required
                                </Badge>
                            </div>
                            <CardDescription>
                                Upload a CSV, TXT or XLSX file to clean. BICs are resolved via VOP, then blacklisted IBANs, BICs, names and emails are filtered out.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Drop zone */}
                            <div
                                ref={dropZoneRef}
                                onClick={() => fileInputRef.current?.click()}
                                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(true) }}
                                onDragLeave={(e) => {
                                    e.preventDefault(); e.stopPropagation()
                                    if (e.relatedTarget && dropZoneRef.current?.contains(e.relatedTarget as Node)) return
                                    setIsDragActive(false)
                                }}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                                onDrop={(e) => {
                                    e.preventDefault(); e.stopPropagation(); setIsDragActive(false)
                                    pickFile(e.dataTransfer.files?.[0] ?? null)
                                }}
                                className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer ${
                                    isDragActive
                                        ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
                                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100/50'
                                }`}
                            >
                                <div className={`p-3 rounded-full ${isDragActive ? 'bg-blue-100' : 'bg-white shadow-sm ring-1 ring-slate-200'}`}>
                                    <FileUp className={`h-6 w-6 ${isDragActive ? 'text-blue-600' : 'text-slate-400'}`} />
                                </div>
                                <div className="text-center">
                                    <p className={`font-medium ${isDragActive ? 'text-blue-700' : 'text-slate-700'}`}>
                                        {isDragActive ? 'Drop your file here' : 'Click to upload or drag and drop'}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">CSV, TXT, XLSX, XLS — max 50MB</p>
                                </div>
                                <Input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,.txt,.xlsx,.xls"
                                    onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                                    className="hidden"
                                    disabled={isUploading}
                                />
                            </div>

                            {/* Pipeline visual */}
                            <div className="flex items-center justify-center gap-2 py-2 text-xs text-slate-400">
                                <span className="flex items-center gap-1"><FileSpreadsheet className="h-3 w-3" /> Upload</span>
                                <ArrowRight className="h-3 w-3" />
                                <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> VOP BIC</span>
                                <ArrowRight className="h-3 w-3" />
                                <span className="flex items-center gap-1"><Ban className="h-3 w-3" /> Blacklist</span>
                                <ArrowRight className="h-3 w-3" />
                                <span className="flex items-center gap-1"><Download className="h-3 w-3" /> CSV</span>
                            </div>

                            {/* Selected file */}
                            {file && !error && (
                                <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-50 rounded-md">
                                            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{file.name}</p>
                                            <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); reset() }}>
                                            <X className="h-3.5 w-3.5 text-slate-400" />
                                        </Button>
                                        <Button onClick={handleSubmit} disabled={isUploading} size="sm" className="gap-1.5">
                                            {isUploading ? (
                                                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...</>
                                            ) : (
                                                <><Sparkles className="h-3.5 w-3.5" /> Run Clearance</>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Error */}
                            {error && !isProcessing && !isDone && (
                                <div className="p-3 rounded-lg border bg-red-50 text-red-700 border-red-200">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                        <span className="text-sm font-medium">{error}</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* ─── PROCESSING ─── */}
                {isProcessing && progress && (
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                                    <CardTitle className="text-base">Processing</CardTitle>
                                </div>
                                <Badge variant="outline" className="font-mono text-xs">
                                    {progress.processed.toLocaleString()} / {progress.total_rows.toLocaleString()}
                                </Badge>
                            </div>
                            {progress.original_file && (
                                <CardDescription className="truncate">{progress.original_file}</CardDescription>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                                    <span>Resolving BICs &amp; checking blacklists…</span>
                                    <span className="font-mono font-medium">{progress.progress}%</span>
                                </div>
                                <Progress value={progress.progress} className="h-2" />
                            </div>

                            {/* Live counters */}
                            <div className="grid grid-cols-4 gap-3">
                                <div className="rounded-lg border bg-slate-50 p-3 text-center">
                                    <div className="text-lg font-bold text-slate-700">{progress.processed.toLocaleString()}</div>
                                    <div className="text-xs text-slate-400">Processed</div>
                                </div>
                                <div className="rounded-lg border bg-emerald-50 border-emerald-100 p-3 text-center">
                                    <div className="text-lg font-bold text-emerald-600">{progress.cleared_rows.toLocaleString()}</div>
                                    <div className="text-xs text-emerald-500">Cleared</div>
                                </div>
                                <div className="rounded-lg border bg-red-50 border-red-100 p-3 text-center">
                                    <div className="text-lg font-bold text-red-600">{progress.excluded_rows.toLocaleString()}</div>
                                    <div className="text-xs text-red-400">Excluded</div>
                                </div>
                                <div className="rounded-lg border bg-blue-50 border-blue-100 p-3 text-center">
                                    <div className="text-lg font-bold text-blue-600">{progress.vop_resolved.toLocaleString()}</div>
                                    <div className="text-xs text-blue-400">VOP Resolved</div>
                                </div>
                            </div>

                            <p className="text-xs text-slate-400 text-center">Processing runs in the background — you can leave this page</p>
                        </CardContent>
                    </Card>
                )}

                {/* ─── FAILED ─── */}
                {isFailed && (
                    <Card className="border-red-200">
                        <CardContent className="py-8">
                            <div className="flex flex-col items-center gap-3 text-center">
                                <div className="p-3 rounded-full bg-red-50">
                                    <AlertCircle className="h-6 w-6 text-red-500" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">Processing Failed</p>
                                    <p className="text-sm text-red-600 mt-1 max-w-md">{error || 'An unexpected error occurred.'}</p>
                                </div>
                                <Button variant="outline" onClick={reset} size="sm" className="mt-2 gap-1.5">
                                    <RefreshCw className="h-3.5 w-3.5" /> Try again
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ─── RESULTS ─── */}
                {isDone && (
                    <>
                        {/* Summary bar */}
                        <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0">
                            <CardContent className="py-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 rounded-lg bg-white/10">
                                            <FileCheck className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-300">Clearance Complete</p>
                                            <div className="flex items-baseline gap-3 mt-0.5">
                                                <span className="text-2xl font-bold">{result.cleared_rows.toLocaleString()}</span>
                                                <span className="text-sm text-slate-400">
                          of {result.total_rows.toLocaleString()} rows cleared
                                                    {clearanceRate !== null && (
                                                        <span className="ml-1.5 text-emerald-400 font-medium">({clearanceRate}%)</span>
                                                    )}
                        </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={reset}
                                            className="gap-1.5 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white bg-transparent"
                                        >
                                            <RefreshCw className="h-3.5 w-3.5" /> New File
                                        </Button>
                                        <Button
                                            onClick={handleDownload}
                                            disabled={isDownloading}
                                            size="sm"
                                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
                                        >
                                            {isDownloading ? (
                                                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Downloading...</>
                                            ) : (
                                                <><Download className="h-3.5 w-3.5" /> Download CSV</>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Stat cards */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="rounded-lg border bg-white p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total</span>
                                    <FileSpreadsheet className="h-4 w-4 text-slate-400" />
                                </div>
                                <div className="text-2xl font-bold text-slate-700">{result.total_rows.toLocaleString()}</div>
                            </div>
                            <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Cleared</span>
                                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                                </div>
                                <div className="text-2xl font-bold text-emerald-600">{result.cleared_rows.toLocaleString()}</div>
                            </div>
                            <div className={`rounded-lg border p-4 ${result.excluded_rows > 0 ? 'border-red-100 bg-red-50/50' : 'bg-white'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-xs font-medium uppercase tracking-wide ${result.excluded_rows > 0 ? 'text-red-600' : 'text-slate-500'}`}>Excluded</span>
                                    <XCircle className={`h-4 w-4 ${result.excluded_rows > 0 ? 'text-red-500' : 'text-slate-400'}`} />
                                </div>
                                <div className={`text-2xl font-bold ${result.excluded_rows > 0 ? 'text-red-600' : 'text-slate-700'}`}>{result.excluded_rows.toLocaleString()}</div>
                            </div>
                            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">BIC Resolved</span>
                                    <ShieldCheck className="h-4 w-4 text-blue-500" />
                                </div>
                                <div className="text-2xl font-bold text-blue-600">{result.vop_resolved.toLocaleString()}</div>
                            </div>
                            <div className={`rounded-lg border p-4 ${result.vop_failed > 0 ? 'border-yellow-100 bg-yellow-50/50' : 'bg-white'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-xs font-medium uppercase tracking-wide ${result.vop_failed > 0 ? 'text-yellow-600' : 'text-slate-500'}`}>VOP Failed</span>
                                    <ShieldX className={`h-4 w-4 ${result.vop_failed > 0 ? 'text-yellow-500' : 'text-slate-400'}`} />
                                </div>
                                <div className={`text-2xl font-bold ${result.vop_failed > 0 ? 'text-yellow-600' : 'text-slate-700'}`}>{result.vop_failed.toLocaleString()}</div>
                            </div>
                        </div>

                        {/* Output columns */}
                        {/* Output columns */}
                        {result.headers && result.headers.length > 0 && (
                            <Card>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-medium text-slate-600">Output Columns</CardTitle>
                                        <Badge variant="outline" className="text-xs font-normal text-slate-400">
                                            {result.headers.length} columns
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                                        {result.headers.map((h, i) => (
                                            <div
                                                key={h}
                                                className="flex items-center gap-2 rounded-md border bg-slate-50 px-2.5 py-1.5"
                                            >
                                                <span className="text-[10px] font-medium text-slate-300">{i + 1}</span>
                                                <span className="font-mono text-xs text-slate-700 truncate">{h}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Excluded details table */}
                        {result.excluded_details && result.excluded_details.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-2 px-1">
                                    <h3 className="text-sm font-semibold text-slate-900">
                                        Excluded Rows
                                        <span className="ml-1.5 text-xs font-normal text-slate-400">({result.excluded_rows.toLocaleString()} total)</span>
                                    </h3>
                                </div>
                                <div className="bg-white rounded-lg border overflow-hidden">
                                    <div className="max-h-96 overflow-y-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-16">Row</TableHead>
                                                    <TableHead>IBAN</TableHead>
                                                    <TableHead className="w-28">BIC</TableHead>
                                                    <TableHead>Reasons</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {result.excluded_details.map((row, i) => (
                                                    <TableRow key={i} className="hover:bg-slate-50">
                                                        <TableCell className="font-mono text-xs text-slate-400">{row.row_index}</TableCell>
                                                        <TableCell className="font-mono text-sm">{row.iban || <span className="text-slate-300">—</span>}</TableCell>
                                                        <TableCell className="font-mono text-sm text-slate-500">{row.bic || <span className="text-slate-300">—</span>}</TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-wrap gap-1">
                                                                {row.reasons.map((r, ri) => (
                                                                    <Badge
                                                                        key={ri}
                                                                        className="text-[11px] font-normal bg-red-100 text-red-700 border-red-200 hover:bg-red-100"
                                                                    >
                                                                        {r}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    )
}
