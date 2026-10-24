// COMPARTE LAS PETICIONES A /API PARA QUE LAS PANTALLAS NO REPITAN EL CODIGO HTTP.
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
@Injectable({ providedIn: 'root' })
export class ServicioApi {
  private clienteHttp = inject(HttpClient);
  // CONSULTA DATOS CON GET Y DEVUELVE UNA PROMESA PARA PODER ESPERAR EL RESULTADO.
  obtener<T>(ruta: string) {
    return firstValueFrom(this.clienteHttp.get<T>('/api' + ruta));
  }
  // ENVIA DATOS CON POST PARA CREAR UN REGISTRO O EJECUTAR UNA OPERACION DEL SERVIDOR.
  crear<T = unknown>(ruta: string, datos: unknown) {
    return firstValueFrom(this.clienteHttp.post<T>('/api' + ruta, datos));
  }
  // ENVIA LOS NUEVOS DATOS CON PUT PARA MODIFICAR UN REGISTRO EXISTENTE.
  actualizar(ruta: string, datos: unknown) {
    return firstValueFrom(this.clienteHttp.put('/api' + ruta, datos));
  }
}
