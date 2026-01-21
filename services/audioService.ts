import { AudioStats } from '../types';

export class AudioService {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private audio: HTMLAudioElement | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private prevTreble = 0;
  private onEndedCallback: (() => void) | null = null;

  constructor() {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 2048;
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
  }

  public async setupAudio(data: Blob, onEnded?: () => void): Promise<void> {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio.onended = null;
    }

    const url = URL.createObjectURL(data);
    this.audio = new Audio(url);
    this.audio.crossOrigin = 'anonymous';
    this.onEndedCallback = onEnded || null;

    this.audio.onended = () => {
      if (this.onEndedCallback) this.onEndedCallback();
    };
    
    if (this.context!.state === 'suspended') {
      await this.context!.resume();
    }

    if (this.source) {
      this.source.disconnect();
    }

    this.source = this.context!.createMediaElementSource(this.audio);
    this.source.connect(this.analyser!);
    this.analyser!.connect(this.context!.destination);
    
    this.audio.play().catch(e => console.warn("Autoplay blocked or failed:", e));
  }

  public getStats(sensitivity: number): AudioStats {
    if (!this.analyser || !this.dataArray) {
      return { bass: 0, mid: 0, treble: 0, isTransient: false };
    }

    this.analyser.getByteFrequencyData(this.dataArray);

    let bassSum = 0;
    let midSum = 0;
    let trebleSum = 0;

    const len = this.dataArray.length;
    for (let i = 0; i < len; i++) {
      if (i < len * 0.1) bassSum += this.dataArray[i];
      else if (i < len * 0.5) midSum += this.dataArray[i];
      else trebleSum += this.dataArray[i];
    }

    const bass = (bassSum / (len * 0.1)) / 255;
    const mid = (midSum / (len * 0.4)) / 255;
    const treble = (trebleSum / (len * 0.5)) / 255;

    const threshold = 0.05 * (11 - sensitivity);
    const delta = treble - this.prevTreble;
    const isTransient = delta > threshold && treble > 0.1;
    this.prevTreble = treble;

    return { bass, mid, treble, isTransient };
  }

  public pause() {
    this.audio?.pause();
  }

  public resume() {
    this.audio?.play();
  }

  public seek(time: number) {
    if (this.audio) {
      this.audio.currentTime = time;
    }
  }

  public isPlaying(): boolean {
    return !this.audio?.paused;
  }

  public getCurrentTime(): number {
    return this.audio?.currentTime || 0;
  }

  public getDuration(): number {
    return this.audio?.duration || 0;
  }
}

export const audioService = new AudioService();