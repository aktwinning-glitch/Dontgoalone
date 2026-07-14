import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * ResponsiveSelect — uses a bottom Drawer on mobile, standard Select popover on desktop.
 * Drop-in replacement for shadcn Select when you need mobile-friendly option lists.
 */
export default function ResponsiveSelect({ value, onValueChange, placeholder, options = [], className, triggerClassName, children }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const displayValue = options.find(o => o.value === value)?.label || value || placeholder;

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm focus:outline-none ${triggerClassName || ""}`}
        >
          <span className={value ? "text-foreground" : "text-muted-foreground"}>{displayValue || placeholder}</span>
          <svg className="w-3.5 h-3.5 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-sm text-muted-foreground font-normal">{placeholder || "Select option"}</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-8 space-y-1">
              {options.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onValueChange(opt.value); setOpen(false); }}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    background: value === opt.value ? "hsl(271 87% 65% / 0.15)" : "transparent",
                    color: value === opt.value ? "hsl(271 87% 75%)" : "hsl(var(--foreground))",
                    border: value === opt.value ? "1px solid hsl(271 87% 65% / 0.4)" : "1px solid transparent",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={triggerClassName || className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
        ))}
        {children}
      </SelectContent>
    </Select>
  );
}