'use client'

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MiniChartProps {
  type: 'line' | 'bar' | 'trend'
  data: Array<{ label: string; value: number }>
  color?: string
  title?: string
  trend?: 'up' | 'down' | 'neutral'
}

export default function MiniChart({ type, data, color = '#8b5cf6', title, trend }: MiniChartProps) {
  if (data.length === 0) return null

  const chartData = data.map(d => ({ name: d.label, value: d.value }))

  return (
    <div className="my-3 p-3 bg-white rounded-lg border border-purple-100 shadow-sm">
      {title && (
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-gray-700">{title}</h4>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs",
              trend === 'up' && "text-green-600",
              trend === 'down' && "text-red-600",
              trend === 'neutral' && "text-gray-600"
            )}>
              {trend === 'up' && <><TrendingUp className="w-3 h-3" /> Improving</>}
              {trend === 'down' && <><TrendingDown className="w-3 h-3" /> Declining</>}
              {trend === 'neutral' && <><Minus className="w-3 h-3" /> Stable</>}
            </div>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height={80}>
        {type === 'line' ? (
          <LineChart data={chartData}>
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} width={30} />
            <Tooltip
              contentStyle={{
                fontSize: '11px',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '4px 8px'
              }}
            />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        ) : type === 'bar' ? (
          <BarChart data={chartData}>
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} width={30} />
            <Tooltip
              contentStyle={{
                fontSize: '11px',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '4px 8px'
              }}
            />
            <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <LineChart data={chartData}>
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        )}
      </ResponsiveContainer>

      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>{chartData[0]?.name}</span>
        <span>{chartData[chartData.length - 1]?.name}</span>
      </div>
    </div>
  )
}
