'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pe/ui';
import { updateUser, deactivateAndReturn, type ActionResult } from '../actions';

export interface EditFormProps {
  userId: string;
  initial: {
    roleId: string | null;
    storeIds: string[];
    primaryStoreId: string | null;
    active: boolean;
  };
  roles: Array<{ id: string; name: string; department: string }>;
  stores: Array<{ id: string; name: string }>;
}

export function EditForm({ userId, initial, roles, stores }: EditFormProps) {
  const router = useRouter();
  const [roleId, setRoleId] = useState(initial.roleId ?? '');
  const [storeIds, setStoreIds] = useState<string[]>(initial.storeIds);
  const [primaryStoreId, setPrimaryStoreId] = useState(initial.primaryStoreId ?? '');
  const [active, setActive] = useState(initial.active);
  const [status, setStatus] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleStore(id: string) {
    setStoreIds((current) =>
      current.includes(id) ? current.filter((s) => s !== id) : [...current, id],
    );
    if (primaryStoreId === id && storeIds.includes(id)) {
      setPrimaryStoreId('');
    }
  }

  function handleSave(formData: FormData) {
    setStatus(null);
    formData.delete('storeIds');
    storeIds.forEach((id) => formData.append('storeIds', id));
    startTransition(async () => {
      const result = await updateUser(formData);
      setStatus(result);
      if (result.ok) router.refresh();
    });
  }

  const availablePrimary = stores.filter((s) => storeIds.includes(s.id));

  return (
    <form action={handleSave} className="space-y-4">
      <input type="hidden" name="userId" value={userId} />

      <div className="space-y-1.5">
        <Label>Role</Label>
        <Select value={roleId} onValueChange={setRoleId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name} <span className="text-muted-foreground">· {r.department}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="roleId" value={roleId} />
      </div>

      <div className="space-y-1.5">
        <Label>Store access</Label>
        <div className="flex flex-wrap gap-3">
          {stores.map((s) => (
            <label
              key={s.id}
              className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
            >
              <input
                type="checkbox"
                checked={storeIds.includes(s.id)}
                onChange={() => toggleStore(s.id)}
              />
              {s.name}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Primary store</Label>
        <Select
          value={primaryStoreId}
          onValueChange={setPrimaryStoreId}
          disabled={availablePrimary.length === 0}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                availablePrimary.length === 0
                  ? 'Pick at least one store above first'
                  : 'Select a primary store'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {availablePrimary.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="primaryStoreId" value={primaryStoreId} />
      </div>

      <div className="space-y-1.5">
        <Label>Status</Label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Active — can sign in
        </label>
        <input type="hidden" name="active" value={active ? 'true' : 'false'} />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save changes'}
        </Button>
        <Button type="submit" variant="outline" formAction={deactivateAndReturn}>
          Deactivate &amp; close
        </Button>
      </div>

      {status ? (
        <p
          className={
            status.ok
              ? 'text-sm text-emerald-600 dark:text-emerald-400'
              : 'text-sm text-destructive'
          }
          role={status.ok ? 'status' : 'alert'}
        >
          {status.ok ? status.message : status.error}
        </p>
      ) : null}
    </form>
  );
}
