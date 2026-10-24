import { VentasService } from './servicios/ventas.service';
import { ProductosService } from '../../services/productos.service';
// PANTALLA DE VENTAS: MUESTRA PRODUCTOS, ARMA EL CARRITO Y PERMITE PAGAR O REVISAR PAGOS ANTERIORES.
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EstadoFormularioService } from '../../services/estado-formulario.service';
import { Producto } from '../../models/producto.model';
import { Venta } from './model/venta.model';
import { ProductoCarrito } from './model/producto-carrito.model';
import { ResultadoPago } from './model/resultado-pago.model';
import { CheckoutComponent } from './checkout/checkout.component';
@Component({
  selector: 'app-ventas',
  providers: [EstadoFormularioService],
  imports: [FormsModule, CheckoutComponent],
  templateUrl: './ventas.component.html',
  styleUrl: './ventas.component.css',
})
export class VentasComponent implements OnInit {
  formulario = inject(EstadoFormularioService);
  productosService = inject(ProductosService);
  ventasService = inject(VentasService);
  // LOS LISTADOS Y EL CARRITO SON SENALES: LA VISTA SE ACTUALIZA CUANDO CAMBIAN.
  productos = signal<Producto[]>([]);
  ventas = signal<Venta[]>([]);
  carrito = signal<ProductoCarrito[]>([]);
  cliente = '';
  correo = '';
  // AL ABRIR VENTAS, CARGA EL CATALOGO Y EL HISTORIAL; EL CHECKOUT PREPARA PAYPAL.
  ngOnInit() {
    void this.formulario.ejecutar(() => this.cargar(), '');
  }
  // RECARGA LOS LISTADOS DEL SERVIDOR PARA MOSTRAR LOS DATOS ACTUALES.
  async cargar() {
    this.productos.set((await this.productosService.listar()).filter((p) => p.activo));
    this.ventas.set(await this.ventasService.listar());
  }
  // BUSCA EL NOMBRE DEL PRODUCTO PARA MOSTRARLO EN EL CARRITO.
  nombre(id: number) {
    return this.productos().find((p) => p.id === id)?.nombre || '';
  }
  // BUSCA EL PRECIO DEL CATALOGO EN CENTAVOS PARA CALCULAR EL IMPORTE MOSTRADO.
  precio(id: number) {
    return this.productos().find((p) => p.id === id)?.precioCentavos || 0;
  }
  // DEVUELVE CUANTAS UNIDADES DEL PRODUCTO YA ESTAN AGREGADAS AL PEDIDO.
  cantidadEnCarrito(id: number) {
    return this.carrito().find((p) => p.id === id)?.cantidad || 0;
  }
  // AGREGA UNA UNIDAD SIN SUPERAR LAS EXISTENCIAS DISPONIBLES NI EL LIMITE DE 100 POR PRODUCTO.
  agregar(p: Producto) {
    if (
      p.existencias - p.reservado <= this.cantidadEnCarrito(p.id) ||
      this.cantidadEnCarrito(p.id) >= 100
    )
      return;
    this.carrito.update((detalles) =>
      detalles.some((i) => i.id === p.id)
        ? detalles.map((i) => (i.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i))
        : [...detalles, { id: p.id, cantidad: 1 }],
    );
  }
  // BUSCA EL PRODUCTO Y REUTILIZA LA MISMA VALIDACION PARA AGREGAR OTRA UNIDAD.
  aumentar(id: number) {
    const p = this.productos().find((p) => p.id === id);
    if (p) this.agregar(p);
  }
  // RESTA UNA UNIDAD Y QUITA EL PRODUCTO DEL CARRITO SI SU CANTIDAD LLEGA A CERO.
  quitar(id: number) {
    this.carrito.update((detalles) =>
      detalles
        .map((i) => (i.id === id ? { ...i, cantidad: i.cantidad - 1 } : i))
        .filter((i) => i.cantidad > 0),
    );
  }
  // SUMA PRECIO POR CANTIDAD PARA MOSTRAR EL TOTAL; EL SERVIDOR LO CALCULA OTRA VEZ AL CREAR LA VENTA.
  total() {
    return this.carrito().reduce((suma, i) => suma + this.precio(i.id) * i.cantidad, 0);
  }
  // EL CHECKOUT YA CONFIRMO EL COBRO; VACIA EL CARRITO Y ACTUALIZA EXISTENCIAS E HISTORIAL.
  completarPago(resultado: ResultadoPago) {
    this.carrito.set([]);
    void this.formulario.ejecutar(
      () => this.cargar(),
      resultado.mensaje + '. Consulta el estado del correo en el historial.',
    );
  }

  // RECARGA EL CATALOGO Y LAS VENTAS CUANDO EL USUARIO PULSA ACTUALIZAR.
  actualizar() {
    void this.formulario.ejecutar(() => this.cargar(), '');
  }
  // SOLICITA LA DESCARGA DE LA FACTURA XML DE LA VENTA SELECCIONADA.
  xml(id: string) {
    void this.formulario.ejecutar(
      () => this.ventasService.descargarFactura(id),
      'Factura XML descargada',
    );
  }
  // PIDE EL REENVIO DE LA FACTURA Y ACTUALIZA EL HISTORIAL PARA MOSTRAR EL ESTADO DEL CORREO.
  enviarCorreo(id: string) {
    void this.formulario.ejecutar(async () => {
      await this.ventasService.enviarCorreo(id);
      await this.cargar();
    }, 'Factura aceptada por el servicio de correo');
  }
  // PIDE AL SERVIDOR QUE REVISE EL PAGO EN PAYPAL ANTES DE DARLO POR COMPLETADO.
  verificar(id: string) {
    void this.formulario.ejecutar(async () => {
      await this.ventasService.verificarPago(id);
      await this.cargar();
    }, 'Pago confirmado');
  }
  // PIDE CONFIRMACION AL USUARIO Y SOLICITA CANCELAR LA RESERVA PARA RECUPERAR LAS UNIDADES.
  cancelar(id: string) {
    if (!confirm('¿Cancelar esta reserva y liberar existencias?')) return;
    void this.formulario.ejecutar(async () => {
      await this.ventasService.cancelar(id);
      await this.cargar();
    }, 'Reserva cancelada');
  }
}
