import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
// Página informativa pública; su único enlace interno vuelve al acceso.
@Component({selector:'app-avisos-de-privacidad',standalone:true,imports:[RouterLink],templateUrl:'./avisos-de-privacidad.component.html',styleUrl:'./avisos-de-privacidad.component.css'})
export class AvisosDePrivacidadComponent {}
