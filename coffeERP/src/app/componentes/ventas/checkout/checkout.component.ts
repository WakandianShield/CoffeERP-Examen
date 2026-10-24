// CHECKOUT DE VENTAS BASADO EN EL SDK V6: CREA LA ORDEN Y CONFIRMA EL COBRO EN EL SERVIDOR.
import {
  AfterViewInit,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  NgZone,
  OnDestroy,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PayPalService } from './servicios/paypal.service';
import { PaypalSdkService } from './servicios/paypal-sdk.service';
import { ProductoCarrito } from '../model/producto-carrito.model';
import { ResultadoPago } from '../model/resultado-pago.model';
import { SesionPaypal } from './model/sesion-paypal.model';

@Component({
  selector: 'app-checkout',
  standalone: true,
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css',
  // EL BOTON ES UN ELEMENTO WEB CREADO POR PAYPAL, NO UN COMPONENTE DE ANGULAR.
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CheckoutComponent implements AfterViewInit, OnDestroy {
  private paypalService = inject(PayPalService);
  private sdkService = inject(PaypalSdkService);
  private zone = inject(NgZone);

  // RECIBE LOS VALORES DEL FORMULARIO Y DEL CARRITO DEL COMPONENTE DE VENTAS.
  @Input() productos: ProductoCarrito[] = [];
  @Input() cliente = '';
  @Input() correo = '';
  @Input() deshabilitado = false;
  @Output() ocupadoCambio = new EventEmitter<boolean>();
  @Output() pagoCompletado = new EventEmitter<ResultadoPago>();
  @Output() actualizar = new EventEmitter<void>();
  @ViewChild('botonPaypal', { static: true }) private boton!: ElementRef<HTMLElement>;

  mensaje = signal('Preparando PayPal...');
  listo = signal(false);
  procesando = signal(false);
  error = signal(false);
  private sesion?: SesionPaypal;
  private destruido = false;
  private escucharClic = () => {
    void this.pagar();
  };

  // ESPERA A QUE EXISTA EL BOTON ANTES DE PREPARAR EL SDK Y REGISTRAR SU CLIC.
  async ngAfterViewInit() {
    try {
      const configuracion = await firstValueFrom(this.paypalService.obtenerConfiguracion());
      if (!configuracion.idCliente) throw new Error('PayPal pendiente de configurar');
      const paypal = await this.sdkService.cargarSdk();
      if (this.destruido) return;
      const sdk = await paypal.createInstance({
        clientId: configuracion.idCliente,
        components: ['paypal-payments'],
        pageType: 'checkout',
      });
      const metodos = await sdk.findEligibleMethods({ currencyCode: 'MXN' });
      if (this.destruido) return;
      if (!metodos.isEligible('paypal')) {
        this.zone.run(() => this.mensaje.set('PayPal no está disponible en este navegador'));
        return;
      }
      this.sesion = sdk.createPayPalOneTimePaymentSession({
        // LA APROBACION DEL SDK TODAVIA NECESITA CAPTURA Y VERIFICACION EN EL BACKEND.
        onApprove: async (datos: { orderId: string }) => {
          try {
            const resultado = await firstValueFrom(this.paypalService.capturarOrden(datos.orderId));
            this.zone.run(() => {
              this.mensaje.set(resultado.mensaje);
              this.error.set(false);
              this.cambiarOcupado(false);
              this.pagoCompletado.emit(resultado);
            });
          } catch {
            this.zone.run(() => {
              this.mensaje.set(
                'Pago pendiente de verificación. Usa Verificar pago en el historial.',
              );
              this.error.set(true);
              this.cambiarOcupado(false);
              this.actualizar.emit();
            });
          }
        },
        onCancel: () => {
          this.zone.run(() => {
            this.mensaje.set(
              'Pago cancelado. Cancela la reserva en el historial para liberar los productos.',
            );
            this.error.set(false);
            this.cambiarOcupado(false);
            this.actualizar.emit();
          });
        },
        onError: () => {
          this.zone.run(() => {
            this.mensaje.set(
              'PayPal no confirmó el pago. Revisa el historial antes de volver a pagar.',
            );
            this.error.set(true);
            this.cambiarOcupado(false);
            this.actualizar.emit();
          });
        },
      });
      this.boton.nativeElement.addEventListener('click', this.escucharClic);
      this.zone.run(() => {
        this.listo.set(true);
        this.mensaje.set('Selecciona PayPal para pagar con una cuenta Sandbox.');
      });
    } catch {
      if (this.destruido) return;
      this.zone.run(() => {
        this.error.set(true);
        this.mensaje.set(
          'No se pudo preparar PayPal. Revisa la conexión y la configuración Sandbox.',
        );
      });
    }
  }

  // ABRE EL SDK DESDE EL CLIC SIN ESPERAR PRIMERO A LA PETICION QUE CREA LA ORDEN.
  async pagar() {
    if (!this.sesion || this.deshabilitado || this.procesando() || !this.productos.length) return;
    this.zone.run(() => {
      this.cambiarOcupado(true);
      this.error.set(false);
      this.mensaje.set('Abriendo PayPal...');
    });
    try {
      await this.sesion.start(
        { presentationMode: 'auto' },
        firstValueFrom(
          this.paypalService.crearOrden(this.productos, this.cliente, this.correo),
        ).then((orden) => ({ orderId: orden.id })),
      );
    } catch {
      this.zone.run(() => {
        this.error.set(true);
        this.mensaje.set(
          'No se pudo iniciar el pago. Revisa el historial antes de volver a intentarlo.',
        );
        this.cambiarOcupado(false);
        this.actualizar.emit();
      });
    }
  }

  // SINCRONIZA EL ESTADO DEL BOTON CON EL FORMULARIO Y EL CARRITO DE VENTAS.
  private cambiarOcupado(ocupado: boolean) {
    this.procesando.set(ocupado);
    this.ocupadoCambio.emit(ocupado);
  }

  // QUITA EL ESCUCHADOR AL SALIR DE VENTAS PARA NO DUPLICAR CLICS AL VOLVER.
  ngOnDestroy() {
    this.destruido = true;
    this.boton?.nativeElement.removeEventListener('click', this.escucharClic);
  }
}
