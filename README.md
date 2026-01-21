# Nebula Beats - 3D Particle Music Visualizer

A high-performance 3D music particle visualizer using React, Three.js with 100,000 particles, AI shape generation, gesture recognition, and P2P device connectivity.

## 🌟 Features

- **100,000 Real-time Particles**: Optimized WebGL rendering with additive blending
- **26+ Shape Presets**: Galaxy, butterfly, jellyfish, whale, lion, phoenix, and more
- **AI Shape Generation**: Generate custom 3D shapes from natural language using Google Gemini
- **Music-Driven Animation**: FFT-based audio analysis for bass, mid, treble reactions
- **Gesture Recognition**: Hand gesture support with MediaPipe (optional)
- **P2P Device Connection**: WiFi and Bluetooth connectivity for multi-device sync
- **Image-to-Particles**: Convert images into particle formations
- **Interactive Camera**: Mouse drag, touch support, and zoom controls
- **Real-time Parameter Tuning**: dat.GUI panel for live configuration

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Modern browser with WebGL support

### Installation

```bash
npm install
```

### Configuration

1. Create a `.env.local` file:
```env
GEMINI_API_KEY=your_api_key_here
```

2. Get your Gemini API key from [Google AI Studio](https://ai.studio/)

### Development

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### Production Build

```bash
npm run build
npm run preview
```

## 🎮 Controls

- **Mouse**: Drag to rotate, scroll to zoom
- **Touch**: Single finger drag to rotate
- **AI Prompt**: Enter text description to generate shape
- **Device Bridge**: Scan for nearby devices to sync music
- **Playlist**: Import and manage audio files

## 📊 Audio Analysis

The visualizer analyzes:
- **Bass** (low frequencies): Controls particle scale and explosion
- **Treble** (high frequencies): Affects color saturation and transient detection
- **Transients**: Rapid audio spikes trigger visual explosions

## 🎨 Customization

Edit the dat.GUI panel to adjust:
- Particle size and overall scale
- Explosion intensity and collision strength
- Morphing speed and rotation speed
- Diffusion and random scatter effects

## 🏗️ Project Structure

```
├── App.tsx                 # Main application
├── components/
│   └── Visualizer.tsx     # Three.js visualization engine
├── services/
│   ├── audioService.ts    # Audio analysis
│   ├── storageService.ts  # IndexedDB storage
│   └── connectionService.ts # P2P connectivity
├── utils/
│   └── shapes.ts          # 26+ shape generation algorithms
└── types.ts               # TypeScript interfaces
```

## 🛠️ Tech Stack

- **React 19.2**: UI framework
- **Three.js 0.182**: 3D graphics
- **TypeScript 5.8**: Type safety
- **Vite 6.2**: Build tool
- **Tailwind CSS**: UI styling
- **dat.GUI**: Parameter control
- **Web Audio API**: Audio analysis
- **Web RTC/Bluetooth**: Device connectivity

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.
