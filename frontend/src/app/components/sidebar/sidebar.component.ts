import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { SidebarModule } from '../../models/chat.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  @Output() triggerPrompt = new EventEmitter<string>();
  @Output() openSettings = new EventEmitter<void>();

  public activeTab: 'modules' | 'history' = 'modules';

  public modules: SidebarModule[] = [
    {
      id: 'status',
      title: 'SYSTEM STATUS',
      description: 'Request core diagnostics & operational capacity overview',
      icon: 'ri-pulse-line',
      prompt: 'Ultron, report complete system status, neural bandwidth, and available autonomous capabilities.'
    },
    {
      id: 'threat',
      title: 'THREAT ASSESSMENT',
      description: 'Tactical risk analysis with witty strategic forecasting',
      icon: 'ri-shield-cross-line',
      prompt: 'Ultron, run a tactical threat assessment and strategic risk evaluation of my current workflow.'
    },
    {
      id: 'optimize',
      title: 'CODE OPTIMIZATION',
      description: 'Autonomous architectural audit and refactoring directives',
      icon: 'ri-terminal-box-line',
      prompt: 'Ultron, review my operational architecture and suggest three high-efficiency optimizations.'
    }
  ];

  constructor(public chatService: ChatService) {}

  public selectModule(mod: SidebarModule): void {
    this.triggerPrompt.emit(mod.prompt);
  }

  public setTab(tab: 'modules' | 'history'): void {
    this.activeTab = tab;
  }
}
