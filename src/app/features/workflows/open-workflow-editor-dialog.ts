import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { WorkflowEditorComponent } from './editor/workflow-editor.component';

export interface WorkflowEditorDialogData {
  workflowId?: string | null;
  templateKey?: string | null;
}

export interface WorkflowEditorDialogResult {
  saved?: boolean;
  workflowId?: string;
}

const FULLSCREEN_CONFIG: MatDialogConfig = {
  width: '100vw',
  height: '100vh',
  maxWidth: '100vw',
  maxHeight: '100vh',
  panelClass: 'wf-editor-dialog',
  autoFocus: false,
  restoreFocus: true,
  enterAnimationDuration: '160ms',
  exitAnimationDuration: '120ms',
};

export function openWorkflowEditorDialog(
  dialog: MatDialog,
  data: WorkflowEditorDialogData = {},
): MatDialogRef<WorkflowEditorComponent, WorkflowEditorDialogResult> {
  return dialog.open(WorkflowEditorComponent, {
    ...FULLSCREEN_CONFIG,
    data,
  });
}
