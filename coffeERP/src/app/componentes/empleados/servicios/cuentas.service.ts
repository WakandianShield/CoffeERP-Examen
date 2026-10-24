// REGISTRA LAS CUENTAS DE ACCESO DESDE LA PANTALLA DE EMPLEADOS.
import { Injectable, inject } from '@angular/core';
import { ServicioApi } from '../../../services/api.service';
import { Cuenta } from '../model/cuenta.model';

@Injectable({ providedIn: 'root' })
export class CuentasService {
  private api = inject(ServicioApi);

  // EL BACKEND EXIGE ADMIN Y VALIDA LA CONTRASENA Y LOS MODULOS ASIGNADOS.
  crearCuenta(cuenta: Cuenta) {
    return this.api.crear('/autenticacion/usuarios', cuenta);
  }
}
