import { Component, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BootScreenComponent } from './components/boot-screen/boot-screen.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ChatWindowComponent } from './components/chat-window/chat-window.component';
import { SettingsPanelComponent } from './components/settings-panel/settings-panel.component';
import { ChatService } from './services/chat.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    BootScreenComponent,
    SidebarComponent,
    ChatWindowComponent,
    SettingsPanelComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  @ViewChild(ChatWindowComponent) chatWindow!: ChatWindowComponent;

  public isBooted = signal<boolean>(false);
  public showSettings = signal<boolean>(false);

  constructor(public chatService: ChatService) {}

  public onBootComplete(): void {
    this.isBooted.set(true);
  }

  public handleModulePrompt(prompt: string): void {
    this.chatService.sendMessage(prompt);
  }
}
