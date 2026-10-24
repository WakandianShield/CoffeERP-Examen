// MUESTRA LOS MODULOS PERMITIDOS, EL PERFIL DE LA CUENTA Y EL CIERRE DE SESION.
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ServicioAutenticacion } from '../../services/autenticacion.service';
import { NombreModulo } from '../../models/modulo.model';

@Component({
  selector: 'app-menu',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css',
})
export class MenuComponent {
  autenticacion = inject(ServicioAutenticacion);
  private enrutador = inject(Router);

  // OCULTA LOS ENLACES SIN PERMISO; LA API TAMBIEN COMPRUEBA CADA OPERACION.
  puedeAcceder(modulo: NombreModulo) {
    return this.autenticacion.tieneModulo(modulo);
  }

  // LA MARCA LLEVA AL PRIMER MODULO QUE PUEDE USAR LA CUENTA.
  inicio() {
    return this.autenticacion.inicio();
  }

  // BORRA LA SESION DE LA PESTANA Y VUELVE AL FORMULARIO DE ACCESO.
  cerrarSesion() {
    this.autenticacion.cerrarSesion();
    void this.enrutador.navigateByUrl('/iniciar-sesion');
  }
}
