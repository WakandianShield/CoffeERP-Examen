// FORMULARIO DE ACCESO: ENVIA LAS CREDENCIALES Y ABRE EL PRIMER MODULO PERMITIDO.
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ServicioAutenticacion } from '../../services/autenticacion.service';
import { EstadoFormularioService } from '../../services/estado-formulario.service';
@Component({
  selector: 'app-autenticacion',
  providers: [EstadoFormularioService],
  imports: [FormsModule, RouterLink],
  templateUrl: './autenticacion.component.html',
  styleUrl: './autenticacion.component.css',
})
export class AutenticacionComponent {
  formulario = inject(EstadoFormularioService);

  autenticacion = inject(ServicioAutenticacion);
  enrutador = inject(Router);
  correo = '';
  contrasena = '';
  // INTENTA INICIAR SESION Y, SI FUNCIONA, NAVEGA A UNA PANTALLA PERMITIDA PARA EL USUARIO.
  enviar() {
    void this.formulario.ejecutar(async () => {
      await this.autenticacion.iniciarSesion(this.correo, this.contrasena);
      await this.enrutador.navigateByUrl(this.autenticacion.inicio());
    }, '');
  }
}
