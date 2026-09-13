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
      title: 'DAILY BRIEF',
      description: 'Get a clear overview of your assistant and today\'s focus',
      icon: 'ri-pulse-line',
      prompt: 'Ultron, give me a clear daily brief with my current focus, available capabilities, and useful next steps.'
    },
    {
      id: 'threat',
      title: 'RISK & PRIORITIES',
      description: 'Spot risks and decide what deserves attention first',
      icon: 'ri-shield-cross-line',
      prompt: 'Ultron, help me identify risks, decisions, and the most important priorities in my current workflow.'
    },
    {
      id: 'optimize',
      title: 'IDEAS & IMPROVEMENTS',
      description: 'Find practical ways to improve a project or plan',
      icon: 'ri-terminal-box-line',
      prompt: 'Ultron, review my project or plan and suggest three practical improvements with clear reasoning.'
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
