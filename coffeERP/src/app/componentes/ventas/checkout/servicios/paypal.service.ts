// ENVIA EL CARRITO AL BACKEND PARA CREAR UNA ORDEN Y CONFIRMAR SU COBRO.
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ProductoCarrito } from '../../model/producto-carrito.model';
import { OrdenPaypal } from '../model/orden-paypal.model';
import { ResultadoPago } from '../../model/resultado-pago.model';
import { ConfiguracionPaypal } from '../model/configuracion-paypal.model';

@Injectable({ providedIn: 'root' })
export class PayPalService {
  private http = inject(HttpClient);
  // EL PROXY LLEVA /API AL BACKEND SIN FIJAR OTRO PUERTO DENTRO DEL COMPONENTE.
  private api = '/api/paypal';

  // LA CONFIGURACION PUBLICA CONTIENE EL CLIENT ID; LA CLAVE SECRETA NO SALE DEL BACKEND.
  obtenerConfiguracion() {
    return this.http.get<ConfiguracionPaypal>(`${this.api}/configuracion`);
  }

  // CLIENTE Y CORREO PERMITEN GENERAR LA FACTURA DEL SISTEMA ACTUAL.
  crearOrden(productos: ProductoCarrito[], cliente: string, correo: string) {
    return this.http.post<OrdenPaypal>(`${this.api}/orden`, { productos, cliente, correo });
  }

  // EL ID EXTERNO IDENTIFICA LA ORDEN; MYSQL CONSERVA SU RELACION CON LA VENTA.
  capturarOrden(ordenId: string) {
    return this.http.post<ResultadoPago>(`${this.api}/capturar/${encodeURIComponent(ordenId)}`, {});
  }
}
