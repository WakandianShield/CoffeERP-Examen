// RELACIONA CADA DIRECCION CON SU PANTALLA Y LOS PERMISOS NECESARIOS PARA ABRIRLA.
import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const rutas: Routes = [
  // EL FORMULARIO DE ACCESO SE PUEDE ABRIR SIN HABER INICIADO SESION.
  { path: 'terminos-y-condiciones', loadComponent: () => import('./componentes/terminos-y-condiciones/terminos-y-condiciones.component').then(m => m.TerminosYCondicionesComponent) },
  { path: 'avisos-de-privacidad', loadComponent: () => import('./componentes/avisos-de-privacidad/avisos-de-privacidad.component').then(m => m.AvisosDePrivacidadComponent) },
  {
    path: 'iniciar-sesion',
    loadComponent: () =>
      import('./componentes/autenticacion/autenticacion.component').then(
        (m) => m.AutenticacionComponent,
      ),
  },
  {
    path: '',
    // EL MENU Y SUS PANTALLAS SOLO SE ABREN CUANDO HAY UNA SESION VALIDA.
    canActivate: [authGuard],
    // LOS HIJOS SE REVISAN DESPUES DE RECUPERAR LA SESION DEL PADRE.
    canActivateChild: [roleGuard],
    // CADA MODULO REVISA SU PERMISO Y CARGA SU COMPONENTE SOLO CUANDO SE NECESITA.
    children: [
      {
        path: 'ventas',
        data: { roles: ['ADMIN', 'CAJERO'], modulo: 'VENTAS' },
        loadComponent: () =>
          import('./componentes/ventas/ventas.component').then((m) => m.VentasComponent),
      },
      {
        path: 'inventario',
        data: { roles: ['ADMIN', 'CAJERO'], modulo: 'INVENTARIO' },
        loadComponent: () =>
          import('./componentes/productos/productos.component').then((m) => m.ProductosComponent),
      },
      {
        path: 'compras',
        data: { roles: ['ADMIN', 'CAJERO'], modulo: 'COMPRAS' },
        loadComponent: () =>
          import('./componentes/compras/compras.component').then((m) => m.ComprasComponent),
      },
      {
        path: 'rrhh',
        data: { roles: ['ADMIN', 'CAJERO'], modulo: 'RRHH' },
        loadComponent: () =>
          import('./componentes/empleados/empleados.component').then((m) => m.EmpleadosComponent),
      },
      {
        path: 'finanzas',
        data: { roles: ['ADMIN', 'CAJERO'], modulo: 'FINANZAS' },
        loadComponent: () =>
          import('./componentes/finanzas/finanzas.component').then((m) => m.FinanzasComponent),
      },
      { path: '', redirectTo: 'ventas', pathMatch: 'full' },
    ],
  },
  // LAS DIRECCIONES DESCONOCIDAS REGRESAN A VENTAS; LOS FILTROS VUELVEN A REVISAR EL ACCESO.
  { path: '**', redirectTo: 'ventas' },
];
