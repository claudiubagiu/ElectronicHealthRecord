import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MAT_COMMON_IMPORTS } from '../../../../shared/imports/material.imports';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS, RouterLink, AsyncPipe],
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
})
export class Home {
  private authService = inject(AuthService);
  isAuthenticated$ = this.authService.isAuthenticated$;
}
