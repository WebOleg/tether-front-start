// src/components/model-tabs.tsx
'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Layers, Zap, RotateCcw, Archive } from 'lucide-react'

interface ModelTabsProps {
  value: string
  onValueChange: (value: string) => void
}

export function ModelTabs({ value, onValueChange }: ModelTabsProps) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className="w-full">
      <TabsList className="w-full h-auto p-1 bg-slate-100/80 border border-slate-200 grid grid-cols-4 gap-2">
        <TabsTrigger 
          value="all" 
          className="flex items-center justify-center gap-2 py-2.5 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all"
        >
          <Layers className="h-4 w-4" />
          <span className="font-medium">All Records</span>
        </TabsTrigger>
        <TabsTrigger 
          value="flywheel" 
          className="flex items-center justify-center gap-2 py-2.5 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all"
        >
          <Zap className="h-4 w-4" />
          <span className="font-medium">Flywheel</span>
        </TabsTrigger>
        <TabsTrigger 
          value="recovery" 
          className="flex items-center justify-center gap-2 py-2.5 data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm transition-all"
        >
          <RotateCcw className="h-4 w-4" />
          <span className="font-medium">Recovery</span>
        </TabsTrigger>
        <TabsTrigger 
          value="legacy" 
          className="flex items-center justify-center gap-2 py-2.5 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all"
        >
          <Archive className="h-4 w-4" />
          <span className="font-medium">Legacy</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}