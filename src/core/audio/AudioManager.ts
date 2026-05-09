/**
 * Centralise l'état audio (volumes, mute) lu par les scènes Phaser. La diffusion réelle
 * (musique, SFX) reste à la charge de l'aventure via Phaser.Sound, qui consulte ce manager.
 */
export interface AudioState {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
}

export class AudioManager {
  private state: AudioState = {
    musicVolume: 0.6,
    sfxVolume: 0.8,
    muted: false,
  };

  setMusicVolume(volume: number): void {
    this.state = { ...this.state, musicVolume: clamp01(volume) };
  }

  setSfxVolume(volume: number): void {
    this.state = { ...this.state, sfxVolume: clamp01(volume) };
  }

  setMuted(muted: boolean): void {
    this.state = { ...this.state, muted };
  }

  snapshot(): AudioState {
    return { ...this.state };
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
