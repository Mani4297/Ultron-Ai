import { Component, ElementRef, ViewChild, AfterViewChecked, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { SpeechService } from '../../services/speech.service';
import { ChatMessage } from '../../models/chat.model';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-window.component.html',
  styleUrls: ['./chat-window.component.css']
})
export class ChatWindowComponent implements AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  public userInput: string = '';
  public activeVoiceMessageId = signal<string | null>(null);

  constructor(
    public chatService: ChatService,
    public speechService: SpeechService
  ) {}

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.warn('Scroll error', err);
    }
  }

  public onSend(): void {
    if (!this.userInput.trim() || this.chatService.isStreaming()) return;
    const text = this.userInput;
    this.userInput = '';
    this.chatService.sendMessage(text);
  }

  public onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }

  public toggleVoiceInput(): void {
    if (this.speechService.isHandsFree()) {
      this.speechService.stopHandsFree();
      return;
    }

    if (this.speechService.isListening()) {
      this.speechService.stopListening();
    } else {
      this.speechService.startListening((transcript) => {
        this.userInput = transcript;
        this.onSend();
      });
    }
  }

  public toggleHandsFree(): void {
    if (this.speechService.isHandsFree()) {
      this.speechService.stopHandsFree();
    } else {
      this.speechService.startHandsFree((transcript) => {
        this.userInput = transcript;
        this.onSend();
      });
    }
  }

  public onLanguageChange(event: Event): void {
    const language = (event.target as HTMLSelectElement).value as 'en-US' | 'te-IN';
    this.chatService.setResponseLanguage(language);
  }

  public speakMessage(msg: ChatMessage): void {
    if (this.speechService.isSpeaking() && this.activeVoiceMessageId() === msg.id) {
      this.speechService.stopSpeaking();
      this.activeVoiceMessageId.set(null);
    } else {
      this.activeVoiceMessageId.set(msg.id);
      this.speechService.speak(msg.content, () => {
        this.activeVoiceMessageId.set(null);
      });
    }
  }
}
