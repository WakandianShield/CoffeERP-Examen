// COMPARTE EL CATALOGO DE PRODUCTOS ENTRE INVENTARIO, COMPRAS Y VENTAS.
import { Injectable, inject } from '@angular/core';
import { ServicioApi } from './api.service';
import { Producto } from '../models/producto.model';

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private api = inject(ServicioApi);
  listar() {
    return this.api.obtener<Producto[]>('/productos');
  }

  // EL PRECIO SE ENVIA EN CENTAVOS; LAS EXISTENCIAS SE MODIFICAN MEDIANTE AJUSTES O COMPRAS.
  crear(datos: Pick<Producto, 'nombre' | 'precioCentavos' | 'minimo' | 'activo'>) {
    return this.api.crear('/productos', datos);
  }
  actualizar(id: number, datos: Pick<Producto, 'nombre' | 'precioCentavos' | 'minimo' | 'activo'>) {
    return this.api.actualizar(`/productos/${id}`, datos);
  }
}
