import { authHeaders } from '@/lib/sessionAuth';

// Private Blob URLs require the X-Session-Token auth header to fetch at
// all (see /forms/upload/view on the server) -- a plain <a href> has no
// way to attach that, so this fetches the file as a blob first and opens
// the result as a local, unauthenticated object URL the browser CAN
// navigate to directly. Shared by FormPage (view-what-you-just-uploaded)
// and FormSubmissionsPage (admin viewing a past submission's file).
export async function openPrivateFormFile(blobUrl: string, formSlug: string, session: Parameters<typeof authHeaders>[0]): Promise<string | null> {
  try {
    const resp = await fetch(`/api/forms/upload/view?url=${encodeURIComponent(blobUrl)}&formSlug=${encodeURIComponent(formSlug)}`, {
      headers: authHeaders(session),
    });
    if (!resp.ok) return 'Could not open the file.';
    const blob = await resp.blob();
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, '_blank');
    // The new tab needs a moment to actually load the object URL before
    // it's safe to revoke -- 60s is generous headroom, not a real wait.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    return null;
  } catch {
    return 'Could not open the file.';
  }
}
