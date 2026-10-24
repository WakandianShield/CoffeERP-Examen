import { SesionPaypal } from './sesion-paypal.model';
export interface SdkPaypal {
  findEligibleMethods(opciones: {
    currencyCode: string;
  }): Promise<{ isEligible(metodo: string): boolean }>;
  createPayPalOneTimePaymentSession(eventos: {
    onApprove: (datos: { orderId: string }) => Promise<void>;
    onCancel: () => void;
    onError: () => void;
  }): SesionPaypal;
}
