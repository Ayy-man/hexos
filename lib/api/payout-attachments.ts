import { createClient } from '@/lib/supabase/admin';

const BUCKET_NAME = 'payout-invoices';

export interface PayoutInvoiceUpload {
  userId: string;
  file: File;
}

/**
 * Upload a dev's invoice for a payout request
 * Path structure: {userId}/{timestamp}_{filename}
 */
export async function uploadPayoutInvoice(
  upload: PayoutInvoiceUpload
): Promise<{ success: boolean; url?: string; path?: string; error?: string }> {
  const supabase = createClient();

  const { userId, file } = upload;

  // Sanitize filename
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const timestamp = Date.now();
  const filePath = `${userId}/${timestamp}_${sanitizedName}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('Error uploading payout invoice:', uploadError);
    return { success: false, error: uploadError.message };
  }

  // Get signed URL (valid for 1 year)
  const { data: signedData } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, 60 * 60 * 24 * 365);

  return {
    success: true,
    url: signedData?.signedUrl,
    path: filePath,
  };
}

/**
 * Get a signed URL for viewing a payout invoice
 */
export async function getPayoutInvoiceUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    console.error('Error getting payout invoice URL:', error);
    return null;
  }

  return data?.signedUrl || null;
}

/**
 * Delete a payout invoice from storage
 */
export async function deletePayoutInvoice(filePath: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);

  if (error) {
    console.error('Error deleting payout invoice:', error);
    return false;
  }

  return true;
}

/**
 * Check if file is a valid invoice type
 */
export function isValidInvoiceType(fileType: string): boolean {
  const validTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];
  return validTypes.includes(fileType);
}

/**
 * Max file size: 10MB
 */
export const MAX_INVOICE_SIZE = 10 * 1024 * 1024;

export function isValidInvoiceSize(fileSize: number): boolean {
  return fileSize <= MAX_INVOICE_SIZE;
}
