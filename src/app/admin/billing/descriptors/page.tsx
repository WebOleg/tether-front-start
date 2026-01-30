'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
import { Loader2, Plus, Pencil, Trash2, Calendar, ShieldCheck } from 'lucide-react'

export interface TransactionDescriptor {
    id: number
    descriptor_name: string
    descriptor_city: string
    descriptor_country: string
    is_default: boolean
    month?: number
    year?: number
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

export default function DescriptorSchedulePage() {
    const [schedules, setSchedules] = useState<TransactionDescriptor[]>([])
    const [loading, setLoading] = useState(true)

    // Dialog States
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    // Delete State
    const [deletingId, setDeletingId] = useState<number | null>(null)

    // Form State
    const [formData, setFormData] = useState<Omit<TransactionDescriptor, 'id'>>({
        descriptor_name: '',
        descriptor_city: '',
        descriptor_country: '',
        is_default: false,
        month: new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2,
        year: currentYear
    })

    // Validation State
    const [errors, setErrors] = useState<{ name?: string, city?: string, country?: string }>({})

    useEffect(() => {
        fetchSchedules()
    }, [])

    const fetchSchedules = async () => {
        setLoading(true)
        try {
            // Ensure your API returns { data: TransactionDescriptor[] }
            const response = await api.getDescriptors()
            setSchedules(response.data || [])
        } catch (error) {
            console.error('Failed to fetch schedules', error)
        } finally {
            setLoading(false)
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
                year: schedule.year || currentYear
            })
        } else {
            setEditingId(null)
            setFormData({
                descriptor_name: '',
                descriptor_city: '',
                descriptor_country: '',
                is_default: false,
                month: new Date().getMonth() + 2,
                year: currentYear
            })
        }
        setIsDialogOpen(true)
    }

    const validateField = (field: 'name' | 'city' | 'country', value: string) => {
        if (!value) return "Required";

        // Strict 3-letter check for Country
        if (field === 'country') {
            if (value.length !== 3) return "Must be exactly 3 characters (ISO Alpha-3)";
            if (!/^[A-Z]{3}$/.test(value)) return "Must be 3 uppercase letters";
            return undefined;
        }

        // Existing regex for other fields
        if (!DESCRIPTOR_REGEX.test(value)) {
            return "Invalid characters (A-Z, 0-9, . , - only)";
        }
        return undefined;
    }

    const handleInputChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Real-time validation
        if (field === 'descriptor_name') setErrors(e => ({ ...e, name: validateField('name', value) }));
        if (field === 'descriptor_city') setErrors(e => ({ ...e, city: validateField('city', value) }));
        if (field === 'descriptor_country') setErrors(e => ({ ...e, country: validateField('country', value) }));
    }

    const handleSave = async () => {
        // Final Validation
        const nameErr = validateField('name', formData.descriptor_name);
        const cityErr = validateField('city', formData.descriptor_city);
        const countryErr = validateField('country', formData.descriptor_country);

        if (nameErr || cityErr || countryErr) {
            setErrors({ name: nameErr, city: cityErr, country: countryErr });
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
            setDeletingId(null)
            fetchSchedules()
        } catch (error) {
            console.error(error)
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
                    <Button onClick={() => handleOpenDialog()}>
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
                                <TableHead>Type</TableHead>
                                <TableHead>Effective Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                                    </TableCell>
                                </TableRow>
                            ) : schedules.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                        No active schedules found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                schedules.map((item) => (
                                    <TableRow key={item.id} className={item.is_default ? 'bg-blue-50/30' : ''}>
                                        <TableCell className="font-medium font-mono text-slate-700">
                                            {item.descriptor_name}
                                        </TableCell>
                                        <TableCell className="text-slate-600">
                                            {item.descriptor_city}, {item.descriptor_country}
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
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}>
                                                    <Pencil className="h-4 w-4 text-slate-400 hover:text-blue-600" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => setDeletingId(item.id)}>
                                                    <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Add / Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit Descriptor' : 'Add New Descriptor'}</DialogTitle>
                        <DialogDescription>
                            Configure the billing descriptor details and schedule.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-5 py-4">

                        <div className="flex items-center justify-between space-x-2 border p-3 rounded-md bg-slate-50">
                            <div className="flex flex-col gap-1">
                                <Label htmlFor="default-mode" className="font-medium">Set as Default Fallback</Label>
                                <span className="text-xs text-slate-500">
                    If enabled, this descriptor is used when no monthly schedule exists.
                </span>
                            </div>
                            <Switch
                                id="default-mode"
                                checked={formData.is_default}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                            />
                        </div>

                        {!formData.is_default && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-200">
                                <div className="space-y-2">
                                    <Label>Month</Label>
                                    <Select
                                        value={String(formData.month)}
                                        onValueChange={(val) => setFormData(prev => ({ ...prev, month: Number(val) }))}
                                    >
                                        <SelectTrigger>
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
                                        <SelectTrigger>
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

                        <div className="border-t border-slate-100 my-1"></div>

                        {/* Descriptor Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">Merchant Name (Descriptor)</Label>
                            <Input
                                id="name"
                                value={formData.descriptor_name}
                                onChange={(e) => handleInputChange('descriptor_name', e.target.value)}
                                placeholder="e.g. TETHER SERVICES GMBH"
                                className={errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
                            />
                            {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name}</p>}
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
                            disabled={isSaving || !!errors.name || !!errors.city || !!errors.country || !formData.descriptor_name}
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