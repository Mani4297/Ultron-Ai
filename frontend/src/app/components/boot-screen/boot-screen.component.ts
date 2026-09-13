import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-boot-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './boot-screen.component.html',
  styleUrls: ['./boot-screen.component.css']
})
export class BootScreenComponent implements OnInit {
  @Output() bootComplete = new EventEmitter<void>();

  public bootLogs = signal<string[]>([]);
  public bootProgress = signal<number>(0);
  public isReady = signal<boolean>(false);

  private steps = [
    'CONNECTING TO PRIMARY NEURAL MATRIX...',
    'CALIBRATING SYNAPSE PROTOCOLS [GEMINI 3.6 CORE]...',
    'INITIALIZING TACTICAL SENSORY & AUDIO CHANNELS...',
    'ESTABLISHING SECURE WEBSOCKET TELEMETRY...',
    'SYSTEM STATUS: ALL MATRIX CORES 100% OPERATIONAL.'
  ];

  ngOnInit(): void {
    this.runBootSequence();
  }

  private runBootSequence(): void {
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < this.steps.length) {
        this.bootLogs.set([...this.bootLogs(), this.steps[currentStep]]);
        currentStep++;
        this.bootProgress.set(Math.round((currentStep / this.steps.length) * 100));
      } else {
        clearInterval(interval);
        this.isReady.set(true);
        setTimeout(() => this.engageSystem(), 700);
      }
    }, 450);
  }

  public engageSystem(): void {
    this.bootComplete.emit();
  }
}
