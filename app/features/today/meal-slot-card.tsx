import * as React from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Bookmark01Icon,
  Copy01Icon,
  Delete02Icon,
  FlashIcon,
  MoreHorizontalIcon,
  PencilEdit01Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons"

import type { Food, FoodLogEntry, MealSlot } from "~/domain/schemas"
import { sumMacros } from "~/domain/macros"
import type { DateKey } from "~/domain/dates"
import { repositories } from "~/data/repositories"
import { Button } from "~/components/ui/button"
import { Dialog, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "~/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { SectionCard } from "~/components/shared/cards"
import { ListRow, RowList } from "~/components/shared/list-row"
import { MacroChips } from "~/components/shared/macro-display"
import { TextField } from "~/components/shared/text-field"
import {
  copySlotFromPreviousDay,
  describeQuantity,
  saveEntriesAsMeal,
  SLOT_LABELS,
} from "~/features/food/food-logging"

interface MealSlotCardProps {
  slot: MealSlot
  date: DateKey
  entries: readonly FoodLogEntry[]
  foodsById: ReadonlyMap<string, Food>
  onAdd: (slot: MealSlot, opts?: { quick?: boolean }) => void
  onEdit: (entry: FoodLogEntry) => void
}

/** One meal slot on Today: totals, entries and slot-level shortcuts. */
export function MealSlotCard({ slot, date, entries, foodsById, onAdd, onEdit }: MealSlotCardProps) {
  const totals = sumMacros(entries.map((e) => e.macros))
  const [savingMeal, setSavingMeal] = React.useState(false)
  const label = SLOT_LABELS[slot]

  const remove = async (entry: FoodLogEntry) => {
    await repositories.foodLog.remove(entry.id)
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = entry
    toast(`Removed ${entry.name}`, {
      action: { label: "Undo", onClick: () => void repositories.foodLog.create(rest) },
    })
  }

  return (
    <SectionCard
      title={label}
      description={entries.length ? <MacroChips macros={totals} /> : "Nothing logged yet"}
      action={
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onPress={() => onAdd(slot)} aria-label={`Add food to ${label.toLowerCase()}`}>
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
            Add
          </Button>
          <DropdownMenuTrigger>
            <Button variant="ghost" size="icon-sm" aria-label={`${label} options`}>
              <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
            </Button>
            <DropdownMenu placement="bottom end" className="min-w-48">
              <DropdownMenuGroup>
                <DropdownMenuItem onAction={() => onAdd(slot, { quick: true })}>
                  <HugeiconsIcon icon={FlashIcon} strokeWidth={2} />
                  Quick add macros
                </DropdownMenuItem>
                <DropdownMenuItem
                  onAction={async () => {
                    const n = await copySlotFromPreviousDay(date, slot)
                    toast(n ? `Copied ${n} item${n === 1 ? "" : "s"} from the previous day` : `Nothing in ${label.toLowerCase()} the previous day`)
                  }}
                >
                  <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
                  Copy previous day
                </DropdownMenuItem>
                <DropdownMenuItem isDisabled={!entries.some((e) => e.foodId)} onAction={() => setSavingMeal(true)}>
                  <HugeiconsIcon icon={Bookmark01Icon} strokeWidth={2} />
                  Save as meal
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenu>
          </DropdownMenuTrigger>
        </div>
      }
    >
      {entries.length > 0 ? (
        <RowList>
          {entries.map((e) => (
            <ListRow
              key={e.id}
              title={e.name}
              pressLabel={`Edit ${e.name}`}
              subtitle={
                <span className="flex flex-col gap-0.5">
                  {e.grams > 0 ? <span>{describeQuantity(e, e.foodId ? foodsById.get(e.foodId)?.servings : [])}</span> : null}
                  <MacroChips macros={e.macros} />
                </span>
              }
              onPress={() => onEdit(e)}
              actionsLabel={`${e.name} options`}
              actions={[
                { label: "Edit", icon: PencilEdit01Icon, onAction: () => onEdit(e) },
                { label: "Delete", icon: Delete02Icon, destructive: true, onAction: () => void remove(e) },
              ]}
            />
          ))}
        </RowList>
      ) : null}
      {savingMeal ? (
        <SaveMealDialog
          defaultName={`My ${label.toLowerCase()}`}
          onClose={() => setSavingMeal(false)}
          onSave={async (name) => {
            const meal = await saveEntriesAsMeal(name, entries)
            if (meal) toast.success(`Saved “${meal.name}”. Find it at the top of Add food.`)
            setSavingMeal(false)
          }}
        />
      ) : null}
    </SectionCard>
  )
}

function SaveMealDialog({
  defaultName,
  onClose,
  onSave,
}: {
  defaultName: string
  onClose: () => void
  onSave: (name: string) => void
}) {
  const [name, setName] = React.useState(defaultName)
  return (
    <Dialog isOpen onOpenChange={(open) => !open && onClose()}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) onSave(name.trim())
        }}
      >
        <DialogHeader>
          <DialogTitle>Save as meal</DialogTitle>
          <DialogDescription>Log these foods again with one tap. Quick-add entries aren&apos;t included.</DialogDescription>
        </DialogHeader>
        <TextField label="Meal name" value={name} onChange={setName} autoFocus isRequired />
        <DialogFooter>
          <Button variant="outline" onPress={onClose}>
            Cancel
          </Button>
          <Button type="submit" isDisabled={!name.trim()}>
            Save meal
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
