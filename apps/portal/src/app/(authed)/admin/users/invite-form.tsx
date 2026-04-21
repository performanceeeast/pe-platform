'use client';

import { useState, useTransition } from 'react';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pe/ui';
import { inviteUser, type ActionResult } from './actions';

export interface InviteFormProps {
  roles: Array<{ id: string; name: string; department: string; slug: string }>;
  stores: Array<{ id: string; name: string; slug: string }>;
}

export function InviteForm({ roles, stores }: InviteFormProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [roleId, setRoleId] = useState<string>('');
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [primaryStoreId, setPrimaryStoreId] = useState<string>('');
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

  function handleSubmit(formData: FormData) {
    setStatus(null);
    formData.delete('storeIds');
    storeIds.forEach((id) => formData.append('storeIds', id));
    startTransition(async () => {
      const result = await inviteUser(formData);
      setStatus(result);
      if (result.ok) {
        setEmail('');
        setFullName('');
        setRoleId('');
        setStoreIds([]);
        setPrimaryStoreId('');
      }
    });
  }

  const availablePrimary = stores.filter((s) => storeIds.includes(s.id));

  return (
    <form action={handleSubmit} className="space-y-4 rounded-md border p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            name="email"
            type="email"
            autoComplete="off"
            placeholder="employee@performanceeast.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-name">Full name (optional)</Label>
          <Input
            id="invite-name"
            name="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Role</Label>
        <Select value={roleId} onValueChange={setRoleId} name="roleId">
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}{' '}
                <span className="text-muted-foreground">· {r.department}</span>
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
          name="primaryStoreId"
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

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Sending invite…' : 'Send invite'}
      </Button>

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
