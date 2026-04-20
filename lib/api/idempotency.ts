import { createHash } from 'crypto';
import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase/client';

export interface IdempotencyRecord {
  status_code: number;
  response_json: unknown;
}

function stableHash(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function deriveIdempotencyKey(
  request: NextRequest,
  fallbackParts: Array<string | number | null | undefined>
): string {
  const header = request.headers.get('Idempotency-Key')?.trim();
  if (header) return header;
  return stableHash(fallbackParts.map((x) => String(x ?? '')).join('|'));
}

export async function getIdempotencyRecord(
  endpoint: string,
  idempotencyKey: string
): Promise<IdempotencyRecord | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('api_idempotency_keys')
    .select('status_code, response_json')
    .eq('endpoint', endpoint)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (error) throw new Error(`Failed reading idempotency record: ${error.message}`);
  if (!data) return null;
  return {
    status_code: Number(data.status_code),
    response_json: data.response_json,
  };
}

export async function saveIdempotencyRecord(params: {
  endpoint: string;
  idempotencyKey: string;
  invoiceId?: string;
  statusCode: number;
  responseJson: unknown;
}): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('api_idempotency_keys').upsert(
    {
      endpoint: params.endpoint,
      idempotency_key: params.idempotencyKey,
      invoice_id: params.invoiceId ?? null,
      status_code: params.statusCode,
      response_json: params.responseJson,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint,idempotency_key', ignoreDuplicates: true }
  );
  if (error) throw new Error(`Failed saving idempotency record: ${error.message}`);
}
