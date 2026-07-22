import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/auth/auth.service';
import { applyApiValidationErrors } from '../../core/api/api-error';
import { FeedbackService } from '../../core/feedback/feedback.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(FeedbackService);

  readonly savingProfile = signal(false);
  readonly savingPassword = signal(false);

  readonly profileForm = this.fb.nonNullable.group({
    name: [this.auth.me()?.name ?? '', [Validators.required, Validators.minLength(2)]],
  });

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required, Validators.minLength(8)]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.savingProfile.set(true);
    this.auth.updateProfile(this.profileForm.getRawValue().name).subscribe({
      next: () => {
        this.savingProfile.set(false);
        this.feedback.success('Perfil atualizado');
      },
      error: (err) => {
        this.savingProfile.set(false);
        if (!applyApiValidationErrors(this.profileForm, err)) {
          this.feedback.fromError(err, 'Falha ao atualizar perfil');
        }
      },
    });
  }

  savePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.savingPassword.set(true);
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordForm.reset();
        this.feedback.success('Senha alterada');
      },
      error: (err) => {
        this.savingPassword.set(false);
        if (!applyApiValidationErrors(this.passwordForm, err)) {
          this.feedback.fromError(err, 'Falha ao alterar senha');
        }
      },
    });
  }
}
