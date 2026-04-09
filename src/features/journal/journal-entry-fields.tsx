import { useState, type ReactNode } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa6";
import type { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  BOBBER_FLOAT_OPTIONS,
  LEADER_LENGTH_OPTIONS,
  LEADER_MATERIAL_OPTIONS,
  LINE_TEST_OPTIONS,
  LINE_TYPE_OPTIONS,
  ROD_ACTION_OPTIONS,
  ROD_LENGTH_OPTIONS,
  ROD_POWER_OPTIONS,
} from "@/lib/catch-gear";
import { useUnitPreference } from "@/hooks/use-unit-preference";
import type { JournalEntryFormValues } from "@/features/journal/entry-form-schema";

type MeasurementOrder = "before-gear" | "after-gear";

interface JournalEntryFieldsProps {
  form: UseFormReturn<JournalEntryFormValues>;
  fishTypeField: ReactNode;
  measurementOrder?: MeasurementOrder;
  useCollapsibleSections?: boolean;
}

const twoColumnGridClass = "grid grid-cols-1 sm:grid-cols-2 gap-4";
const selectClassName = "field-dark h-10 rounded-md px-3 text-sm";
const CM_PER_INCH = 2.54;
const KG_PER_POUND = 0.45359237;
const GRAMS_PER_OUNCE = 28.349523125;

