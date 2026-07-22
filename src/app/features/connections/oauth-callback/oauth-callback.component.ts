import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, PageHeaderComponent, StatusBadgeComponent],
  template: `
    <section class="ih-page">
      <app-page-header
        eyebrow="OAuth"
        title="Retorno da autenticação"
        subtitle="Resultado do provider após autorização."
      />

      <article class="ih-card ih-card-accent result-card">
        @if (error()) {
          <div class="result-icon error">
            <mat-icon>error_outline</mat-icon>
          </div>
          <app-status-badge status="error" />
          <h2>Não foi possível concluir</h2>
          <p class="ih-muted">{{ error() }}</p>
          <p class="ih-muted tip">
            Volte à lista e tente conectar novamente. Se o problema continuar, revise as permissões no provider.
          </p>
        } @else {
          <div class="result-icon ok">
            <mat-icon>check_circle</mat-icon>
          </div>
          <app-status-badge [status]="status() || 'connected'" />
          <h2>Autenticação concluída</h2>
          <p class="ih-muted">
            A conexão foi atualizada com sucesso. Você já pode abrir os detalhes e iniciar uma sincronização.
          </p>
        }

        <div class="ih-actions">
          @if (connectionId() && !error()) {
            <a mat-flat-button color="primary" [routerLink]="['/connections', connectionId()]">
              Abrir conexão
            </a>
          }
          <a mat-stroked-button routerLink="/integrations">Lista de integrações</a>
          @if (error()) {
            <a mat-flat-button color="primary" routerLink="/connections/new">Tentar novamente</a>
          }
        </div>
      </article>
    </section>
  `,
  styles: `
    .result-card {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 36rem;
    }
    .result-icon {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: grid;
      place-items: center;
    }
    .result-icon.ok {
      background: color-mix(in srgb, var(--ih-success) 18%, transparent);
      color: var(--ih-success);
    }
    .result-icon.error {
      background: color-mix(in srgb, var(--ih-danger) 18%, transparent);
      color: var(--ih-danger);
    }
    h2 {
      margin: 0;
      font-size: 1.25rem;
    }
    .tip {
      margin: 0;
    }
    .ih-actions {
      margin-top: 0.5rem;
    }
  `,
})
export class OauthCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly connectionId = signal<string | null>(null);
  readonly status = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    this.connectionId.set(q.get('connectionId'));
    this.status.set(q.get('status'));
    this.error.set(q.get('error'));
  }
}
