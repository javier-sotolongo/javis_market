import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { SelectField, TextField } from "@/components/ui/fields";
import { adjustStockAction } from "@/app/admin/(panel)/inventory/actions";

export function StockAdjustForm({
  variantId,
  compact = false,
}: {
  readonly variantId: string;
  readonly compact?: boolean;
}) {
  return (
    <ActionForm
      action={adjustStockAction.bind(null, variantId)}
      resetOnSuccess
      className={compact ? "flex flex-wrap items-end gap-2" : "grid gap-3"}
    >
      <SelectField
        label="Action"
        name="mode"
        id={`mode-${variantId}`}
        options={[
          { value: "add", label: "Receive (+)" },
          { value: "remove", label: "Remove (−)" },
          { value: "set", label: "Set count (=)" },
        ]}
      />
      <TextField
        label="Quantity"
        name="quantity"
        id={`qty-${variantId}`}
        inputMode="numeric"
        required
        className={compact ? "w-24" : ""}
      />
      <TextField label="Note" name="note" id={`note-${variantId}`} placeholder="Optional" />
      <div>
        <SubmitButton variant={compact ? "secondary" : "primary"}>Apply</SubmitButton>
      </div>
    </ActionForm>
  );
}
