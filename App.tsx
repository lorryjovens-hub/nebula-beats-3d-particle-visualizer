import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import Visualizer from './components/Visualizer';
import { VisualizerConfig, ShapeType, PlayMode, Song, GestureType, ConnectionStatus } from './types';
import { audioService } from './services/audioService';
import { storageService } from './services/storageService';
import { connectionService, NearbyDevice } from './services/connectionService';
import { GoogleGenAI } from "@google/genai";
import { PARTICLE_COUNT, generateImagePositionsAndColors } from './utils/shapes';

const App: React.FC = () => {
  const [config, setConfig] = useState<VisualizerConfig>({
    overallScale: 1.0,
    particleSize: 1.4,
    trebleSensitivity: 6,
    explosionIntensity: 2.5,
    diffusionStrength: 1.5,
    collisionStrength: 12.0,
    randomScatter: 20.0,
    colorFactor: 1.3,
    rotationSpeed: 0.005,
    morphSpeed: 0.06,
    activeShape: ShapeType.GALAXY,
    autoRotate: true,
    gestureEnabled: true
  });

  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(-1);
  const [playMode, setPlayMode] = useState<PlayMode>(PlayMode.LIST);
  const [isPaused, setIsPaused] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showConnectivity, setShowConnectivity] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const [nearbyDevices, setNearbyDevices] = useState<NearbyDevice[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [transferring, setTransferring] = useState<string | null>(null);

  const [currentGesture, setCurrentGesture] = useState<{type: GestureType, x: number, y: number}>({type: 'NONE', x: 0, y: 0});
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPositions, setAiPositions] = useState<Float32Array | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const lastX = useRef(0.5);
  const lastY = useRef(0.5);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(audioService.getCurrentTime());
      setDuration(audioService.getDuration());
    }, 100);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const songs = await storageService.getAllSongs();
        setPlaylist(songs);
        const preset = await storageService.getPresetSong();
        if (preset) {
          const idx = songs.findIndex(s => s.id === preset.id);
          setCurrentSongIndex(idx !== -1 ? idx : 0);
          await audioService.setupAudio(preset.data, handleSongEnd);
        }
      } catch (err) {
        console.error("Storage load failed", err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const generateAiShape = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate a list of 1000 3D coordinates (x, y, z) representing the shape of: "${aiPrompt}". Output MUST be ONLY a JSON array of objects like {"x": number, "y": number, "z": number}.`,
        config: { responseMimeType: 'application/json' }
      });
      const points = JSON.parse(response.text.trim());
      const expandedPositions = new Float32Array(PARTICLE_COUNT * 3);
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const point = points[i % points.length];
        const i3 = i * 3;
        expandedPositions[i3] = point.x + (Math.random() - 0.5) * 5;
        expandedPositions[i3+1] = point.y + (Math.random() - 0.5) * 5;
        expandedPositions[i3+2] = point.z + (Math.random() - 0.5) * 5;
      }
      setAiPositions(expandedPositions);
    } catch (err) {
      console.error("AI Generation failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleWiFiConnect = async (devId: string) => {
    await connectionService.startWiFiP2P(
      devId,
      (s) => setConnectionStatus(s),
      async (msg) => {
        setTransferring(`Receiving ${msg.fileType}...`);
        if (msg.type === 'FILE_TRANSFER') {
          const blob = new Blob([msg.payload]);
          if (msg.fileType === 'AUDIO') {
            const file = new File([blob], msg.fileName);
            const song = await storageService.saveSong(file, false);
            setPlaylist(prev => [...prev, song]);
          } else if (msg.fileType === 'IMAGE') {
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
              const { positions } = generateImagePositionsAndColors(img);
              setAiPositions(positions);
              setConfig(prev => ({ ...prev, activeShape: ShapeType.CUSTOM_IMAGE }));
            };
            img.src = url;
          }
        }
        setTimeout(() => setTransferring(null), 1000);
      }
    );
  };

  const startDiscovery = async () => {
    setIsSearching(true);
    const devices = await connectionService.discoverNearbyDevices();
    setNearbyDevices(devices);
    setIsSearching(false);
  };

  const sendToPeer = async (song: Song) => {
    if (connectionStatus !== 'CONNECTED') {
      alert("请先连接到一个设备");
      return;
    }
    setTransferring(`Sending ${song.name}...`);
    try {
      await connectionService.sendFile(song.data, song.name, 'AUDIO');
    } catch (e) {
      alert("发送失败");
    }
    setTimeout(() => setTransferring(null), 1500);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    audioService.seek(time);
    setCurrentTime(time);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playSong = async (index: number) => {
    const song = playlist[index];
    if (song) {
      setCurrentSongIndex(index);
      await audioService.setupAudio(song.data, handleSongEnd);
      setIsPaused(false);
    }
  };

  const playNext = useCallback(() => {
    if (playlist.length === 0) return;
    let nextIndex = currentSongIndex;
    if (playMode === PlayMode.RANDOM) nextIndex = Math.floor(Math.random() * playlist.length);
    else if (playMode === PlayMode.LOOP) nextIndex = currentSongIndex;
    else nextIndex = (currentSongIndex + 1) % playlist.length;
    playSong(nextIndex);
  }, [playlist, currentSongIndex, playMode]);

  const handleSongEnd = useCallback(() => playNext(), [playNext]);

  const togglePlay = () => {
    if (audioService.isPlaying()) {
      audioService.pause();
      setIsPaused(true);
    } else {
      audioService.resume();
      setIsPaused(false);
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none text-white">
      <Visualizer config={config} setConfig={setConfig} gestureState={currentGesture} aiPositions={aiPositions} />

      {transferring && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[100] bg-blue-600 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-bounce">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-black uppercase tracking-widest">{transferring}</span>
        </div>
      )}

      <div className="absolute top-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4 pointer-events-none">
        {connectionStatus !== 'DISCONNECTED' && (
          <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-2 pointer-events-auto bg-black/40 border transition-all ${connectionStatus === 'CONNECTED' ? 'text-green-400 border-green-500/30' : 'text-yellow-400 border-yellow-500/30 animate-pulse'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'CONNECTED' ? 'bg-green-400' : 'bg-yellow-400'}`} />
            {connectionStatus === 'CONNECTED' ? 'Direct Link Established' : 'Syncing Devices...'}
            {connectionStatus === 'CONNECTED' && (
              <button onClick={() => { connectionService.disconnect(); setConnectionStatus('DISCONNECTED'); }} className="ml-2 text-white/40 hover:text-white">Disconnect</button>
            )}
          </div>
        )}
      </div>

      <div className="absolute top-10 left-10 z-20 pointer-events-none">
        <h1 className="text-5xl font-black tracking-tighter italic drop-shadow-2xl">
          NEBULA<span className="text-blue-500">BEATS</span>
        </h1>
        <div className="mt-4 flex flex-col gap-4 pointer-events-auto">
          <button onClick={() => setShowConnectivity(!showConnectivity)} className={`px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border shadow-xl ${showConnectivity ? 'bg-blue-600 border-blue-400' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
            Device Bridge
          </button>
          
          <div className="flex flex-col gap-2 bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-2xl w-64 shadow-2xl">
            <span className="text-[9px] text-blue-400 font-black uppercase tracking-widest">AI Sculpture Prompt</span>
            <div className="flex gap-2">
              <input type="text" placeholder="Dream a shape..." value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && generateAiShape()} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs flex-1 focus:outline-none focus:border-blue-500/50" />
              <button onClick={generateAiShape} disabled={isGenerating} className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95">{isGenerating ? '...' : 'Go'}</button>
            </div>
          </div>
        </div>
      </div>

      <div className={`absolute top-44 left-10 z-30 w-80 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-8 transition-all duration-500 shadow-2xl ${showConnectivity ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'}`}>
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xs font-black uppercase tracking-widest text-blue-400">Connectivity Hub</h3>
          <button onClick={startDiscovery} className={`p-2 rounded-full hover:bg-white/10 ${isSearching ? 'animate-spin' : ''}` }>
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>

        <div className="space-y-4 max-h-64 overflow-y-auto custom-scrollbar pr-2">
          {isSearching && nearbyDevices.length === 0 && (
            <div className="text-center py-10 opacity-50 text-[10px] font-bold uppercase animate-pulse">Scanning frequencies...</div>
          )}
          {nearbyDevices.length > 0 ? (
            nearbyDevices.map(dev => (
              <button key={dev.id} onClick={() => handleWiFiConnect(dev.id)} className="w-full group flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-blue-600/20 hover:border-blue-500/30 transition-all text-left">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${dev.type === 'WIFI' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                    {dev.type === 'WIFI' ? 'W' : 'B'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold">{dev.name}</span>
                    <span className="text-[8px] opacity-40 uppercase tracking-widest">{dev.type} P2P</span>
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </div>
              </button>
            ))
          ) : !isSearching && (
            <div className="text-center py-10 opacity-50 text-[10px] font-bold uppercase">No devices found nearby.</div>
          )}
        </div>
        
        <button onClick={() => connectionService.startBluetooth((s) => setConnectionStatus(s))} className="mt-6 w-full py-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-[0.2em] transition-all">Direct Bluetooth Pair</button>
      </div>

      <div className={`absolute top-0 right-0 h-full w-80 bg-black/40 backdrop-blur-3xl border-l border-white/10 z-30 transition-transform duration-700 ease-in-out ${showPlaylist ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-10 flex flex-col h-full">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-xl font-black tracking-tighter uppercase italic">Library</h2>
            <button onClick={() => setShowPlaylist(false)} className="text-gray-500 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {playlist.length === 0 ? (
              <div className="text-gray-600 text-xs italic py-20 text-center">Empty Vault</div>
            ) : (
              playlist.map((s, idx) => (
                <div key={s.id} className={`group relative w-full p-4 rounded-2xl transition-all flex items-center gap-4 ${currentSongIndex === idx ? 'bg-blue-600/20 border border-blue-500/40' : 'hover:bg-white/5 border border-transparent'}`}>
                  <button onClick={() => playSong(idx)} className="flex-1 flex items-center gap-4 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${currentSongIndex === idx ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-500'}`}>{idx+1}</div>
                    <p className={`text-xs font-bold truncate ${currentSongIndex === idx ? 'text-blue-400' : 'text-gray-400'}`}>{s.name}</p>
                  </button>
                  {connectionStatus === 'CONNECTED' && (
                    <button onClick={() => sendToPeer(s)} className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-all">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
          <label className="mt-8 flex items-center justify-center gap-3 py-5 bg-blue-600 hover:bg-blue-500 border border-blue-400/30 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all active:scale-95 shadow-2xl">
            Import Sonic File
            <input type="file" multiple accept="audio/*" className="hidden" onChange={async e => {
              if (e.target.files) {
                for (let f of Array.from(e.target.files)) {
                  await storageService.saveSong(f as File, playlist.length === 0);
                }
                const songs = await storageService.getAllSongs();
                setPlaylist(songs);
              }
            }} />
          </label>
        </div>
      </div>

      {!showPlaylist && (
        <button onClick={() => setShowPlaylist(true)} className="absolute top-1/2 -translate-y-1/2 right-0 z-20 p-5 bg-white/5 backdrop-blur-xl rounded-l-3xl border border-white/10 text-gray-400 hover:text-white transition-all shadow-2xl">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
      )}

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center w-full max-w-4xl px-6 pointer-events-none">
        <div className="w-full mb-6 px-10 pointer-events-auto flex items-center gap-6">
          <span className="text-[10px] font-black text-blue-400 w-12 text-right tabular-nums">{formatTime(currentTime)}</span>
          <div className="flex-1 relative h-6 flex items-center">
             <input type="range" min="0" max={duration || 0} step="0.1" value={currentTime} onChange={handleSeek} className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer overflow-hidden accent-blue-500 hover:h-2 transition-all" />
          </div>
          <span className="text-[10px] font-black text-gray-500 w-12 tabular-nums">{formatTime(duration)}</span>
        </div>

        <div className="w-full bg-white/5 backdrop-blur-3xl border border-white/10 px-10 py-8 rounded-[3rem] flex items-center gap-10 shadow-2xl pointer-events-auto">
          <div className="flex flex-col flex-1 min-w-0">
             <span className="text-[9px] text-blue-500 font-black uppercase tracking-[0.2em] mb-2">Acoustic Visualization</span>
             <h3 className="text-xl font-bold truncate text-gray-100 tracking-tight italic">{playlist[currentSongIndex]?.name || 'Nebula Beats System Idle...'}</h3>
          </div>
          <div className="flex items-center gap-8">
            <button onClick={togglePlay} className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-blue-500/20">
              {isPaused ? <svg className="w-10 h-10 translate-x-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> : <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>}
            </button>
            <button onClick={playNext} className="p-5 bg-white/5 rounded-full text-white hover:bg-white/10 transition-all border border-white/5">
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center gap-6">
          <div className="w-20 h-20 border-t-4 border-blue-500 rounded-full animate-spin shadow-[0_0_40px_rgba(59,130,246,0.3)]" />
          <p className="text-[10px] font-black uppercase tracking-[0.6em] animate-pulse">Initializing Neural Core...</p>
        </div>
      )}

      <style>{`
        @keyframes progress-line { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-progress-line { animation: progress-line 1.5s infinite linear; width: 50%; }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none; width: 12px; height: 12px; background: #fff; border-radius: 50%; cursor: pointer; border: 2px solid #3b82f6; box-shadow: -100vw 0 0 100vw #3b82f6;
        }
      `}</style>
      
      <SpeedInsights />
    </div>
  );
};

export default App;