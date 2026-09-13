import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SpeechService {
  public language = signal<'en-US' | 'te-IN'>('en-US');
  public isListening = signal<boolean>(false);
  public isSpeaking = signal<boolean>(false);
  public isHandsFree = signal<boolean>(false);
  public speechError = signal<string | null>(null);

  private recognition: any = null;
  private synth: SpeechSynthesis | null = null;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private handsFreeHandler: ((transcript: string) => void) | null = null;
  private awaitingHandsFreeCommand = false;
  private processingHandsFreeCommand = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Setup Speech Synthesis
      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
        this.initVoice();
        if (this.synth.onvoiceschanged !== undefined) {
          this.synth.onvoiceschanged = () => this.initVoice();
        }
      }

      // Setup Speech Recognition
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        this.recognition = new SpeechRec();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = this.language();
      }
    }
  }

  private initVoice(): void {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    const languagePrefix = this.language().split('-')[0];
    const languageVoices = voices.filter(v => v.lang.toLowerCase().startsWith(languagePrefix));
    if (languageVoices.length > 0) {
      this.selectedVoice = languageVoices.find(v =>
        v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('george')
      ) || languageVoices[0];
      return;
    }
    // Prefer English deep/clear voices (e.g. Google UK English Male or Microsoft David/George)
    this.selectedVoice = voices.find(v => 
      v.lang.startsWith('en') && (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('george'))
    ) || voices.find(v => v.lang.startsWith('en')) || null;
  }

  public setLanguage(language: 'en-US' | 'te-IN'): void {
    this.language.set(language);
    if (this.recognition) this.recognition.lang = language;
    this.initVoice();
  }

  public startListening(onResult: (transcript: string) => void): void {
    if (!this.recognition) {
      this.speechError.set('Speech recognition is not supported in this browser.');
      return;
    }

    try {
      this.isHandsFree.set(false);
      this.handsFreeHandler = null;
      this.isListening.set(true);
      this.speechError.set(null);

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.isListening.set(false);
        if (transcript) {
          onResult(transcript);
        }
      };

      this.recognition.onerror = (event: any) => {
        this.isListening.set(false);
        this.speechError.set(`Microphone error: ${event.error}`);
      };

      this.recognition.onend = () => {
        this.isListening.set(false);
      };

      this.recognition.start();
    } catch (e: any) {
      this.isListening.set(false);
      this.speechError.set(e.message || 'Microphone activation failed');
    }
  }

  public stopListening(): void {
    if (this.recognition && (this.isListening() || this.isHandsFree())) {
      this.isHandsFree.set(false);
      this.handsFreeHandler = null;
      this.awaitingHandsFreeCommand = false;
      this.processingHandsFreeCommand = false;
      this.recognition.stop();
      this.isListening.set(false);
    }
  }

  public startHandsFree(onCommand: (transcript: string) => void): void {
    if (!this.recognition) {
      this.speechError.set('Hands-free voice recognition is not supported in this browser.');
      return;
    }

    this.handsFreeHandler = onCommand;
    this.isHandsFree.set(true);
    this.processingHandsFreeCommand = false;
    this.startWakeWordListening();
  }

  public stopHandsFree(): void {
    this.isHandsFree.set(false);
    this.handsFreeHandler = null;
    this.awaitingHandsFreeCommand = false;
    this.processingHandsFreeCommand = false;
    this.stopListening();
  }

  public resumeHandsFree(): void {
    if (!this.isHandsFree() || !this.handsFreeHandler) return;
    this.processingHandsFreeCommand = false;
    this.startCommandListening();
  }

  private startWakeWordListening(): void {
    if (!this.isHandsFree() || !this.recognition || this.processingHandsFreeCommand) return;

    this.awaitingHandsFreeCommand = false;
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.trim();
      const wakeMatch = transcript.match(/\bhello\s+(jarvis|ultron)\b/i);
      if (!wakeMatch) return;

      const command = transcript.slice((wakeMatch.index || 0) + wakeMatch[0].length).trim();
      if (command) {
        this.processingHandsFreeCommand = true;
        this.isListening.set(false);
        this.handsFreeHandler?.(command);
      } else {
        this.awaitingHandsFreeCommand = true;
      }
    };
    this.recognition.onerror = (event: any) => {
      this.isListening.set(false);
      if (event.error !== 'aborted') {
        this.speechError.set(`Microphone error: ${event.error}`);
      }
    };
    this.recognition.onend = () => {
      this.isListening.set(false);
      if (this.isHandsFree() && !this.processingHandsFreeCommand) {
        if (this.awaitingHandsFreeCommand) {
          this.startCommandListening();
        } else {
          this.startWakeWordListening();
        }
      }
    };

    try {
      this.isListening.set(true);
      this.speechError.set(null);
      this.recognition.start();
    } catch (e: any) {
      this.isListening.set(false);
      if (e.name !== 'InvalidStateError') {
        this.speechError.set(e.message || 'Hands-free microphone activation failed');
      }
    }
  }

  private startCommandListening(): void {
    if (!this.isHandsFree() || !this.recognition || !this.handsFreeHandler) return;

    this.awaitingHandsFreeCommand = true;
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.trim();
      if (!transcript) return;
      this.awaitingHandsFreeCommand = false;
      this.processingHandsFreeCommand = true;
      this.isListening.set(false);
      this.handsFreeHandler?.(transcript);
    };
    this.recognition.onerror = (event: any) => {
      this.awaitingHandsFreeCommand = false;
      this.isListening.set(false);
      if (event.error !== 'aborted') {
        this.speechError.set(`Microphone error: ${event.error}`);
      }
    };
    this.recognition.onend = () => {
      this.isListening.set(false);
      if (this.isHandsFree() && this.awaitingHandsFreeCommand) {
        this.startCommandListening();
      }
    };

    try {
      this.isListening.set(true);
      this.recognition.start();
    } catch (e: any) {
      this.isListening.set(false);
      if (e.name !== 'InvalidStateError') {
        this.speechError.set(e.message || 'Hands-free command capture failed');
      }
    }
  }

  public speak(text: string, onEnd?: () => void): void {
    if (!this.synth) return;

    // Clean markdown/symbols from text before reading
    const cleanText = text
      .replace(/[*_#`~[\]]/g, '')
      .replace(/\n+/g, '. ')
      .trim();

    if (!cleanText) return;

    this.stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.rate = 1.05; // slightly crisp & efficient
    utterance.pitch = 0.92; // slightly deeper sci-fi resonance

    utterance.onstart = () => {
      this.isSpeaking.set(true);
    };

    utterance.onend = () => {
      this.isSpeaking.set(false);
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      this.isSpeaking.set(false);
    };

    this.synth.speak(utterance);
  }

  public stopSpeaking(): void {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking.set(false);
    }
  }
}
