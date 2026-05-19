import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '@envello/core';

export const adminGuard: CanActivateFn = async () => {
  const sb = inject(SupabaseService);
  const router = inject(Router);

  const { data: { user } } = await sb.client.auth.getUser();
  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  const { data } = await sb.client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (data?.role === 'admin') return true;

  router.navigate(['/']);
  return false;
};
