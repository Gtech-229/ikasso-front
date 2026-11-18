import { useFormState, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";

/** The field's current error; subscribes the calling component to that field's state. */
export function useFieldError<T extends FieldValues>(form: UseFormReturn<T>, name: Path<T>): string | undefined {
  const formState = useFormState({ control: form.control, name });
  return form.getFieldState(name, formState).error?.message;
}

/**
 * Registers a field so that, once it shows an error (after a step check or the
 * submit), it is re-checked as it is edited and the error clears when fixed.
 * Untouched fields stay quiet: nothing is validated before that first check.
 * `alsoRecheck`: a field whose rule depends on this one (minimum deposit vs
 * maximum balance, last day vs first day).
 */
export function registerRechecking<T extends FieldValues>(
  form: UseFormReturn<T>,
  name: Path<T>,
  alsoRecheck?: Path<T>,
) {
  return form.register(name, {
    onChange: () => {
      if (form.getFieldState(name).error) void form.trigger(name);
      if (alsoRecheck && form.getFieldState(alsoRecheck).error) void form.trigger(alsoRecheck);
    },
  });
}
