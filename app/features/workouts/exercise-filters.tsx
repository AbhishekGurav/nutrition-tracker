import type { Key } from "react-aria-components"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import {
  EQUIPMENT_OPTIONS,
  MUSCLE_OPTIONS,
  type ExerciseFilter,
} from "~/features/workouts/workout-meta"

interface ExerciseFiltersProps {
  value: ExerciseFilter
  onChange: (value: ExerciseFilter) => void
}

/** Muscle + equipment filters (Selects: there are more than 7 options each). */
export function ExerciseFilters({ value, onChange }: ExerciseFiltersProps) {
  const pickMuscle = (k: Key | null) => {
    const m = MUSCLE_OPTIONS.find((o) => o.value === k)
    onChange({ ...value, muscle: m ? m.value : "all" })
  }
  const pickEquipment = (k: Key | null) => {
    const e = EQUIPMENT_OPTIONS.find((o) => o.value === k)
    onChange({ ...value, equipment: e ? e.value : "all" })
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      <Select aria-label="Muscle" value={value.muscle} onChange={pickMuscle} className="w-full">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem id="all">All muscles</SelectItem>
            {MUSCLE_OPTIONS.map((o) => (
              <SelectItem key={o.value} id={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Select aria-label="Equipment" value={value.equipment} onChange={pickEquipment} className="w-full">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem id="all">All equipment</SelectItem>
            {EQUIPMENT_OPTIONS.map((o) => (
              <SelectItem key={o.value} id={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}
