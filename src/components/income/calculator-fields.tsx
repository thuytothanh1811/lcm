"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface NumberFieldProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  min?: number;
  step?: number;
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  suffix,
  min = 0,
  step = 1,
}: NumberFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={Number.isNaN(value) ? "" : value}
          onChange={event => onChange(event.target.valueAsNumber)}
          className={suffix ? "pr-12" : undefined}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

interface SwitchFieldProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function SwitchField({
  id,
  label,
  checked,
  onChange,
}: SwitchFieldProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
      <Label htmlFor={id} className="cursor-pointer font-normal">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

interface ResultRowProps {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}

export function ResultRow({ label, value, strong, muted }: ResultRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className={cn(muted && "text-muted-foreground")}>{label}</span>
      <span className={cn("font-mono", strong && "text-base font-semibold")}>
        {value}
      </span>
    </div>
  );
}
