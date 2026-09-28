"use client";

import { Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { OptionsDTO } from "@portfolio/shared";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { apiRequest, fieldErrors } from "@/lib/api/client";
import { FieldGrid } from "../form/field-control";
import { FormProvider } from "../form/form-context";
import { setIn } from "../form/paths";
import type { FieldGroup, FormRecord } from "../resources/types";
import { AdminPageHeader, ErrorPanel, LoadingRows, Panel } from "../page";
import { useToast } from "../toast";
import { useUnsavedChanges } from "../unsaved";
import { useApiQuery } from "../use-api";

const NO_OPTIONS: OptionsDTO = {};

/** Editor for a single settings-like record (profile, site settings) using the shared form engine. */
export function SingletonEditor({
  endpoint,
  title,
  description,
  groups,
  aside,
}: {
  endpoint: string;
  title: string;
  description: string;
  groups: FieldGroup[];
  aside?: React.ReactNode;
}) {
  const query = useApiQuery<FormRecord>(endpoint);
  if (query.error) {
    return (
      <>
        <AdminPageHeader title={title} description={description} />
        <ErrorPanel error={query.error} onRetry={query.reload} />
      </>
    );
  }
  if (!query.data) {
    return (
      <>
        <AdminPageHeader title={title} description={description} />
        <Panel>
          <LoadingRows rows={6} />
        </Panel>
      </>
    );
  }
  return (
    <SingletonForm
      key={String(query.data.updatedAt ?? "")}
      endpoint={endpoint}
      title={title}
      description={description}
      groups={groups}
      initial={query.data}
      aside={aside}
    />
  );
}

function SingletonForm({
  endpoint,
  title,
  description,
  groups,
  initial,
  aside,
}: {
  endpoint: string;
  title: string;
  description: string;
  groups: FieldGroup[];
  initial: FormRecord;
  aside?: React.ReactNode;
}) {
  const toast = useToast();
  const unsaved = useUnsavedChanges();
  const [record, setRecord] = useState<FormRecord>(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(record) !== saved;

  useEffect(() => {
    unsaved.setDirty(endpoint, dirty);
    return () => unsaved.setDirty(endpoint, false);
  }, [dirty, endpoint, unsaved]);

  const setValue = useCallback(
    (path: string, value: unknown) => setRecord((current) => setIn(current, path, value)),
    [],
  );
  const save = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setSaving(true);
    const result = await apiRequest<FormRecord>("PUT", endpoint, record);
    setSaving(false);
    if (!result.ok) {
      setErrors(fieldErrors(result.error.details));
      toast.error(result.error.message);
      return;
    }
    setRecord(result.data);
    setSaved(JSON.stringify(result.data));
    setErrors({});
    toast.success(`${title} saved`);
  };
  const form = useMemo(
    () => ({ record, setValue, errors, options: NO_OPTIONS }),
    [record, setValue, errors],
  );

  return (
    <FormProvider value={form}>
      <form onSubmit={(event) => void save(event)} noValidate>
        <AdminPageHeader
          title={title}
          description={description}
          meta={dirty ? <span className="text-accent">Unsaved changes</span> : null}
          actions={
            <Button type="submit" pending={saving} disabled={!dirty}>
              <Icon icon={Save} size={16} /> Save
            </Button>
          }
        />
        <div className="grid gap-6 xl:grid-cols-(--editor-columns)">
          <div className="min-w-0 space-y-6">
            {groups.map((group) => (
              <Panel key={group.title} title={group.title} description={group.description}>
                <FieldGrid fields={group.fields} />
              </Panel>
            ))}
          </div>
          {aside ? <aside className="space-y-6">{aside}</aside> : null}
        </div>
      </form>
    </FormProvider>
  );
}
