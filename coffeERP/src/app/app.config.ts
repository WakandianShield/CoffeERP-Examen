// REGISTRA LA NAVEGACION, LAS PETICIONES HTTP Y EL MANEJO GENERAL DE ERRORES DEL NAVEGADOR.
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { rutas } from './app.routes';
import { interceptorAutenticacion } from './services/autenticacion.interceptor';
export const configuracionAplicacion: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(rutas),
    // EL INTERCEPTOR AGREGA EL TOKEN CUANDO LA PETICION VA DIRIGIDA A NUESTRA API.
    provideHttpClient(withInterceptors([interceptorAutenticacion])),
  ],
};
