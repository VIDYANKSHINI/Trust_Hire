"use client"

import React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"

interface CriteriaEditorProps {
  criteria: string[]
  onChange: (criteria: string[]) => void
}

export function CriteriaEditor({ criteria, onChange }: CriteriaEditorProps) {
  const handleAdd = () => {
    if (criteria.length >= 8) return
    onChange([...criteria, ""])
  }

  const handleRemove = (index: number) => {
    if (criteria.length <= 1) return
    const next = [...criteria]
    next.splice(index, 1)
    onChange(next)
  }

  const handleChange = (index: number, val: string) => {
    const next = [...criteria]
    next[index] = val.slice(0, 200)
    onChange(next)
  }

  return (
    <div className="space-y-2 font-mono">
      <div className="flex items-center justify-between">
        <label className="text-xs text-neutral-400 uppercase tracking-wider">
          Acceptance Criteria ({criteria.length}/8)
        </label>
        {criteria.length < 8 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
            className="h-7 text-[11px] border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800"
          >
            <Plus className="w-3 h-3 mr-1 text-orange-500" /> Add Criteria
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {criteria.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 w-5 text-right">{idx + 1}.</span>
            <Input
              value={item}
              onChange={(e) => handleChange(idx, e.target.value)}
              placeholder={`Requirement ${idx + 1} (e.g., Code coverage > 95%, verified on Monad explorer)`}
              className="bg-neutral-950 border-neutral-800 text-neutral-200 text-xs focus-visible:ring-orange-500"
              maxLength={200}
            />
            {criteria.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(idx)}
                className="h-8 w-8 text-neutral-500 hover:text-red-400 hover:bg-neutral-800"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-neutral-500">
        AI reviewer (Jev) will evaluate the freelancer&apos;s delivered work against each criteria item.
      </p>
    </div>
  )
}
