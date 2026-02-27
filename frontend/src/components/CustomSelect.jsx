import React, { useMemo } from "react";
import { Select, SelectItem } from "@heroui/react";

export const CustomSelect = ({
  label,
  options,
  selectedKey,
  onSelectionChange,
  placeholder,
  className = "w-64",
}) => {
  const selectedKeys = useMemo(() => {
    return selectedKey ? new Set([selectedKey]) : new Set();
  }, [selectedKey]);

  return (
    <div className={className}>
      <div className="text-white/50 font-black text-[11px] uppercase tracking-widest mb-2">
        {label}
      </div>

      <Select
        aria-label={label}
        placeholder={placeholder}
        variant="bordered"
        size="md"
        selectionMode="single"
        selectedKeys={selectedKeys}
        onSelectionChange={(keys) => {
          if (keys === "all") return;
          const arr = Array.from(keys);
          onSelectionChange(arr[0] ?? null);
        }}
        popoverProps={{
          classNames: {
            content: "bg-zinc-900 border border-white/10 p-2 text-white shadow-2xl",
          },
        }}
        classNames={{
          trigger:
            "border-white/10 h-12 bg-black/20 hover:border-white/20 transition-colors rounded-2xl",
          value: "text-white text-sm",
          base: "max-w-full",
        }}
      >
        {options.map((opt) => (
          <SelectItem
            key={opt.value}
            textValue={opt.label}
            className="text-white hover:bg-white/10 data-[selected=true]:text-yellow-400"
          >
            {opt.label}
          </SelectItem>
        ))}
      </Select>
    </div>
  );
};
