// CONSULTA SALARIOS PAGADOS Y SOLICITA EL PAGO DEL PERIODO ELEGIDO.
import { Injectable, inject } from '@angular/core';
import { ServicioApi } from '../../../services/api.service';
import { Nomina } from '../model/nomina.model';

@Injectable({ providedIn: 'root' })
export class NominaService {
  private api = inject(ServicioApi);
  listar() {
    return this.api.obtener<Nomina[]>('/nomina');
  }
  // EL BACKEND TOMA EL SALARIO GUARDADO DEL EMPLEADO Y EVITA DUPLICAR EL PERIODO.
  pagar(idEmpleado: number, periodo: string) {
    return this.api.crear('/nomina', { idEmpleado, periodo });
  }
}
