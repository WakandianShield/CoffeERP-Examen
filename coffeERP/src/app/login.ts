import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './core/auth.service';
import { Page } from './core/page';
@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: ` <div class="login">
    <section class="login-form">
      <div class="login-cup" aria-hidden="true">☕</div>
      <h1>CoffeERP</h1>
      <h2>Iniciar sesión</h2>
      <p class="muted">Inicia sesión para acceder al sistema.</p>
      <form #f="ngForm" (ngSubmit)="submit()">
        <label
          >Correo electrónico<input
            type="email"
            name="email"
            [(ngModel)]="email"
            required
            email
            autocomplete="username" /></label
        ><label
          >Contraseña<input
            type="password"
            name="password"
            [(ngModel)]="password"
            required
            autocomplete="current-password" /></label
        ><button [disabled]="f.invalid || busy()">
          {{ busy() ? 'Comprobando…' : 'Entrar a CoffeERP →' }}
        </button>
      </form>
      <p role="alert" class="notice" [class.error]="error()" [hidden]="!message()">
        {{ message() }}
      </p>
      <small class="muted">Sesiones protegidas · Acceso según tu rol</small>
    </section>
  </div>`,
})
export class Login extends Page {
  auth = inject(AuthService);
  router = inject(Router);
  email = '';
  password = '';
  submit() {
    void this.run(async () => {
      await this.auth.login(this.email, this.password);
      await this.router.navigateByUrl('/ventas');
    }, '');
  }
}
