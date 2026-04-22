"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxOption {
  value: string
  label: string
  disabled?: boolean
}

interface ClientSearchComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  minSearchChars?: number
  disabled?: boolean
  className?: string
}

export function ClientSearchCombobox({
  options,
  value,
  onValueChange,
  placeholder = "Seleccione...",
  searchPlaceholder = "Buscar...",
  emptyMessage = "No se encontraron resultados",
  minSearchChars = 3,
  disabled = false,
  className,
}: ClientSearchComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Filtrar opciones solo si hay 3 o más caracteres
  const filteredOptions = React.useMemo(() => {
    if (searchQuery.length < minSearchChars) {
      return []
    }
    
    const query = searchQuery.toLowerCase()
    return options.filter((option) =>
      option.label.toLowerCase().includes(query)
    )
  }, [options, searchQuery, minSearchChars])

  const selectedOption = options.find((option) => option.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={searchPlaceholder}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {searchQuery.length < minSearchChars ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <Search className="mx-auto h-8 w-8 mb-2 opacity-50" />
                Escribe al menos {minSearchChars} {minSearchChars === 1 ? 'carácter' : 'caracteres'} para buscar
              </div>
            ) : filteredOptions.length === 0 ? (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    onSelect={(currentValue: string) => {
                      if (option.disabled) return
                      onValueChange(currentValue === value ? "" : currentValue)
                      setOpen(false)
                      setSearchQuery("")
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
