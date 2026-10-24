// ADJUNTA EL TOKEN SOLO A /API Y CIERRA LA SESION SI EL SERVIDOR RESPONDE 401.
import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ServicioAutenticacion } from './autenticacion.service';
// ANTES DE ENVIAR LA PETICION, AGREGA EL TOKEN SOLO SI LA URL PERTENECE A LA API LOCAL.
export const interceptorAutenticacion: HttpInterceptorFn = (solicitud, siguiente) => {
  const autenticacion = inject(ServicioAutenticacion);
  const enrutador = inject(Router);

  const local = solicitud.url.startsWith('/api/');
  const protegida =
    local && autenticacion.token()
      ? solicitud.clone({ setHeaders: { Authorization: `Bearer ${autenticacion.token()}` } })
      : solicitud;
  return siguiente(protegida).pipe(
    catchError((error: HttpErrorResponse) => {
      // SI EL SERVIDOR RECHAZA LA SESION, LA LIMPIA Y VUELVE AL ACCESO; UN LOGIN FALLIDO MUESTRA SU PROPIO ERROR.
      if (local && error.status === 401 && !solicitud.url.endsWith('/iniciar-sesion')) {
        autenticacion.cerrarSesion();
        void enrutador.navigateByUrl('/iniciar-sesion');
      }
      return throwError(() => error);
    }),
  );
};
