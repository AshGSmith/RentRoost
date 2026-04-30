"use client";

import { useActionState, useRef } from "react";

import { createTemplateAction, updateTemplateAction } from "@/app/(app)/templates/actions";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/domain/form-state";

export function TemplateForm({
  mergeFields,
  template
}: {
  mergeFields: Array<{ key: string; label: string }>;
  template?: { id: string; name: string; content: string };
}) {
  const actionFn = template?.id ? updateTemplateAction.bind(null, template.id) : createTemplateAction;
  const [state, formAction] = useActionState<FormState, FormData>(actionFn, EMPTY_FORM_STATE);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertField(token: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const insertion = `{{${token}}}`;
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    textarea.value = `${textarea.value.slice(0, start)}${insertion}${textarea.value.slice(end)}`;
    textarea.focus();
    textarea.setSelectionRange(start + insertion.length, start + insertion.length);
  }

  return (
    <form action={formAction} className="grid gap-5">
      <FormMessage state={state} />
      <FormField error={state.errors?.name?.[0]} htmlFor="name" label="Template name">
        <Input defaultValue={template?.name ?? ""} id="name" name="name" required />
      </FormField>
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Merge fields</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Click a field to insert its token into the template body.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mergeFields.map((field) => (
            <Button key={field.key} onClick={() => insertField(field.key)} size="sm" type="button" variant="secondary">
              {field.label}
            </Button>
          ))}
        </div>
      </div>
      <FormField error={state.errors?.content?.[0]} htmlFor="content" label="Template body">
        <Textarea
          defaultValue={template?.content ?? ""}
          id="content"
          name="content"
          ref={textareaRef}
          rows={18}
        />
      </FormField>
      <SubmitButton pendingLabel={template ? "Saving template..." : "Creating template..."}>
        {template ? "Save template" : "Create template"}
      </SubmitButton>
    </form>
  );
}
