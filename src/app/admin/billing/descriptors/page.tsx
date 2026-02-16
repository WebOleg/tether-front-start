'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
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
import { EmpAccountRef } from '@/types'
import { Plus, Pencil, Trash2, Calendar, ShieldCheck, Loader2 } from 'lucide-react'

export interface TransactionDescriptor {
    id: number
    descriptor_name: string
    descriptor_city: string
    descriptor_country: string
    is_default: boolean
    month?: number
    year?: number
    emp_account_id?: number | null
}

// Alphanumeric, spaces, dots, commas, hyphens.
const DESCRIPTOR_REGEX = /^[a-zA-Z0-9\s.,-]+$/;

const MONTHS = [
    { val: 1, label: 'January' }, { val: 2, label: 'February' },
    { val: 3, label: 'March' }, { val: 4, label: 'April' },
    { val: 5, label: 'May' }, { val: 6, label: 'June' },
    { val: 7, label: 'July' }, { val: 8, label: 'August' },
    { val: 9, label: 'September' }, { val: 10, label: 'October' },
    { val: 11, label: 'November' }, { val: 12, label: 'December' }
];

const currentYear = new Date().getFullYear();
const YEARS = [currentYear, currentYear + 1, currentYear + 2];

// Skeleton Row Component
function SkeletonTableRow() {
    return (
        <TableRow>
            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell><Skeleton className="h-6 w-20 rounded" /></TableCell>
            <TableCell><Skeleton className="h-6 w-28 rounded" /></TableCell>
            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                    <Skeleton className="h-9 w-9 rounded" />
                    <Skeleton className="h-9 w-9 rounded" />
                </div>
            </TableCell>
        </TableRow>
    )
}

