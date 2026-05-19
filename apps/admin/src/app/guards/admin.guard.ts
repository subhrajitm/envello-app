import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '@envello/core';

export const adminGuard: CanActivateFn = async () => {
  const sb = inject(SupabaseService);
  const router = inject(Router);

  try {
    const { data: { user }, error: userError } = await sb.client.auth.getUser();
    if (userError) console.error('[adminGuard] getUser error:', userError.message);
    if (!user) {
      router.navigate(['/login']);
      return false;
    }

    const { data, error: profileError } = await sb.client
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) console.error('[adminGuard] profiles query error:', profileError.message, profileError.code);

    if (data?.role === 'admin') return true;

    console.warn('[adminGuard] access denied — role:', data?.role ?? 'no profile row');
    router.navigate(['/login']);
    return false;
  } catch (e) {
    console.error('[adminGuard] unexpected error:', e);
    router.navigate(['/login']);
    return false;
  }
};
