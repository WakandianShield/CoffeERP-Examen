// REVISA EL ROL Y EL MODULO DECLARADOS EN LOS DATOS DE CADA RUTA.
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { ServicioAutenticacion } from '../services/autenticacion.service';
import { NombreModulo } from '../models/modulo.model';

export const roleGuard: CanActivateFn = (ruta: ActivatedRouteSnapshot) => {
  const autenticacion = inject(ServicioAutenticacion);
  const enrutador = inject(Router);
  const rolesPermitidos: string[] = ruta.data['roles'] ?? [];
  const modulo: NombreModulo | undefined = ruta.data['modulo'];

  if (!autenticacion.estaAutenticado()) return enrutador.createUrlTree(['/iniciar-sesion']);
  if (autenticacion.tieneRol(rolesPermitidos) && (!modulo || autenticacion.tieneModulo(modulo))) {
    return true;
  }
  return enrutador.createUrlTree([autenticacion.inicio()]);
};
