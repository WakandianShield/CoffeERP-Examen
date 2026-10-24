// COMPRUEBA LA SESION Y RECUPERA EL PERFIL AL RECARGAR ANTES DE PERMITIR EL ACCESO.
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ServicioAutenticacion } from '../services/autenticacion.service';

export const authGuard: CanActivateFn = async () => {
  const autenticacion = inject(ServicioAutenticacion);
  const enrutador = inject(Router);

  if (autenticacion.estaAutenticado() || (await autenticacion.restaurarSesion())) return true;
  return enrutador.createUrlTree(['/iniciar-sesion']);
};
