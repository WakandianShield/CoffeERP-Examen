// CONSULTA LOS MOVIMIENTOS Y REGISTRA LOS AJUSTES DE LA PANTALLA DE INVENTARIO.
import { Injectable, inject } from '@angular/core';
import { ServicioApi } from '../../../services/api.service';
import { MovimientoInventario } from '../model/movimiento-inventario.model';

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private api = inject(ServicioApi);

  movimientos() {
    return this.api.obtener<MovimientoInventario[]>('/inventario');
  }

  // EL BACKEND VALIDA LA CANTIDAD Y REGISTRA EL MOTIVO DEL CAMBIO.
  ajustar(datos: { idProducto: number; cantidad: number; motivo: string }) {
    return this.api.crear('/inventario', datos);
  }
}
