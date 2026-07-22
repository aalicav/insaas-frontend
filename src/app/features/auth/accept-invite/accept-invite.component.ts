import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/auth/auth.service';
import { FeedbackService } from '../../../core/feedback/feedback.service';
import { applyApiValidationErrors } from '../../../core/api/api-error';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-accept-invite',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './accept-invite.component.html',
  styleUrl: './accept-invite.component.scss',
})
export class AcceptInviteComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly feedback = inject(FeedbackService);

  readonly appName = environment.appName;
  readonly loading = signal(false);
  readonly tokenMissing = signal(false);

  readonly form = this.fb.nonNullable.group({
    token: ['', [Validators.required, Validators.minLength(16)]],
    name: [''],
    password: ['', [Validators.minLength(8)]],
  });

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!token) {
      this.tokenMissing.set(true);
      return;
    }
    this.form.patchValue({ token });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.loading.set(true);
    this.auth
      .acceptInvitation({
        token: raw.token,
        name: raw.name || undefined,
        password: raw.password || undefined,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.feedback.success('Convite aceito com sucesso');
          void this.router.navigateByUrl('/dashboard');
        },
        error: (err) => {
          this.loading.set(false);
          if (!applyApiValidationErrors(this.form, err)) {
            this.feedback.fromError(err, 'Falha ao aceitar convite');
          }
        },
      });
  }
}
