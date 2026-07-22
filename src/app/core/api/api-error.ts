import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormGroup } from '@angular/forms';

export interface ApiErrorInfo {
  status: number | null;
  message: string;
  messages: string[];
  raw: unknown;
}

export function extractApiError(error: unknown, fallback = 'Ocorreu um erro'): ApiErrorInfo {
  if (error instanceof HttpErrorResponse) {
    const body = error.error;
    let messages: string[] = [];
    let message = fallback;

    if (typeof body === 'string' && body.trim()) {
      message = body;
      messages = [body];
    } else if (body && typeof body === 'object') {
      if (typeof body.message === 'string') {
        message = body.message;
        messages = [body.message];
      } else if (Array.isArray(body.message)) {
        messages = body.message.filter((m: unknown): m is string => typeof m === 'string');
        message = messages.join(', ') || fallback;
      } else if (typeof body.error === 'string') {
        message = body.error;
        messages = [body.error];
      }
    }

    if (!messages.length) {
      if (error.status === 0) message = 'Não foi possível conectar à API';
      else if (error.status === 401) message = 'Sessão expirada ou credenciais inválidas';
      else if (error.status === 403) message = 'Você não tem permissão para esta ação';
      else if (error.status === 404) message = 'Recurso não encontrado';
      else message = error.message || fallback;
      messages = [message];
    }

    return {
      status: error.status,
      message,
      messages,
      raw: error,
    };
  }

  if (error instanceof Error) {
    return {
      status: null,
      message: error.message || fallback,
      messages: [error.message || fallback],
      raw: error,
    };
  }

  return {
    status: null,
    message: fallback,
    messages: [fallback],
    raw: error,
  };
}

export function extractApiErrorMessage(error: unknown, fallback = 'Ocorreu um erro'): string {
  return extractApiError(error, fallback).message;
}

/** Maps Nest-style validation messages (`property constraint`) onto form controls when possible. */
export function applyApiValidationErrors(form: FormGroup, error: unknown): boolean {
  const info = extractApiError(error);
  if (info.status !== 400 || !info.messages.length) return false;

  let applied = false;
  for (const msg of info.messages) {
    const controlName = guessControlName(form, msg);
    if (!controlName) continue;
    const control = form.get(controlName);
    if (!control) continue;
    const current = control.errors ?? {};
    control.setErrors({ ...current, api: msg });
    control.markAsTouched();
    applied = true;
  }
  return applied;
}

function guessControlName(form: FormGroup, message: string): string | null {
  const lower = message.toLowerCase();
  for (const key of Object.keys(form.controls)) {
    if (lower.includes(key.toLowerCase())) return key;
  }

  const aliases: Record<string, string[]> = {
    email: ['e-mail', 'email'],
    password: ['senha', 'password'],
    name: ['nome', 'name'],
    phone: ['telefone', 'phone'],
  };

  for (const [control, words] of Object.entries(aliases)) {
    if (!form.contains(control)) continue;
    if (words.some((w) => lower.includes(w))) return control;
  }

  return null;
}

export function clearApiErrors(control: AbstractControl): void {
  if (!control.errors?.['api']) return;
  const { api: _api, ...rest } = control.errors;
  control.setErrors(Object.keys(rest).length ? rest : null);
}
