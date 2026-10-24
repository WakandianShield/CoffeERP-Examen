// COMPONENTE PRINCIPAL: COLOCA EL MENU Y LA PANTALLA ACTIVA SIN UNA CAPA DE ESTRUCTURA.
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MenuComponent } from './componentes/menu/menu.component';
import { ServicioAutenticacion } from './services/autenticacion.service';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MenuComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  autenticacion = inject(ServicioAutenticacion);
}
