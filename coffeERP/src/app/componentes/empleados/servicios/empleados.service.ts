// CONSULTA, CREA Y ACTUALIZA EXPEDIENTES LABORALES.
import { Injectable, inject } from '@angular/core';
import { ServicioApi } from '../../../services/api.service';
import { Empleado } from '../model/empleado.model';

@Injectable({ providedIn: 'root' })
export class EmpleadosService {
  private api = inject(ServicioApi);
  listar() {
    return this.api.obtener<Empleado[]>('/empleados');
  }
  crear(datos: Omit<Empleado, 'id'>) {
    return this.api.crear('/empleados', datos);
  }
  actualizar(id: number, datos: Omit<Empleado, 'id'>) {
    return this.api.actualizar(`/empleados/${id}`, datos);
  }
}
