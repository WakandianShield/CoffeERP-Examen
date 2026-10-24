import { SdkPaypal } from './sdk-paypal.model';
export interface PaypalGlobal {
  createInstance(opciones: {
    clientId: string;
    components: string[];
    pageType: string;
  }): Promise<SdkPaypal>;
}

// EL SDK EXTERNO PUBLICA PAYPAL EN LA VENTANA DEL NAVEGADOR.
declare global {
  interface Window {
    paypal?: PaypalGlobal;
  }
}
