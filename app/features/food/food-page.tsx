import * as React from "react"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Delete02Icon,
  GitForkIcon,
  PencilEdit01Icon,
  PlusSignIcon,
  RiceBowl01Icon,
} from "@hugeicons/core-free-icons"

import type { Food, Meal } from "~/domain/schemas"
import { todayKey } from "~/domain/dates"
import { repositories } from "~/data/repositories"
import { useFoods, useMeals } from "~/hooks/use-data"
import { Button } from "~/components/ui/button"
import { Skeleton } from "~/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { PageBody, PageHeader } from "~/components/layout/page-header"
import { EmptyState, SectionCard } from "~/components/shared/cards"
import { ListRow, RowList } from "~/components/shared/list-row"
import { MacroChips } from "~/components/shared/macro-display"
import { SearchList } from "~/components/shared/search-list"
import { useConfirm } from "~/components/shared/confirm-dialog"
import { AddFoodSheet } from "~/features/food/add-food-sheet"
import { FoodFormSheet, type FoodSheetMode } from "~/features/food/food-form-sheet"
import { FoodRow } from "~/features/food/food-row"
import { logMeal, mealTotals, slotForTime } from "~/features/food/food-logging"
import { MealFormSheet } from "~/features/food/meal-form-sheet"

export type FoodTab = "library" | "mine" | "meals"

interface FoodPageProps {
  tab: FoodTab
  onTabChange: (tab: FoodTab) => void
}

