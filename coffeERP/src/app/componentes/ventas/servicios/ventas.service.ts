// CONSULTA VENTAS Y SOLICITA VERIFICACIONES, CANCELACIONES Y FACTURAS.
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ServicioApi } from '../../../services/api.service';
import { Venta } from '../model/venta.model';

@Injectable({ providedIn: 'root' })
export class VentasService {
  private api = inject(ServicioApi);
  private http = inject(HttpClient);
  listar() {
    return this.api.obtener<Venta[]>('/ventas');
  }
  verificarPago(id: string) {
    return this.api.crear(`/ventas/${encodeURIComponent(id)}/capturar`, {});
  }
  cancelar(id: string) {
    return this.api.crear(`/ventas/${encodeURIComponent(id)}/cancelar`, {});
  }
  enviarCorreo(id: string) {
    return this.api.crear(`/ventas/${encodeURIComponent(id)}/correo`, {});
  }

  // RECIBE EL XML COMO ARCHIVO Y LO DESCARGA SIN SUBIRLO A OTRO SERVIDOR.
  async descargarFactura(id: string) {
    const archivo = await firstValueFrom(
      this.http.get(`/api/ventas/${encodeURIComponent(id)}/xml`, { responseType: 'blob' }),
    );
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `factura-${id}.xml`;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
