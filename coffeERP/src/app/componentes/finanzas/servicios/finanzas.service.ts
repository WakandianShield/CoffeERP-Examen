// CONSULTA EL RESUMEN FINANCIERO Y REGISTRA MOVIMIENTOS MANUALES EN CENTAVOS.
import { Injectable, inject } from '@angular/core';
import { ServicioApi } from '../../../services/api.service';
import { ResumenFinanzas } from '../model/resumen-finanzas.model';

@Injectable({ providedIn: 'root' })
export class FinanzasService {
  private api = inject(ServicioApi);
  resumen() {
    return this.api.obtener<ResumenFinanzas>('/finanzas');
  }
  crear(datos: { tipo: string; concepto: string; importeCentavos: number }) {
    return this.api.crear('/finanzas', datos);
  }
}
