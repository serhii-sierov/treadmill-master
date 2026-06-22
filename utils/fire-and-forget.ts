import { Alert } from 'react-native';

type AsyncTask = Promise<unknown> | (() => Promise<unknown>);

function runTask(task: AsyncTask): Promise<unknown> {
  return typeof task === 'function' ? task() : task;
}

export function getErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  return error instanceof Error ? error.message : fallback;
}

/** Run async work without awaiting; route failures to onError (defaults to console.error). */
export function fireAndForget(task: AsyncTask, onError?: (error: unknown) => void): void {
  runTask(task).catch((error) => {
    if (onError) {
      onError(error);
    } else {
      console.error(error);
    }
  });
}

/** fireAndForget with a native alert on failure — common for screen actions. */
export function fireAndForgetAlert(task: AsyncTask, alertTitle: string): void {
  fireAndForget(task, (error) => Alert.alert(alertTitle, getErrorMessage(error)));
}