export function FoodPage({ tab, onTabChange }: FoodPageProps) {
  const navigate = useNavigate()
  const foods = useFoods()
  const meals = useMeals()
  const confirm = useConfirm()
  const [foodSheet, setFoodSheet] = React.useState<FoodSheetMode | null>(null)
  const [mealSheet, setMealSheet] = React.useState<{ meal?: Meal } | null>(null)
  const [logging, setLogging] = React.useState<{ key: number; food: Food } | null>(null)

  const foodsById = React.useMemo(() => new Map((foods ?? []).map((f) => [f.id, f])), [foods])
  const sorted = React.useMemo(() => [...(foods ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [foods])
  const mine = sorted.filter((f) => f.source === "user")

  const openFood = (f: Food) => void navigate({ to: "/food/$foodId", params: { foodId: f.id } })

  const foodActions = (f: Food) => [
    { label: "Log to today", icon: PlusSignIcon, onAction: () => setLogging({ key: Date.now(), food: f }) },
    { label: "Create variation", icon: GitForkIcon, onAction: () => setFoodSheet({ kind: "variation", base: f }) },
    ...(f.source === "user"
      ? [
          { label: "Edit", icon: PencilEdit01Icon, onAction: () => setFoodSheet({ kind: "edit" as const, food: f, baseName: f.baseFoodId ? foodsById.get(f.baseFoodId)?.name : undefined }) },
          {
            label: "Delete",
            icon: Delete02Icon,
            destructive: true,
            onAction: () =>
              confirm.ask({
                title: `Delete ${f.name}?`,
                description: "Past log entries keep their values. It's removed from saved meals.",
                onConfirm: async () => {
                  await repositories.foods.remove(f.id)
                  toast(`Deleted ${f.name}`)
                },
              }),
          },
        ]
      : []),
  ]

  const renderFood = (f: Food) => (
    <FoodRow
      food={f}
      baseName={f.baseFoodId ? foodsById.get(f.baseFoodId)?.name : undefined}
      onPress={() => openFood(f)}
      actions={foodActions(f)}
    />
  )

  return (
    <>
      <PageHeader
        title="Food"
        actions={
          tab === "meals" ? (
            <Button size="sm" onPress={() => setMealSheet({})}>
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
              New meal
            </Button>
          ) : (
            <Button size="sm" onPress={() => setFoodSheet({ kind: "new" })}>
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
              New food
            </Button>
          )
        }
      />
      <PageBody className="max-w-3xl">
        <Tabs selectedKey={tab} onSelectionChange={(k) => onTabChange(k === "mine" || k === "meals" ? k : "library")}>
          <TabsList className="w-full" aria-label="Food sections">
            <TabsTrigger id="library">Library</TabsTrigger>
            <TabsTrigger id="mine">My foods{mine.length ? ` (${mine.length})` : ""}</TabsTrigger>
            <TabsTrigger id="meals">Meals{meals?.length ? ` (${meals.length})` : ""}</TabsTrigger>
          </TabsList>

          <TabsContent id="library" className="pt-2">
            {foods === undefined ? (
              <Skeleton className="h-96" />
            ) : (
              <SearchList
                label="Search all foods"
                placeholder={`Search ${foods.length} foods`}
                items={sorted}
                getKey={(f) => f.id}
                getText={(f) => `${f.name} ${f.brand ?? ""} ${f.category ?? ""}`}
                renderItem={renderFood}
                noResults={
                  <div className="flex flex-col items-center gap-2 py-6 text-sm text-muted-foreground">
                    <p>Not in the library yet.</p>
                    <Button variant="outline" onPress={() => setFoodSheet({ kind: "new" })}>
                      Create a food
                    </Button>
                  </div>
                }
              />
            )}
          </TabsContent>

          <TabsContent id="mine" className="pt-2">
            {mine.length === 0 ? (
              <EmptyState
                icon={GitForkIcon}
                title="Make the library yours"
                description="Open any food and choose Create variation to save your own version, like a different cut or your marinade."
                action={<Button onPress={() => setFoodSheet({ kind: "new" })}>Create a food</Button>}
              />
            ) : (
              <SearchList
                label="Search my foods"
                placeholder="Search my foods and variations"
                items={mine}
                getKey={(f) => f.id}
                getText={(f) => `${f.name} ${f.brand ?? ""} ${f.baseFoodId ? foodsById.get(f.baseFoodId)?.name ?? "" : ""}`}
                renderItem={renderFood}
              />
            )}
          </TabsContent>

          <TabsContent id="meals" className="pt-2">
            {meals === undefined ? (
              <Skeleton className="h-48" />
            ) : meals.length === 0 ? (
              <EmptyState
                icon={RiceBowl01Icon}
                title="No saved meals"
                description="Group foods you often eat together and log them in one tap. You can also save a meal from Today."
                action={<Button onPress={() => setMealSheet({})}>Create a meal</Button>}
              />
            ) : (
              <SectionCard title="Saved meals">
                <RowList>
                  {[...meals]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((m) => (
                      <ListRow
                        key={m.id}
                        title={m.name}
                        subtitle={
                          <span className="flex flex-col gap-0.5">
                            <span>{m.items.length} items</span>
                            <MacroChips macros={mealTotals(m, foodsById)} />
                          </span>
                        }
                        onPress={() => setMealSheet({ meal: m })}
                        pressLabel={`Edit ${m.name}`}
                        actionsLabel={`${m.name} options`}
                        actions={[
                          {
                            label: "Log to today",
                            icon: PlusSignIcon,
                            onAction: async () => {
                              const slot = slotForTime()
                              await logMeal(m, foodsById, todayKey(), slot)
                              toast.success(`Logged ${m.name} to ${slot}`)
                            },
                          },
                          { label: "Edit", icon: PencilEdit01Icon, onAction: () => setMealSheet({ meal: m }) },
                          {
                            label: "Delete",
                            icon: Delete02Icon,
                            destructive: true,
                            onAction: () =>
                              confirm.ask({
                                title: `Delete ${m.name}?`,
                                description: "Already-logged entries stay in your log.",
                                onConfirm: () => repositories.meals.remove(m.id),
                              }),
                          },
                        ]}
                      />
                    ))}
                </RowList>
              </SectionCard>
            )}
          </TabsContent>
        </Tabs>
      </PageBody>

      {foodSheet ? (
        <FoodFormSheet
          mode={foodSheet}
          onClose={() => setFoodSheet(null)}
          onSaved={() => {
            if (foodSheet.kind !== "edit") onTabChange("mine")
          }}
        />
      ) : null}
      {mealSheet ? <MealFormSheet meal={mealSheet.meal} onClose={() => setMealSheet(null)} /> : null}
      {logging ? (
        <AddFoodSheet
          key={logging.key}
          isOpen
          onOpenChange={(open) => !open && setLogging(null)}
          date={todayKey()}
          slot={slotForTime()}
          food={logging.food}
        />
      ) : null}
      {confirm.dialog}
    </>
  )
}