function SelectField({
  form,
  name,
  label,
  placeholder,
  options,
}: {
  form: UseFormReturn<JournalEntryFormValues>;
  name:
    | "rodLength"
    | "rodPower"
    | "rodAction"
    | "lineType"
    | "lineTest"
    | "bobberFloat"
    | "leaderMaterial"
    | "leaderLength";
  label: string;
  placeholder: string;
  options: readonly string[];
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-white">{label}</FormLabel>
          <FormControl>
            <select className={selectClassName} {...field}>
              <option value="">{placeholder}</option>
              {options.filter(Boolean).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function MeasurementFields({
  form,
}: {
  form: UseFormReturn<JournalEntryFormValues>;
}) {
  const { unitSystem } = useUnitPreference();
  const lengthUnitLabel = unitSystem === "metric" ? "cm" : "inches";
  const weightUnitLabel = unitSystem === "metric" ? "kg" : "lbs";

  return (
    <div className={twoColumnGridClass}>
      <FormField
        control={form.control}
        name="length"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">
              Length ({lengthUnitLabel})
            </FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.1"
                placeholder={unitSystem === "metric" ? "47.0" : "18.5"}
                className="field-dark"
                {...field}
                value={
                  typeof field.value === "number"
                    ? unitSystem === "metric"
                      ? (field.value * CM_PER_INCH).toFixed(1)
                      : String(field.value)
                    : ""
                }
                onChange={(event) => {
                  if (!event.target.value) {
                    field.onChange(undefined);
                    return;
                  }

                  const parsedValue = Number.parseFloat(event.target.value);
                  if (Number.isNaN(parsedValue)) {
                    field.onChange(undefined);
                    return;
                  }

                  const normalizedValue =
                    unitSystem === "metric"
                      ? parsedValue / CM_PER_INCH
                      : parsedValue;
                  field.onChange(normalizedValue);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="weight"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">
              Weight ({weightUnitLabel})
            </FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                placeholder={unitSystem === "metric" ? "1.04" : "2.3"}
                className="field-dark"
                {...field}
                value={
                  typeof field.value === "number"
                    ? unitSystem === "metric"
                      ? (field.value * KG_PER_POUND).toFixed(2)
                      : String(field.value)
                    : ""
                }
                onChange={(event) => {
                  if (!event.target.value) {
                    field.onChange(undefined);
                    return;
                  }

                  const parsedValue = Number.parseFloat(event.target.value);
                  if (Number.isNaN(parsedValue)) {
                    field.onChange(undefined);
                    return;
                  }

                  const normalizedValue =
                    unitSystem === "metric"
                      ? parsedValue / KG_PER_POUND
                      : parsedValue;
                  field.onChange(normalizedValue);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

function GearFields({ form }: { form: UseFormReturn<JournalEntryFormValues> }) {
  const { unitSystem } = useUnitPreference();

  return (
    <div className="space-y-4">
      <div className={twoColumnGridClass}>
        <SelectField
          form={form}
          name="rodLength"
          label="Rod Length"
          placeholder="Select length"
          options={ROD_LENGTH_OPTIONS}
        />
        <SelectField
          form={form}
          name="rodPower"
          label="Rod Power"
          placeholder="Select power"
          options={ROD_POWER_OPTIONS}
        />
      </div>

      <div className={twoColumnGridClass}>
        <SelectField
          form={form}
          name="rodAction"
          label="Rod Action"
          placeholder="Select action"
          options={ROD_ACTION_OPTIONS}
        />
        <FormField
          control={form.control}
          name="drag"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">
                Drag{" "}
                {typeof field.value === "number"
                  ? `(${field.value.toFixed(2)})`
                  : ""}
              </FormLabel>
              <FormControl>
                <Input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  className="field-dark h-10 px-0"
                  value={field.value ?? 0.5}
                  onChange={(event) =>
                    field.onChange(Number.parseFloat(event.target.value))
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className={twoColumnGridClass}>
        <SelectField
          form={form}
          name="lineType"
          label="Line Type"
          placeholder="Select line type"
          options={LINE_TYPE_OPTIONS}
        />
        <SelectField
          form={form}
          name="lineTest"
          label="Line Test"
          placeholder="Select test"
          options={LINE_TEST_OPTIONS}
        />
      </div>

      <div className={twoColumnGridClass}>
        <SelectField
          form={form}
          name="bobberFloat"
          label="Bobber/Float"
          placeholder="Select bobber/float"
          options={BOBBER_FLOAT_OPTIONS}
        />
        <FormField
          control={form.control}
          name="weightOz"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">
                Weight ({unitSystem === "metric" ? "g" : "oz"})
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step={unitSystem === "metric" ? "0.1" : "0.01"}
                  min="0"
                  placeholder={unitSystem === "metric" ? "28.3" : "1.0"}
                  className="field-dark"
                  {...field}
                  value={(() => {
                    const rawValue = field.value || "";
                    if (!rawValue || unitSystem !== "metric") {
                      return rawValue;
                    }

                    const parsed = Number.parseFloat(rawValue);
                    if (Number.isNaN(parsed)) {
                      return rawValue;
                    }

                    return (parsed * GRAMS_PER_OUNCE).toFixed(1);
                  })()}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    if (!nextValue) {
                      field.onChange("");
                      return;
                    }

                    const parsed = Number.parseFloat(nextValue);
                    if (Number.isNaN(parsed)) {
                      field.onChange("");
                      return;
                    }

                    if (unitSystem === "metric") {
                      field.onChange((parsed / GRAMS_PER_OUNCE).toFixed(3));
                      return;
                    }

                    field.onChange(nextValue);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className={twoColumnGridClass}>
        <SelectField
          form={form}
          name="leaderMaterial"
          label="Leader Material"
          placeholder="Select material"
          options={LEADER_MATERIAL_OPTIONS}
        />
        <SelectField
          form={form}
          name="leaderLength"
          label="Leader Length"
          placeholder="Select length"
          options={LEADER_LENGTH_OPTIONS}
        />
      </div>
    </div>
  );
}

function LureAndBaitFields({
  form,
}: {
  form: UseFormReturn<JournalEntryFormValues>;
}) {
  return (
    <div className={twoColumnGridClass}>
      <FormField
        control={form.control}
        name="lure"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Lure</FormLabel>
            <FormControl>
              <Input
                placeholder="Spinnerbait, jerkbait, jig..."
                className="field-dark"
                {...field}
                value={field.value || ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="bait"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Bait</FormLabel>
            <FormControl>
              <Input
                placeholder="Minnow, worm, craw..."
                className="field-dark"
                {...field}
                value={field.value || ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

function DateAndNotesFields({
  form,
}: {
  form: UseFormReturn<JournalEntryFormValues>;
}) {
  return (
    <>
      <FormField
        control={form.control}
        name="dateTime"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Date and Time</FormLabel>
            <FormControl>
              <Input type="datetime-local" className="field-dark" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Notes</FormLabel>
            <FormControl>
              <Textarea
                rows={3}
                placeholder="Describe the catch, location details, fighting behavior..."
                className="field-dark resize-none"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

function EntryFieldSection({
  title,
  description,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  description: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <div className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#111111]">
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="h-auto w-full justify-between rounded-none px-4 py-3 text-white hover:bg-[#171719]"
          >
            <span className="min-w-0 text-left">
              <span className="block text-sm font-medium">{title}</span>
              <span className="block text-xs text-white/60">{description}</span>
            </span>
            {open ? (
              <FaChevronUp className="h-4 w-4" />
            ) : (
              <FaChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 pt-1">
          {children}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function JournalEntryFields({
  form,
  fishTypeField,
  measurementOrder = "after-gear",
  useCollapsibleSections = false,
}: JournalEntryFieldsProps) {
  const [isGearOpen, setIsGearOpen] = useState(false);
  const [isTackleOpen, setIsTackleOpen] = useState(false);

  const gearSection = useCollapsibleSections ? (
    <EntryFieldSection
      title="Gear"
      description="Rod, line, drag, leader, and terminal setup"
      open={isGearOpen}
      onOpenChange={setIsGearOpen}
    >
      <GearFields form={form} />
    </EntryFieldSection>
  ) : (
    <GearFields form={form} />
  );

  const tackleSection = useCollapsibleSections ? (
    <EntryFieldSection
      title="Tackle"
      description="Lure and bait used for this catch"
      open={isTackleOpen}
      onOpenChange={setIsTackleOpen}
    >
      <LureAndBaitFields form={form} />
    </EntryFieldSection>
  ) : (
    <LureAndBaitFields form={form} />
  );

  return (
    <>
      {fishTypeField}
      {measurementOrder === "before-gear" && <MeasurementFields form={form} />}
      {gearSection}
      {tackleSection}
      {measurementOrder === "after-gear" && <MeasurementFields form={form} />}
      <DateAndNotesFields form={form} />
    </>
  );
}
