/**
 * Supabase generated types — regenerated via `pnpm --filter @pe/database gen:types`
 * (requires PE_SUPABASE_PROJECT_ID env var). This file is checked in so every
 * consumer has accurate types without a network call.
 *
 * TODO(supabase-types): this stub is replaced once the initial migration is
 * applied. It exists so the rest of the monorepo type-checks before the DB
 * is provisioned.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
