export interface VisualizerConfig {
  overallScale: number;
  particleSize: number;
  trebleSensitivity: number;
  explosionIntensity: number;
  diffusionStrength: number;
  collisionStrength: number;
  randomScatter: number;
  colorFactor: number;
  rotationSpeed: number;
  morphSpeed: number;
  activeShape: string;
  autoRotate: boolean;
  gestureEnabled: boolean;
}

export enum ShapeType {
  GALAXY = '宇宙星系',
  MUSIC_FLOW = '音符飘动',
  SCALE_JUMP = '音阶跳动',
  SPHERE = '基础球体',
  CUBE = '基础立方体',
  BUTTERFLY = '灵动蝴蝶',
  JELLYFISH = '幽灵水母',
  WHALE = '深海巨鲸',
  LION = '雄狮之鬃',
  BIRD = '展翅飞鸟',
  CAT = '猫之剪影',
  FISH = '热带游鱼',
  SPIDER = '暗夜织网',
  DRAGON = '盘旋巨龙',
  PHOENIX = '浴火凤凰',
  TREE_SPIRAL = '生命之树',
  CACTUS = '沙漠仙人掌',
  MUSHROOM = '迷幻蘑菇',
  SUNFLOWER = '向日葵',
  ROSE_3D = '3D玫瑰',
  LOTUS_FLOW = '净世青莲',
  BAMBOO = '节节高升',
  LEAF = '飘零落叶',
  CORAL = '五彩珊瑚',
  GRASS = '随风摇曳',
  CUSTOM_IMAGE = '图像生成模型',
  AI_PROMPT = 'AI 创意形态'
}

export enum PlayMode {
  LIST = '列表循环',
  LOOP = '单曲循环',
  RANDOM = '随机播放'
}

export interface Song {
  id: string;
  name: string;
  data: Blob;
  isPreset: boolean;
}

export interface AudioStats {
  bass: number;
  mid: number;
  treble: number;
  isTransient: boolean;
}

export type GestureType = 'NONE' | 'FIST' | 'PALM' | 'INDEX' | 'SWIPE';

export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';
export type ConnectionType = 'WIFI_P2P' | 'BLUETOOTH';

export interface PeerMessage {
  type: 'FILE_TRANSFER';
  fileType: 'AUDIO' | 'IMAGE';
  fileName: string;
  payload: ArrayBuffer;
}