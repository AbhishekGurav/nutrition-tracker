import { toast } from "sonner"

import type { Food } from "~/domain/schemas"
import { repositories } from "~/data/repositories"
import { Button } from "~/components/ui/button"
import { ResponsiveSheet } from "~/components/shared/responsive-sheet"
import { emptyFoodDraft, FoodForm, variationDraft, type FoodDraft } from "~/features/food/food-form"

export type FoodSheetMode =
  | { kind: "new"; name?: string }
  | { kind: "edit"; food: Food; baseName?: string }
  | { kind: "variation"; base: Food }

interface FoodFormSheetProps {
  mode: FoodSheetMode
  onClose: () => void
  onSaved?: (food: Food) => void
}

function strip({ id: _id, createdAt: _c, updatedAt: _u, ...rest }: Food): FoodDraft {
  return rest
}

/** One sheet for creating foods, editing your own, and forking variations. */
export function FoodFormSheet({ mode, onClose, onSaved }: FoodFormSheetProps) {
  const initial =
    mode.kind === "new" ? emptyFoodDraft(mode.name) : mode.kind === "edit" ? strip(mode.food) : variationDraft(mode.base)
  const title = mode.kind === "new" ? "New food" : mode.kind === "edit" ? "Edit food" : "Create variation"
  const baseName = mode.kind === "variation" ? mode.base.name : mode.kind === "edit" ? mode.baseName : undefined

  const save = async (draft: FoodDraft) => {
    let saved: Food | undefined
    if (mode.kind === "edit") {
      saved = await repositories.foods.update(mode.food.id, draft)
    } else {
      saved = await repositories.foods.create(draft)
    }
    if (saved) {
      toast.success(mode.kind === "edit" ? `Saved ${saved.name}` : `Created ${saved.name}`)
      onSaved?.(saved)
    }
    onClose()
  }

  return (
    <ResponsiveSheet
      isOpen
      onOpenChange={(open) => !open && onClose()}
      title={title}
      footer={
        <Button size="lg" type="submit" form="food-form">
          {mode.kind === "edit" ? "Save" : mode.kind === "variation" ? "Save variation" : "Create food"}
        </Button>
      }
    >
      <FoodForm id="food-form" initial={initial} baseName={baseName} onSubmit={(d) => void save(d)} />
    </ResponsiveSheet>
  )
}
