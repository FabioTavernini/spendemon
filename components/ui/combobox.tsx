"use client"

import * as React from "react"
import { Popover } from "radix-ui"
import { Check, ChevronDown } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type ComboboxContextValue<T> = {
  filteredItems: T[]
  isSelected: (item: T) => boolean
  selectItem: (item: T) => void
  open: boolean
  setOpen: (open: boolean) => void
  query: string
  setQuery: (query: string) => void
}

const ComboboxContext = React.createContext<ComboboxContextValue<unknown> | null>(
  null
)

function useComboboxContext<T>() {
  const context = React.useContext(ComboboxContext)

  if (!context) {
    throw new Error("Combobox components must be used inside <Combobox>.")
  }

  return context as ComboboxContextValue<T>
}

type ComboboxProps<T> = {
  children: React.ReactNode
  items: T[]
  itemToStringValue?: (item: T) => string
  multiple?: boolean
  onOpenChange?: (open: boolean) => void
  onValueChange?: (value: T | T[] | null) => void
  open?: boolean
  value?: T | T[] | null
}

function Combobox<T>({
  children,
  items,
  itemToStringValue = (item) => String(item),
  multiple = false,
  onOpenChange,
  onValueChange,
  open: openProp,
  value,
}: ComboboxProps<T>) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")

  const isOpen = openProp ?? open

  const selectedItems = React.useMemo(() => {
    if (multiple) {
      return Array.isArray(value) ? value : []
    }

    return value == null ? [] : [value]
  }, [multiple, value])

  const selectedKeys = React.useMemo(
    () => new Set(selectedItems.map((item) => itemToStringValue(item))),
    [itemToStringValue, selectedItems]
  )

  const filteredItems = React.useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()

    if (!normalizedQuery) {
      return items
    }

    return items.filter((item) =>
      itemToStringValue(item).toLocaleLowerCase().includes(normalizedQuery)
    )
  }, [itemToStringValue, items, query])

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (openProp == null) {
        setOpen(nextOpen)
      }

      if (!nextOpen) {
        setQuery("")
      }

      onOpenChange?.(nextOpen)
    },
    [onOpenChange, openProp]
  )

  const selectItem = React.useCallback(
    (item: T) => {
      if (multiple) {
        const key = itemToStringValue(item)
        const nextValues = selectedItems.some(
          (selectedItem) => itemToStringValue(selectedItem) === key
        )
          ? selectedItems.filter(
              (selectedItem) => itemToStringValue(selectedItem) !== key
            )
          : [...selectedItems, item]

        onValueChange?.(nextValues)
        return
      }

      onValueChange?.(item)
      handleOpenChange(false)
    },
    [handleOpenChange, itemToStringValue, multiple, onValueChange, selectedItems]
  )

  const contextValue = React.useMemo<ComboboxContextValue<T>>(
    () => ({
      filteredItems,
      isSelected: (item) => selectedKeys.has(itemToStringValue(item)),
      open: isOpen,
      query,
      selectItem,
      setOpen: handleOpenChange,
      setQuery,
    }),
    [
      filteredItems,
      handleOpenChange,
      isOpen,
      itemToStringValue,
      query,
      selectItem,
      selectedKeys,
    ]
  )

  return (
    <ComboboxContext.Provider value={contextValue}>
      <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
        {children}
      </Popover.Root>
    </ComboboxContext.Provider>
  )
}

function ComboboxTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Popover.Trigger>) {
  return (
    <Popover.Trigger className={className} {...props}>
      {children}
    </Popover.Trigger>
  )
}

function ComboboxInput({
  className,
  onChange,
  onFocus,
  onKeyDown,
  ...props
}: React.ComponentProps<typeof Input>) {
  const { open, query, setOpen, setQuery } = useComboboxContext<unknown>()

  return (
    <div className="relative">
      <Input
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn("pr-8", className)}
        role="combobox"
        value={query}
        onChange={(event) => {
          if (!open) {
            setOpen(true)
          }

          setQuery(event.target.value)
          onChange?.(event)
        }}
        onFocus={(event) => {
          setOpen(true)
          onFocus?.(event)
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false)
          }

          onKeyDown?.(event)
        }}
        {...props}
      />
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

function ComboboxContent({
  align = "start",
  className,
  onOpenAutoFocus,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof Popover.Content>) {
  return (
    <Popover.Portal>
      <Popover.Content
        align={align}
        className={cn(
          "z-50 w-(--radix-popover-trigger-width) min-w-56 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md outline-hidden",
          className
        )}
        sideOffset={sideOffset}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          onOpenAutoFocus?.(event)
        }}
        {...props}
      />
    </Popover.Portal>
  )
}

function ComboboxEmpty({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { filteredItems } = useComboboxContext<unknown>()

  if (filteredItems.length > 0) {
    return null
  }

  return (
    <div
      className={cn("px-2 py-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function ComboboxList<T>({
  children,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  children: (item: T) => React.ReactNode
}) {
  const { filteredItems } = useComboboxContext<T>()

  return (
    <div
      className={cn("max-h-72 overflow-y-auto", className)}
      role="listbox"
      {...props}
    >
      {filteredItems.map((item) => children(item))}
    </div>
  )
}

function ComboboxItem<T>({
  children,
  className,
  onClick,
  value,
  ...props
}: Omit<React.ComponentProps<"button">, "value"> & {
  value: T
}) {
  const { isSelected, selectItem } = useComboboxContext<T>()
  const selected = isSelected(value)

  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
        className
      )}
      type="button"
      onClick={(event) => {
        selectItem(value)
        onClick?.(event)
      }}
      {...props}
    >
      <Check
        className={cn(
          "size-4 shrink-0 text-muted-foreground transition-opacity",
          selected ? "opacity-100" : "opacity-0"
        )}
      />
      {children}
    </button>
  )
}

export {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
}
