import * as React from "react"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, Delete02Icon, GitForkIcon, PencilEdit01Icon, PlusSignIcon } from "@hugeicons/core-free-icons"

import type { Food } from "~/domain/schemas"
import { MACRO_KEYS } from "~/domain/schemas"
import { scaleMacros } from "~/domain/macros"
import { round } from "~/domain/units"
import { todayKey } from "~/domain/dates"
import { cn } from "~/lib/utils"
import { repositories } from "~/data/repositories"
import { useFood, useVariations } from "~/hooks/use-data"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Skeleton } from "~/components/ui/skeleton"
import { PageBody, PageHeader } from "~/components/layout/page-header"
import { ButtonLink } from "~/components/shared/button-link"
import { SectionCard } from "~/components/shared/cards"
import { RowList } from "~/components/shared/list-row"
import { MACRO_META } from "~/components/shared/macro-meta"
import { useConfirm } from "~/components/shared/confirm-dialog"
import { AddFoodSheet } from "~/features/food/add-food-sheet"
import { FoodFormSheet, type FoodSheetMode } from "~/features/food/food-form-sheet"
import { FoodRow } from "~/features/food/food-row"
import { slotForTime } from "~/features/food/food-logging"

export function FoodDetailPage({ foodId }: { foodId: string }) {
  const food = useFood(foodId)
  if (food === undefined) {
    return (
      <>
        <PageHeader title="Food" />
        <PageBody>
          <Skeleton className="h-64" />
        </PageBody>
      </>
    )
  }
  if (food === null) {
    return (
      <>
        <PageHeader title="Food not found" />
        <PageBody>
          <ButtonLink to="/food" variant="outline" className="w-fit">
            Back to foods
          </ButtonLink>
        </PageBody>
      </>
    )
  }
  return <FoodDetail food={food} />
}

function FoodDetail({ food }: { food: Food }) {
  const navigate = useNavigate()
  const variations = useVariations(food.id)
  const base = useFood(food.baseFoodId ?? "")
  const confirm = useConfirm()
  const [sheet, setSheet] = React.useState<FoodSheetMode | null>(null)
  const [logging, setLogging] = React.useState<number | null>(null)

  const columns = [{ label: "100 g", grams: 100 }, ...food.servings.map((s) => ({ label: s.label, grams: s.grams }))]

  return (
    <>
      <PageHeader
        title={food.name}
        description={food.brand ?? food.category}
        leading={
          <ButtonLink to="/food" variant="ghost" size="icon" aria-label="Back to foods">
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          </ButtonLink>
        }
      />
      <PageBody className="max-w-3xl">
        <div className="flex flex-wrap gap-2">
          <Button onPress={() => setLogging(Date.now())}>
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
            Log to today
          </Button>
          <Button variant="outline" onPress={() => setSheet({ kind: "variation", base: food })}>
            <HugeiconsIcon icon={GitForkIcon} strokeWidth={2} data-icon="inline-start" />
            Create variation
          </Button>
          {food.source === "user" ? (
            <>
              <Button variant="outline" onPress={() => setSheet({ kind: "edit", food, baseName: base?.name })}>
                <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={2} data-icon="inline-start" />
                Edit
              </Button>
              <Button
                variant="destructive"
                onPress={() =>
                  confirm.ask({
                    title: `Delete ${food.name}?`,
                    description: "Past log entries keep their values.",
                    onConfirm: async () => {
                      await repositories.foods.remove(food.id)
                      toast(`Deleted ${food.name}`)
                      void navigate({ to: "/food" })
                    },
                  })
                }
              >
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} data-icon="inline-start" />
                Delete
              </Button>
            </>
          ) : null}
        </div>

        {base ? (
          <p className="text-sm text-muted-foreground">
            Variation of{" "}
            <ButtonLink to="/food/$foodId" params={{ foodId: base.id }} variant="link" className="h-auto p-0">
              {base.name}
            </ButtonLink>
          </p>
        ) : null}

        <SectionCard
          title="Nutrition"
          description={food.source === "seed" ? "Library values from USDA FoodData Central." : <Badge variant="secondary">{food.baseFoodId ? "Your variation" : "Your food"}</Badge>}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-sm tabular-nums">
              <caption className="sr-only">Macros per amount</caption>
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Per
                  </th>
                  {columns.map((c) => (
                    <th key={c.label} scope="col" className="py-2 pr-4 font-medium">
                      {c.label}
                      {c.grams !== 100 ? <span className="block font-normal">{round(c.grams, 1)} g</span> : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MACRO_KEYS.map((key) => (
                  <tr key={key} className="border-t">
                    <th scope="row" className="py-2 pr-4 text-left font-medium">
                      <span className="flex items-center gap-2">
                        <span aria-hidden="true" className={cn("size-2 rounded-full", MACRO_META[key].bg)} />
                        {MACRO_META[key].label}
                      </span>
                    </th>
                    {columns.map((c) => (
                      <td key={c.label} className="py-2 pr-4">
                        {round(scaleMacros(food.per100g, c.grams)[key], key === "kcal" ? 0 : 1)}
                        {key === "kcal" ? "" : " g"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          title="Variations"
          description={variations?.length ? `${variations.length} saved` : "Save your own version: a different cut, cooking method or recipe."}
          action={
            <Button variant="ghost" size="sm" onPress={() => setSheet({ kind: "variation", base: food })}>
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
              New
            </Button>
          }
        >
          {variations && variations.length > 0 ? (
            <RowList>
              {variations.map((v) => (
                <FoodRow key={v.id} food={v} onPress={() => void navigate({ to: "/food/$foodId", params: { foodId: v.id } })} />
              ))}
            </RowList>
          ) : null}
        </SectionCard>
      </PageBody>

      {sheet ? (
        <FoodFormSheet
          mode={sheet}
          onClose={() => setSheet(null)}
          onSaved={(saved) => {
            if (sheet.kind === "variation") void navigate({ to: "/food/$foodId", params: { foodId: saved.id } })
          }}
        />
      ) : null}
      {logging ? (
        <AddFoodSheet key={logging} isOpen onOpenChange={(o) => !o && setLogging(null)} date={todayKey()} slot={slotForTime()} food={food} />
      ) : null}
      {confirm.dialog}
    </>
  )
}
