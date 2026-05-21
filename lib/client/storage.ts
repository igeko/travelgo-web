/**
 * lib/client/storage.ts — frontend client for object storage.
 *
 * Wraps the (currently Supabase) browser storage SDK so components never
 * import `getBrowserClient` or talk to the storage provider directly.
 * Swapping provider happens here only.
 */
import { getBrowserClient } from "@/lib/dal/supabase";

export type UploadResult = { storagePath: string; publicUrl: string };

export const storage = {
  /**
   * Upload a blob to `bucket` at `path` and return its storage path + public
   * URL. Defaults to webp + upsert (the image-pipeline's needs).
   */
  uploadImage: async (
    bucket: string,
    path: string,
    blob: Blob,
    opts: { contentType?: string; upsert?: boolean } = {},
  ): Promise<UploadResult> => {
    const supabase = getBrowserClient();
    const { data, error } = await supabase.storage.from(bucket).upload(path, blob, {
      contentType: opts.contentType ?? "image/webp",
      upsert: opts.upsert ?? true,
    });
    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(data.path);

    return { storagePath: data.path, publicUrl };
  },
};
