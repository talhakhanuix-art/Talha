/**
 * Talha Download Manager (TDM) - Queue Manager
 * Coordinates multi-item queues, concurrency caps, pausing/resuming all,
 * and automatic transition of queued items.
 */

import { EventEmitter } from 'events';
import { DownloadTask } from './download-engine.js';

export class DownloadQueueManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxConcurrent = options.maxConcurrent || 3;
    this.speedLimitKbps = options.speedLimitKbps || 0; // 0 = unlimited
    this.tasks = new Map(); // id -> DownloadTask
    this.queueOrder = []; // array of task IDs
  }

  addTask(taskOptions) {
    const task = new DownloadTask({
      ...taskOptions,
      speedLimitBytesPerSec: this.speedLimitKbps * 1024
    });

    this.tasks.set(task.id, task);
    this.queueOrder.push(task.id);

    task.on('progress', (data) => this.emit('task-progress', data));
    task.on('status-change', (status) => {
      this.emit('task-status', { id: task.id, status, data: task.getProgressData() });
      if (status === 'completed' || status === 'error' || status === 'cancelled' || status === 'paused') {
        this.processQueue();
      }
    });
    task.on('completed', (data) => this.emit('task-completed', data));
    task.on('error', (err) => this.emit('task-error', { id: task.id, error: err }));

    if (taskOptions.autoStart !== false) {
      this.processQueue();
    }

    return task;
  }

  getTask(id) {
    return this.tasks.get(id);
  }

  getAllTasks() {
    return Array.from(this.tasks.values()).map(t => t.getProgressData());
  }

  getActiveCount() {
    let count = 0;
    for (const task of this.tasks.values()) {
      if (task.status === 'downloading') count++;
    }
    return count;
  }

  processQueue() {
    const active = this.getActiveCount();
    const availableSlots = this.maxConcurrent - active;
    if (availableSlots <= 0) return;

    let started = 0;
    for (const id of this.queueOrder) {
      if (started >= availableSlots) break;
      const task = this.tasks.get(id);
      if (task && task.status === 'queued') {
        task.start();
        started++;
      }
    }
  }

  pauseTask(id) {
    const task = this.tasks.get(id);
    if (task) {
      task.pause();
    }
  }

  resumeTask(id) {
    const task = this.tasks.get(id);
    if (task) {
      if (this.getActiveCount() < this.maxConcurrent) {
        task.start();
      } else {
        task.status = 'queued';
        task.emit('status-change', 'queued');
      }
    }
  }

  pauseAll() {
    for (const task of this.tasks.values()) {
      if (task.status === 'downloading' || task.status === 'queued') {
        task.pause();
      }
    }
  }

  resumeAll() {
    for (const task of this.tasks.values()) {
      if (task.status === 'paused' || task.status === 'error') {
        task.status = 'queued';
        task.emit('status-change', 'queued');
      }
    }
    this.processQueue();
  }

  cancelTask(id) {
    const task = this.tasks.get(id);
    if (task) {
      task.cancel();
      this.tasks.delete(id);
      this.queueOrder = this.queueOrder.filter(taskId => taskId !== id);
      this.processQueue();
    }
  }

  deleteTask(id, deletePhysicalFile = false) {
    const task = this.tasks.get(id);
    if (task) {
      task.cancel();
      if (deletePhysicalFile) {
        try {
          if (fs.existsSync(task.targetFile)) {
            fs.unlinkSync(task.targetFile);
          }
          if (fs.existsSync(task.tempFile)) {
            fs.unlinkSync(task.tempFile);
          }
        } catch (e) {
          // ignore error
        }
      }
      this.tasks.delete(id);
      this.queueOrder = this.queueOrder.filter(taskId => taskId !== id);
      this.processQueue();
    }
  }

  setMaxConcurrent(num) {
    this.maxConcurrent = Math.max(1, Math.min(10, num));
    this.processQueue();
  }

  setSpeedLimit(kbps) {
    this.speedLimitKbps = kbps;
    const limitBytes = kbps > 0 ? kbps * 1024 : 0;
    for (const task of this.tasks.values()) {
      task.speedLimitBytesPerSec = limitBytes;
    }
  }
}
