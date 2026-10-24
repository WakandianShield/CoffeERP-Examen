// REGISTRA MERCANCIA RECIBIDA Y PAGADA; EL BACKEND ACTUALIZA INVENTARIO Y FINANZAS.
import { Injectable, inject } from '@angular/core';
import { ServicioApi } from '../../../services/api.service';
import { Compra } from '../model/compra.model';

@Injectable({ providedIn: 'root' })
export class ComprasService {
  private api = inject(ServicioApi);
  listar() {
    return this.api.obtener<Compra[]>('/compras');
  }
  crear(datos: {
    idProveedor: number;
    productos: { id: number; cantidad: number; costoCentavos: number }[];
  }) {
    return this.api.crear('/compras', datos);
  }
}
