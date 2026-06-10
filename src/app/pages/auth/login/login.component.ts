import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './login.component.html',
    styleUrl: './login.component.scss'
})
export class LoginComponent {
    form: FormGroup;
    loading = false;
    error = '';

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router
    ) {
        this.form = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', Validators.required]
        });
    }

    submit(): void {
        if (this.form.invalid) return;

        this.loading = true;
        this.error = '';

        this.authService.login(this.form.value).subscribe({
            next: (res) => {
                this.authService.saveToken(res.token);
                this.router.navigate(['/map']);
            },
            error: () => {
                this.error = 'Invalid email or password.';
                this.loading = false;
            }
        });
    }
}