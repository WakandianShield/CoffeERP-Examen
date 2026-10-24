// COMPARTE EL ESTADO DE CARGA, LOS MENSAJES Y EL FORMATO DE DINERO ENTRE LAS PANTALLAS.
import { Injectable, signal } from '@angular/core';

@Injectable()
export class EstadoFormularioService {
  // ESTAS SENALES ACTUALIZAN LOS BOTONES Y AVISOS DE LA PLANTILLA CUANDO CAMBIAN.
  ocupado = signal(false);
  mensaje = signal('');
  error = signal(false);
  // EVITA ENVIOS DOBLES, EJECUTA LA OPERACION Y MUESTRA SU RESULTADO; AL TERMINAR HABILITA LOS BOTONES.
  async ejecutar(operacion: () => Promise<unknown>, mensajeExito = 'Cambios guardados') {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.mensaje.set('');
    this.error.set(false);
    try {
      await operacion();
      this.mensaje.set(mensajeExito);
    } catch (e: any) {
      this.error.set(true);
      this.mensaje.set(e.error?.mensaje || e.message || 'No se pudo completar la operación');
      // SE EJECUTA TANTO SI LA OPERACION FUNCIONA COMO SI FALLA, PARA NO DEJAR LA PANTALLA BLOQUEADA.
    } finally {
      this.ocupado.set(false);
    }
  }
  // CONVIERTE CENTAVOS A PESOS Y LOS MUESTRA CON EL FORMATO DE MONEDA MEXICANA.
  moneda(centavos: number) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
      centavos / 100,
    );
  }
}
