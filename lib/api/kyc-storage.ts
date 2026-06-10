import type { SupabaseClient } from '@supabase/supabase-js';

export const KYC_DOCUMENTS_BUCKET = 'kyc-documents';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

export async function ensureKycDocumentsBucket(
  supabase: SupabaseClient
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    return { ok: false, message: `Failed to list storage buckets: ${listError.message}` };
  }

  const exists = buckets?.some((bucket) => bucket.id === KYC_DOCUMENTS_BUCKET || bucket.name === KYC_DOCUMENTS_BUCKET);
  if (exists) {
    return { ok: true };
  }

  const { error: createError } = await supabase.storage.createBucket(KYC_DOCUMENTS_BUCKET, {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
  });

  if (createError) {
    const alreadyExists =
      createError.message.toLowerCase().includes('already exists') ||
      createError.message.toLowerCase().includes('duplicate');
    if (alreadyExists) {
      return { ok: true };
    }
    return { ok: false, message: `Failed to create storage bucket: ${createError.message}` };
  }

  return { ok: true };
}
