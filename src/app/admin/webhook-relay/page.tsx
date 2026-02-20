'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Header } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { api } from '@/lib/api'
import { Pagination, PaginationMeta } from '@/components/ui/pagination'
import { PaginationLink, PaginationLinks, PaginationMeta as PaginationMetaType, EmpAccountRef } from '@/types'
import { Plus, Pencil, Trash2, Globe, Link as LinkIcon, Server, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

// Types based on the backend resources
interface WebhookRelay {
    id: number
    domain: string
    target: string
    emp_accounts: EmpAccountRef[]
    created_at: string
}

interface WebhookRelayForm {
    domain: string
    target: string
    emp_account_ids: number[]
}

function SkeletonTableRow() {
    return (
        <TableRow>
            <TableCell><Skeleton className="h-5 w-40" /></TableCell>
            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
            <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                    <Skeleton className="h-9 w-9 rounded" />
                    <Skeleton className="h-9 w-9 rounded" />
                </div>
            </TableCell>
        </TableRow>
    )
}

export default function WebhookRelayPage() {
    const [relays, setRelays] = useState<WebhookRelay[]>([])
    const [loading, setLoading] = useState(true)
    const [empAccounts, setEmpAccounts] = useState<EmpAccountRef[]>([])
    const [empAccountsLoading, setEmpAccountsLoading] = useState(false)

    // Dialog & Form States
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [deployStatus, setDeployStatus] = useState<'Idle' | 'Syncing' | 'Error'>('Idle')

    // Delete State
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1)
    const [meta, setMeta] = useState<PaginationMetaType | null>(null)
    const [links, setLinks] = useState<PaginationLinks | null>(null)
    const [paginationLinks, setPaginationLinks] = useState<PaginationLink[]>([])

    const [formData, setFormData] = useState<WebhookRelayForm>({
        domain: '',
        target: '',
        emp_account_ids: []
    })

    const [errors, setErrors] = useState<{ domain?: string, target?: string, accounts?: string }>({})

    useEffect(() => {
        fetchRelays(currentPage)
        // Ensure we have EMP accounts loaded for the assignment checkboxes
        fetchEmpAccounts()
    }, [currentPage])

    const fetchRelays = async (page: number = 1) => {
        setLoading(true)
        try {
            const params = { page, per_page: 20 }
            const response = await api.getWebhookRelays(params)
            setRelays(response.data || [])
            setMeta(response.meta || null)
            setLinks(response.links || null)

            if (response.meta && 'links' in response.meta) {
                setPaginationLinks((response.meta as any).links || [])
            }
        } catch (error) {
            toast.error('Failed to fetch webhook relays')
        } finally {
            setLoading(false)
        }
    }

    const fetchEmpAccounts = async () => {
        setEmpAccountsLoading(true)
        try {
            const accounts = await api.getEmpAccounts()
            setEmpAccounts(accounts || [])
        } catch (error) {
            console.error('Failed to fetch EMP accounts', error)
        } finally {
            setEmpAccountsLoading(false)
        }
    }

    const handleOpenDialog = (relay?: WebhookRelay) => {
        setErrors({})
        setDeployStatus('Idle')

        if (relay) {
            setEditingId(relay.id)
            setFormData({
                domain: relay.domain,
                target: relay.target,
                emp_account_ids: relay.emp_accounts?.map(acc => acc.id) || []
            })
        } else {
            setEditingId(null)
            setFormData({
                domain: '',
                target: '',
                emp_account_ids: []
            })
        }
        setIsDialogOpen(true)
    }

    const validateForm = () => {
        const newErrors: typeof errors = {}
        let isValid = true

        if (!formData.domain) {
            newErrors.domain = "Incoming domain is required"
            isValid = false
        } else if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.domain)) {
            newErrors.domain = "Invalid domain format"
            isValid = false
        }

        if (!formData.target) {
            newErrors.target = "Target route is required"
            isValid = false
        } else if (!formData.target.startsWith('http://') && !formData.target.startsWith('https://')) {
            newErrors.target = "Target must be a valid URL starting with http:// or https://"
            isValid = false
        }

        if (formData.emp_account_ids.length === 0) {
            newErrors.accounts = "At least one EMP account must be selected"
            isValid = false
        }

        setErrors(newErrors)
        return isValid
    }

    const handleToggleAccount = (accountId: number) => {
        setFormData(prev => {
            const isSelected = prev.emp_account_ids.includes(accountId)
            return {
                ...prev,
                emp_account_ids: isSelected
                    ? prev.emp_account_ids.filter(id => id !== accountId)
                    : [...prev.emp_account_ids, accountId]
            }
        })
        if (errors.accounts) setErrors(prev => ({ ...prev, accounts: undefined }))
    }

    const handleDeploy = async () => {
        if (!validateForm()) return

        setDeployStatus('Syncing')
        try {
            if (editingId) {
                await api.updateWebhookRelay(editingId, formData)
                toast.success('Relay configuration updated and deployed')
            } else {
                await api.createWebhookRelay(formData)
                toast.success('Webhook relay created and deployed successfully')
            }
            setIsDialogOpen(false)
            fetchRelays(currentPage)
        } catch (error: any) {
            setDeployStatus('Error')
            const errorMessage = error.response?.data?.message || error.message || 'Deployment failed'
            toast.error(`Deployment Error: ${errorMessage}`)
        }
    }

    const handleDelete = async () => {
        if (!deletingId) return
        setIsDeleting(true)
        try {
            await api.deleteWebhookRelay(deletingId)
            setRelays(prev => prev.filter(relay => relay.id !== deletingId))
            toast.success('Webhook relay deleted successfully')
            setDeletingId(null)
        } catch (error) {
            toast.error('Failed to remove relay configuration')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <>
            <Header
                title="Webhook Relays"
                description="Manage disposable domains and forward incoming EMP webhooks to your main application."
            />

            <div className="p-6">
                <div className="flex justify-end mb-4">
                    <Button onClick={() => handleOpenDialog()} disabled={loading}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Webhook Relay
                    </Button>
                </div>

                {meta && <PaginationMeta meta={meta} label="Relays" containerClassName='px-2' />}

                <div className="rounded-lg border bg-white overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Incoming Domain</TableHead>
                                <TableHead>Target Route</TableHead>
                                <TableHead>Assigned Accounts</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                [...Array(5)].map((_, i) => <SkeletonTableRow key={i} />)
                            ) : relays.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                        No active webhook relays found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                relays.map((relay) => (
                                    <TableRow key={relay.id} className="transition-opacity duration-300">
                                        <TableCell className="font-medium font-mono text-slate-700">
                                            <div className="flex items-center gap-2">
                                                <Globe className="h-4 w-4 text-slate-400" />
                                                {relay.domain}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-slate-500 font-mono text-sm">
                                            <div className="flex items-center gap-2">
                                                <LinkIcon className="h-4 w-4 text-slate-400" />
                                                <span className="truncate max-w-[250px] block" title={relay.target}>
                                                    {relay.target}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {relay.emp_accounts?.slice(0, 3).map(acc => (
                                                    <Badge key={acc.id} variant="secondary" className="text-xs bg-slate-100">
                                                        {acc.name}
                                                    </Badge>
                                                ))}
                                                {(relay.emp_accounts?.length || 0) > 3 && (
                                                    <Badge variant="secondary" className="text-xs bg-slate-100">
                                                        +{relay.emp_accounts.length - 3} more
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                                <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="default" size="icon-sm" onClick={() => handleOpenDialog(relay)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="destructive" size="icon-sm" onClick={() => setDeletingId(relay.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination
                    meta={meta}
                    links={links}
                    paginationLinks={paginationLinks}
                    onPageChange={setCurrentPage}
                    onPreviousClick={() => currentPage > 1 && setCurrentPage(p => p - 1)}
                    onNextClick={() => meta && currentPage < meta.last_page && setCurrentPage(p => p + 1)}
                />
            </div>

            {/* Deploy Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={(isOpen) => !isOpen && deployStatus !== 'Syncing' && setIsDialogOpen(false)}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit Webhook Relay' : 'Add Webhook Relay'}</DialogTitle>
                        <DialogDescription>
                            Configure a disposable domain to listen for incoming webhooks and forward them to your main server.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-5 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="domain">Incoming Domain *</Label>
                            <Input
                                id="domain"
                                placeholder="e.g. test-domain.com"
                                value={formData.domain}
                                onChange={(e) => {
                                    setFormData(p => ({ ...p, domain: e.target.value.toLowerCase() }))
                                    if (errors.domain) setErrors(p => ({ ...p, domain: undefined }))
                                }}
                                className={`font-mono ${errors.domain ? "border-red-500" : ""}`}
                                disabled={deployStatus === 'Syncing'}
                            />
                            {errors.domain && <p className="text-xs text-red-500 font-medium">{errors.domain}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="target">Target Route (Main Server) *</Label>
                            <Input
                                id="target"
                                placeholder="e.g. https://main-server.com/webhooks/emp"
                                value={formData.target}
                                onChange={(e) => {
                                    setFormData(p => ({ ...p, target: e.target.value }))
                                    if (errors.target) setErrors(p => ({ ...p, target: undefined }))
                                }}
                                className={`font-mono ${errors.target ? "border-red-500" : ""}`}
                                disabled={deployStatus === 'Syncing'}
                            />
                            {errors.target ? (
                                <p className="text-xs text-red-500 font-medium">{errors.target}</p>
                            ) : (
                                <p className="text-xs text-slate-500">The main server endpoint where EMP webhooks should be forwarded.</p>
                            )}
                        </div>

                        <div className="space-y-3">
                            <Label>Assign EMP Accounts *</Label>
                            {empAccountsLoading ? (
                                <Skeleton className="h-24 w-full rounded-md" />
                            ) : (
                                <div className={`grid grid-cols-2 gap-2 p-3 border rounded-md max-h-48 overflow-y-auto ${errors.accounts ? "border-red-300 bg-red-50" : "bg-slate-50"}`}>
                                    {empAccounts.map(account => {
                                        const isSelected = formData.emp_account_ids.includes(account.id)
                                        return (
                                            <div
                                                key={account.id}
                                                onClick={() => deployStatus !== 'Syncing' && handleToggleAccount(account.id)}
                                                className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors border ${
                                                    isSelected
                                                        ? 'bg-blue-50 border-blue-200 text-blue-800'
                                                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                                }`}
                                            >
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                                    isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                                                }`}>
                                                    {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                                </div>
                                                <span className="text-sm font-medium">{account.name}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                            {errors.accounts && <p className="text-xs text-red-500 font-medium">{errors.accounts}</p>}
                        </div>

                        {/* Live Status Indicator for the deployment process */}
                        {deployStatus !== 'Idle' && (
                            <div className={`flex items-center gap-2 p-3 rounded-md border ${
                                deployStatus === 'Syncing' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                    'bg-red-50 border-red-200 text-red-700'
                            }`}>
                                {deployStatus === 'Syncing' ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> <span>Deploying configuration to remote server...</span></>
                                ) : (
                                    <><AlertCircle className="w-4 h-4" /> <span>Deployment failed. Check server parameters.</span></>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            disabled={deployStatus === 'Syncing'}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDeploy}
                            disabled={deployStatus === 'Syncing'}
                            className="bg-slate-900"
                        >
                            {deployStatus === 'Syncing' ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {editingId ? 'Updating...' : 'Deploying...'}</>
                            ) : (
                                <><Server className="mr-2 h-4 w-4" /> {editingId ? 'Update Relay' : 'Deploy Relay'}</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Webhook Relay?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the webhook relay and remove the Nginx proxy configuration from the remote server. Traffic to this domain will no longer be forwarded.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Delete Relay
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}