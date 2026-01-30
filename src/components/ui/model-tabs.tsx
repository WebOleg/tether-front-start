// src/components/model-tabs.tsx
'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Layers, Zap, RotateCcw, Archive } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModelTabsProps {
  value: string
  onValueChange: (value: string) => void
  className?: string
  showCounts?: {
    all?: number
    flywheel?: number
    recovery?: number
    legacy?: number
  }
}

const tabConfigs = [
  {
    value: 'all',
    label: 'All Records',
    icon: Layers,
    activeColor: 'text-blue-700',
    activeBg: 'bg-blue-50',
    hoverBg: 'hover:bg-blue-50/50',
    ringColor: 'focus-visible:ring-blue-500',
    description: 'View all transaction records'
  },
  {
    value: 'flywheel',
    label: 'Flywheel',
    icon: Zap,
    activeColor: 'text-blue-700',
    activeBg: 'bg-blue-50',
    hoverBg: 'hover:bg-blue-50/50',
    ringColor: 'focus-visible:ring-blue-500',
    description: 'Flywheel model transactions'
  },
  {
    value: 'recovery',
    label: 'Recovery',
    icon: RotateCcw,
    activeColor: 'text-blue-700',
    activeBg: 'bg-purple-50',
    hoverBg: 'hover:bg-purple-50/50',
    ringColor: 'focus-visible:ring-purple-500',
    description: 'Recovery model transactions'
  },
  {
    value: 'legacy',
    label: 'Legacy',
    icon: Archive,
    activeColor: 'text-blue-700',
    activeBg: 'bg-slate-50',
    hoverBg: 'hover:bg-slate-50/50',
    ringColor: 'focus-visible:ring-slate-500',
    description: 'Legacy system transactions'
  }
]

export function ModelTabs({ value, onValueChange, className, showCounts }: ModelTabsProps) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className={cn('w-full', className)}>
      <TabsList className="w-full h-auto p-1.5 bg-slate-100 border border-slate-200/80 grid grid-cols-2 md:grid-cols-4 gap-2 rounded-xl shadow-xs">
        {tabConfigs.map((tab) => {
          const Icon = tab.icon
          const count = showCounts?.[tab.value as keyof typeof showCounts]
          const isActive = value === tab.value
          
          return (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                'relative flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-2',
                'px-3 py-3 md:py-2.5 rounded-lg',
                'text-slate-600 font-medium text-sm',
                'transition-all duration-200 ease-in-out',
                'hover:text-slate-900',
                tab.hoverBg,
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                tab.ringColor,
                'data-[state=active]:bg-white',
                'data-[state=active]:scale-[1.02]',
                `data-[state=active]:${tab.activeColor}`,
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'group'
              )}
              title={tab.description}
            >
              <div className="flex items-center gap-2">
                <Icon 
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    'group-data-[state=active]:scale-110',
                    isActive && 'animate-in fade-in-0 zoom-in-95'
                  )} 
                />
                <span className="whitespace-nowrap">{tab.label}</span>
              </div>
              
              {count !== undefined && count > 0 && (
                <span 
                  className={cn(
                    'absolute -top-1 -right-1 md:relative md:top-0 md:right-0',
                    'inline-flex items-center justify-center',
                    'min-w-[20px] h-5 px-1.5 rounded-full',
                    'text-xs font-semibold',
                    'bg-slate-200 text-slate-700',
                    'group-data-[state=active]:bg-gradient-to-br',
                    isActive && tab.value === 'all' && 'group-data-[state=active]:from-blue-500 group-data-[state=active]:to-blue-600 group-data-[state=active]:text-white',
                    isActive && tab.value === 'flywheel' && 'group-data-[state=active]:from-blue-500 group-data-[state=active]:to-blue-600 group-data-[state=active]:text-white',
                    isActive && tab.value === 'recovery' && 'group-data-[state=active]:from-purple-500 group-data-[state=active]:to-purple-600 group-data-[state=active]:text-white',
                    isActive && tab.value === 'legacy' && 'group-data-[state=active]:from-slate-600 group-data-[state=active]:to-slate-700 group-data-[state=active]:text-white',
                    'transition-all duration-200',
                    'group-data-[state=active]:scale-110'
                  )}
                >
                  {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
                </span>
              )}
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}