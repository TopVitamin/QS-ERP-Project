import { seedTransferTasks } from '../data/transferTaskData.js';
import { readMockRows, subscribeMockRows, writeMockRows } from './mockStorage.js';

export const TRANSFER_TASKS_STORAGE_KEY = 'qs-erp:transfer-tasks:v1';

export function readTransferTasks() {
  return readMockRows(TRANSFER_TASKS_STORAGE_KEY, seedTransferTasks);
}

export function writeTransferTasks(tasks) {
  writeMockRows(TRANSFER_TASKS_STORAGE_KEY, tasks);
}

export function subscribeTransferTasks(onChange) {
  return subscribeMockRows(TRANSFER_TASKS_STORAGE_KEY, onChange);
}

export function createTransferTask(task) {
  writeTransferTasks([task, ...readTransferTasks()]);
  return task;
}

export function updateTransferTask(id, updater) {
  writeTransferTasks(readTransferTasks().map((task) => (task.id === id ? updater(task) : task)));
}

export function removeTransferTask(id) {
  writeTransferTasks(readTransferTasks().filter((task) => task.id !== id));
}
