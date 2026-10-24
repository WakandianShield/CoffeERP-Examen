// CONSULTA Y REGISTRA LOS CONTACTOS QUE SUMINISTRAN MERCANCIA.
import { Injectable, inject } from '@angular/core';
import { ServicioApi } from '../../../services/api.service';
import { Proveedor } from '../model/proveedor.model';

@Injectable({ providedIn: 'root' })
export class ProveedoresService {
  private api = inject(ServicioApi);
  listar() {
    return this.api.obtener<Proveedor[]>('/proveedores');
  }
  crear(datos: Omit<Proveedor, 'id'>) {
    return this.api.crear('/proveedores', datos);
  }
}
