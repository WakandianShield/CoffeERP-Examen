// CARGA UNA SOLA VEZ EL SDK DE PAYPAL PARA TODOS LOS CHECKOUT.
import { Injectable } from '@angular/core';
import { PaypalGlobal } from '../model/paypal-global.model';
@Injectable({ providedIn: 'root' })
export class PaypalSdkService {
  private carga?: Promise<PaypalGlobal>;
  // ANGULAR NO EJECUTA UN SCRIPT INCLUIDO EN UNA PLANTILLA; LO INSERTAMOS EN EL DOCUMENTO.
  cargarSdk(): Promise<PaypalGlobal> {
    // EL SDK USA ELEMENTOS DEL NAVEGADOR Y NO SE CARGA DESDE NODE.
    if (typeof window === 'undefined')
      return Promise.reject(new Error('PayPal requiere un navegador'));
    if (window.paypal) return Promise.resolve(window.paypal);
    if (!this.carga) {
      this.carga = new Promise<PaypalGlobal>((resolver, rechazar) => {
        const guion = document.createElement('script');
        guion.src = 'https://www.sandbox.paypal.com/web-sdk/v6/core';
        guion.async = true;
        guion.onload = () => {
          if (window.paypal) resolver(window.paypal);
          else {
            guion.remove();
            this.carga = undefined;
            rechazar(new Error('PayPal no terminó de cargar'));
          }
        };
        guion.onerror = () => {
          guion.remove();
          this.carga = undefined;
          rechazar(new Error('No se pudo cargar PayPal'));
        };
        document.head.appendChild(guion);
      });
    }
    return this.carga;
  }
}
