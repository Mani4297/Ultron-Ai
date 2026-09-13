import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-panel.component.html',
  styleUrls: ['./settings-panel.component.css']
})
export class SettingsPanelComponent {
  @Output() close = new EventEmitter<void>();

  constructor(public chatService: ChatService) {}

  public toggleVoice(event: any): void {
    this.chatService.updateSettings({ voiceEnabled: event.target.checked });
  }

  public toggleAutoSpeak(event: any): void {
    this.chatService.updateSettings({ autoSpeak: event.target.checked });
  }

  public updateDelay(event: any): void {
    this.chatService.updateSettings({ typingDelay: Number(event.target.value) });
  }

  public purgeHistory(): void {
    this.chatService.clearHistory();
    this.close.emit();
  }
}