export default function DescriptorSchedulePage() {
    const [schedules, setSchedules] = useState<TransactionDescriptor[]>([])
    const [loading, setLoading] = useState(true)
    const [empAccounts, setEmpAccounts] = useState<EmpAccountRef[]>([])
    const [empAccountsLoading, setEmpAccountsLoading] = useState(false)

    // Dialog States
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    // Delete State
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const [removingId, setRemovingId] = useState<number | null>(null)

    // Form State
    const [formData, setFormData] = useState<Omit<TransactionDescriptor, 'id'>>({
        descriptor_name: '',
        descriptor_city: '',
        descriptor_country: '',
        is_default: false,
        month: new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2,
        year: currentYear,
        emp_account_id: null
    })

    // Validation State
    const [errors, setErrors] = useState<{ 
        name?: string
        city?: string
        country?: string
        emp_account?: string 
    }>({})

    useEffect(() => {
        fetchSchedules()
        fetchEmpAccounts()
    }, [])

    const fetchSchedules = async () => {
        setLoading(true)
        try {
            const response = await api.getDescriptors()
            setSchedules(response.data || [])
        } catch (error) {
            console.error('Failed to fetch schedules', error)
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
            console.error('Failed to fetch EMp accounts', error)
        } finally {
            setEmpAccountsLoading(false)
        }
    }

    const handleOpenDialog = (schedule?: TransactionDescriptor) => {
        setErrors({})
        if (schedule) {
            setEditingId(schedule.id)
            setFormData({
                descriptor_name: schedule.descriptor_name,
                descriptor_city: schedule.descriptor_city,
                descriptor_country: schedule.descriptor_country,
                is_default: schedule.is_default,
                month: schedule.month || new Date().getMonth() + 1,
                year: schedule.year || currentYear,
                emp_account_id: schedule.emp_account_id || null
            })
        } else {
            setEditingId(null)
            setFormData({
                descriptor_name: '',
                descriptor_city: '',
                descriptor_country: '',
                is_default: false,
                month: new Date().getMonth() + 2,
                year: currentYear,
                emp_account_id: null
            })
        }
        setIsDialogOpen(true)
    }

    const validateField = (field: 'name' | 'city' | 'country' | 'emp_account', value: string | number | null | undefined) => {
        // EMP Account validation
        if (field === 'emp_account') {
            if (!value) return "EMp Account is required";
            return undefined;
        }

        // Name is strictly required
        if (field === 'name' && !value) return "Required";

        // If City or Country is empty, it's valid (Optional)
        if ((field === 'city' || field === 'country') && !value) return undefined;

        // Strict 3-letter check for Country (Only runs if value is not empty)
        if (field === 'country') {
            if (value && (value as string).length !== 3) return "Must be exactly 3 characters (ISO Alpha-3)";
            if (value && !/^[A-Z]{3}$/.test(value as string)) return "Must be 3 uppercase letters";
            return undefined;
        }

        // Regex check for invalid characters (Only runs if value is not empty)
        if (value && !DESCRIPTOR_REGEX.test(value as string)) {
            return "Invalid characters (A-Z, 0-9, . , - only)";
        }
        return undefined;
    }

    const handleInputChange = (field: keyof typeof formData, value: string | number | null | undefined) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Real-time validation
        if (field === 'descriptor_name') setErrors(e => ({ ...e, name: validateField('name', value) }));
        if (field === 'descriptor_city') setErrors(e => ({ ...e, city: validateField('city', value) }));
        if (field === 'descriptor_country') setErrors(e => ({ ...e, country: validateField('country', value) }));
        if (field === 'emp_account_id') setErrors(e => ({ ...e, emp_account: validateField('emp_account', value) }));
    }

    const handleSave = async () => {
        // Final Validation
        const nameErr = validateField('name', formData.descriptor_name);
        const cityErr = validateField('city', formData.descriptor_city);
        const countryErr = validateField('country', formData.descriptor_country);
        const empAccountErr = validateField('emp_account', formData.emp_account_id);

        if (nameErr || cityErr || countryErr || empAccountErr) {
            setErrors({ name: nameErr, city: cityErr, country: countryErr, emp_account: empAccountErr });
            return;
        }

        setIsSaving(true)
        try {
            const payload = {
                ...formData,
                // If default is ON, ensure month/year are null in DB (or API handles it)
                month: formData.is_default ? undefined : formData.month,
                year: formData.is_default ? undefined : formData.year,
            }

            if (editingId) {
                await api.updateDescriptor(editingId, payload)
            } else {
                await api.createDescriptor(payload)
            }
            setIsDialogOpen(false)
            fetchSchedules()
        } catch (error) {
            console.error('Failed to save', error)
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deletingId) return;
        try {
            await api.deleteDescriptor(deletingId)
            // Trigger animation
            setRemovingId(deletingId)
            // Remove after animation completes (300ms)
            setTimeout(() => {
                setSchedules(prev => prev.filter(schedule => schedule.id !== deletingId))
                setDeletingId(null)
                setRemovingId(null)
            }, 300)
        } catch (error) {
            if (error instanceof Error) {
                console.error('Failed to delete descriptor:', error.message)
            } else {
                console.error('Failed to delete descriptor:', error)
            }
        }
    }

    return (
        <>
            <Header
                title="Billing Descriptors"
                description="Manage dynamic billing descriptors and fallback defaults."
            />

            <div className="p-6">
                <div className="flex justify-end mb-4">
                    <Button onClick={() => handleOpenDialog()} disabled={loading}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Schedule
                    </Button>
                </div>

                <div className="rounded-lg border bg-white overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Descriptor Name</TableHead>
                                <TableHead>City / Country</TableHead>
                                <TableHead>EMP Account</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Effective Date</TableHead>
                                <TableHead className="text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <>
                                    {[...Array(5)].map((_, i) => (
                                        <SkeletonTableRow key={i} />
                                    ))}
                                </>
                            ) : schedules.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                        No active schedules found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                schedules.map((item) => {
                                    const empAccount = empAccounts.find(acc => acc.id === item.emp_account_id);
                                    return (
                                        <TableRow
                                            key={item.id}
                                            className={`${item.is_default ? 'bg-blue-50/30' : ''} ${
                                                removingId === item.id
                                                    ? 'opacity-0 transition-opacity duration-300'
                                                    : 'opacity-100 transition-opacity duration-300'
                                            }`}
                                        >
                                            <TableCell className="font-medium font-mono text-slate-700">
                                                {item.descriptor_name}
                                            </TableCell>
                                            <TableCell className="text-slate-600">
                                                {[item.descriptor_city, item.descriptor_country]
                                                    .filter(Boolean)
                                                    .join(', ')}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {empAccount ? (
                                                    <Badge variant="secondary">{empAccount.name}</Badge>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {item.is_default ? (
                                                    <Badge className="bg-blue-600 hover:bg-blue-700">
                                                        <ShieldCheck className="w-3 h-3 mr-1" /> Default Fallback
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-slate-600">
                                                        <Calendar className="w-3 h-3 mr-1" /> Scheduled
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {item.is_default ? (
                                                    <span className="text-slate-400 italic">Always active if no schedule matches</span>
                                                ) : (
                                                    <span className="font-medium text-slate-900">
                                        {MONTHS.find(m => m.val === item.month)?.label} {item.year}
                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="default" size="icon" onClick={() => handleOpenDialog(item)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="destructive" size="icon" onClick={() => setDeletingId(item.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Add / Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px] transition-all duration-300 ease-out animate-in fade-in zoom-in-95">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit Descriptor' : 'Add New Descriptor'}</DialogTitle>
                        <DialogDescription>
                            Configure the billing descriptor details and schedule.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-5 py-4">

                        <div className="border p-4 rounded-lg bg-blue-50 border-blue-200">
                            <div className="flex items-start gap-1">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-blue-900 mb-1">Set as Default Fallback</h3>
                                    <p className="text-sm text-slate-700 mb-4">
                                        If enabled, this descriptor is used when no monthly schedule exists.
                                    </p>
                                </div>
                                <Switch
                                    id="default-mode"
                                    checked={formData.is_default}
                                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                                    className="transition-all duration-300"
                                />
                            </div>
                        </div>

                        {!formData.is_default && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-500">
                                <div className="space-y-2">
                                    <Label>Month</Label>
                                    <Select
                                        value={String(formData.month)}
                                        onValueChange={(val) => setFormData(prev => ({ ...prev, month: Number(val) }))}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select Month" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MONTHS.map(m => (
                                                <SelectItem key={m.val} value={String(m.val)}>{m.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Year</Label>
                                    <Select
                                        value={String(formData.year)}
                                        onValueChange={(val) => setFormData(prev => ({ ...prev, year: Number(val) }))}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select Year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {YEARS.map(y => (
                                                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        {/* Descriptor Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">Merchant Name (Descriptor) *</Label>
                            <Input
                                id="name"
                                value={formData.descriptor_name}
                                onChange={(e) => handleInputChange('descriptor_name', e.target.value)}
                                placeholder="e.g. TETHER SERVICES GMBH"
                                className={errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
                            />
                            {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name}</p>}
                        </div>

                        <div className="gird grid-cols-2 gap-4">
                            {/* EMP Account Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="emp-account">EMP Account *</Label>
                                <Select
                                    value={String(formData.emp_account_id || '')}
                                    onValueChange={(val) => handleInputChange('emp_account_id', val ? Number(val) : null)}
                                >
                                    <SelectTrigger className={errors.emp_account ? "border-red-500 focus-visible:ring-red-500 w-full" : "w-full"}>
                                        <SelectValue placeholder={empAccountsLoading ? "Loading EMp accounts..." : "Select EMP Account"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {empAccounts.map(account => (
                                            <SelectItem key={account.id} value={String(account.id)}>
                                                {account.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.emp_account && <p className="text-xs text-red-500 font-medium">{errors.emp_account}</p>}
                            </div>
                        </div>

                        {/* City & Country Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="city">Merchant City</Label>
                                <Input
                                    id="city"
                                    value={formData.descriptor_city}
                                    onChange={(e) => handleInputChange('descriptor_city', e.target.value)}
                                    placeholder="e.g. Berlin"
                                    className={errors.city ? "border-red-500 focus-visible:ring-red-500" : ""}
                                />
                                {errors.city && <p className="text-xs text-red-500 font-medium">{errors.city}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="country">Merchant Country (ISO 3-Digit)</Label>
                                <Input
                                    id="country"
                                    value={formData.descriptor_country}
                                    onChange={(e) => {
                                        const val = e.target.value.toUpperCase();
                                        handleInputChange('descriptor_country', val);
                                    }}
                                    placeholder="e.g. DEU"
                                    maxLength={3}
                                    className={errors.country ? "border-red-500 focus-visible:ring-red-500 font-mono" : "font-mono"}
                                />
                                {errors.country && <p className="text-xs text-red-500 font-medium">{errors.country}</p>}
                            </div>
                        </div>

                        <p className="text-[10px] text-slate-400">
                            Only alphanumeric characters, spaces, dots, and hyphens allowed.
                        </p>

                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || !!errors.name || !!errors.city || !!errors.country || !!errors.emp_account || !formData.descriptor_name || !formData.emp_account_id}
                        >
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Descriptor
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Descriptor?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This descriptor schedule will be permanently removed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}