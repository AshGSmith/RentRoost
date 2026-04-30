export type FormState = {
  message?: string;
  errors?: Record<string, string[]>;
};

export const EMPTY_FORM_STATE: FormState = {};

export function zodErrorsToFormState(errors: Record<string, string[]>, message = "Please review the highlighted fields.") {
  return {
    message,
    errors
  };
}
