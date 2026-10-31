import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, SearchIcon } from "@hugeicons/core-free-icons"
import { SearchField } from "react-aria-components"

import { cn } from "~/lib/utils"
import { searchItems } from "~/lib/search"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "~/components/ui/input-group"
import { RowList } from "~/components/shared/list-row"

interface SearchListProps<T> {
  items: readonly T[]
  getKey: (item: T) => string
  getText: (item: T) => string
  renderItem: (item: T) => React.ReactNode
  label: string
  placeholder?: string
  query?: string
  onQueryChange?: (query: string) => void
  /** Shown above results (e.g. a "Recent" heading) when there's no query. */
  idleHeader?: React.ReactNode
  /** Items to show when the query is empty; defaults to `items`. */
  idleItems?: readonly T[]
  /** Shown when a query has no matches. */
  noResults?: React.ReactNode
  /** Extra controls beside the search box (filters, add button). */
  toolbar?: React.ReactNode
  limit?: number
  autoFocus?: boolean
  className?: string
}

/** Search box + ranked, capped result list. Used for foods, exercises and more. */
export function SearchList<T>({
  items,
  getKey,
  getText,
  renderItem,
  label,
  placeholder = "Search",
  query: queryProp,
  onQueryChange,
  idleHeader,
  idleItems,
  noResults,
  toolbar,
  limit = 60,
  autoFocus,
  className,
}: SearchListProps<T>) {
  const [internal, setInternal] = React.useState("")
  const query = queryProp ?? internal
  const setQuery = onQueryChange ?? setInternal
  const deferred = React.useDeferredValue(query)
  const idle = deferred.trim() === ""

  const results = React.useMemo(
    () => (idle ? [...(idleItems ?? items)] : searchItems(items, deferred, getText)),
    [idle, idleItems, items, deferred, getText]
  )
  const shown = results.slice(0, limit)

  return (
    <div className={cn("flex min-h-0 flex-col gap-3", className)}>
      <div className="flex items-center gap-2">
        <SearchField
          value={query}
          onChange={setQuery}
          aria-label={label}
          autoFocus={autoFocus}
          className="min-w-0 flex-1"
        >
          <InputGroup>
            <InputGroupAddon>
              <HugeiconsIcon icon={SearchIcon} strokeWidth={2} />
            </InputGroupAddon>
            <InputGroupInput
              placeholder={placeholder}
              className="[&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <InputGroupAddon align="inline-end">
                <InputGroupButton size="icon-xs" aria-label="Clear search" onPress={() => setQuery("")}>
                  <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
                </InputGroupButton>
              </InputGroupAddon>
            ) : null}
          </InputGroup>
        </SearchField>
        {toolbar}
      </div>
      {idle && idleHeader ? idleHeader : null}
      {shown.length > 0 ? (
        <RowList aria-label={`${label} results`}>
          {shown.map((item) => (
            <React.Fragment key={getKey(item)}>{renderItem(item)}</React.Fragment>
          ))}
        </RowList>
      ) : !idle ? (
        (noResults ?? <p className="py-6 text-center text-sm text-muted-foreground">No matches.</p>)
      ) : null}
      {results.length > shown.length ? (
        <p className="text-center text-xs text-muted-foreground">
          Showing {shown.length} of {results.length}. Keep typing to narrow it down.
        </p>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {idle ? "" : `${results.length} results`}
      </p>
    </div>
  )
}
