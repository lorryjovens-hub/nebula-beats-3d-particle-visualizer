import * as THREE from 'three';
import { ShapeType } from '../types';

export const PARTICLE_COUNT = 100000;

/**
 * 将图像解析为粒子位置和颜色
 */
export const generateImagePositionsAndColors = (image: HTMLImageElement): { positions: Float32Array, colors: Float32Array } => {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { positions, colors };

  const size = 320;
  canvas.width = size;
  canvas.height = size;
  
  const scale = Math.min(size / image.width, size / image.height);
  const x = (size - image.width * scale) / 2;
  const y = (size - image.height * scale) / 2;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(image, x, y, image.width * scale, image.height * scale);
  
  const imageData = ctx.getImageData(0, 0, size, size).data;
  const validPoints: {x: number, y: number, r: number, g: number, b: number}[] = [];

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const idx = (py * size + px) * 4;
      const r = imageData[idx];
      const g = imageData[idx + 1];
      const b = imageData[idx + 2];
      const brightness = (r + g + b) / 3;

      if (brightness > 5) {
        validPoints.push({
          x: (px - size / 2) * 2.5,
          y: (size / 2 - py) * 2.5,
          r: r / 255,
          g: g / 255,
          b: b / 255
        });
      }
    }
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = validPoints[i % validPoints.length] || { x: 0, y: 0, r: 0, g: 0, b: 0 };
    const i3 = i * 3;
    
    positions[i3] = p.x;
    positions[i3 + 1] = p.y;
    positions[i3 + 2] = (Math.random() - 0.5) * 5;
    
    colors[i3] = p.r;
    colors[i3 + 1] = p.g;
    colors[i3 + 2] = p.b;
  }

  return { positions, colors };
};

export const generateShapePositions = (type: ShapeType): Float32Array => {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const temp = new THREE.Vector3();

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    const t = i / PARTICLE_COUNT;

    switch (type) {
      case ShapeType.BUTTERFLY: {
        const angle = t * Math.PI * 40;
        const r = (Math.exp(Math.cos(angle)) - 2 * Math.cos(4 * angle) - Math.pow(Math.sin(angle / 12), 5)) * 80;
        temp.set(
          r * Math.sin(angle),
          r * Math.cos(angle),
          (Math.random() - 0.5) * 50
        );
        break;
      }
      case ShapeType.JELLYFISH: {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.pow(Math.random(), 0.5) * 150;
        if (i < PARTICLE_COUNT * 0.4) {
          const h = Math.sqrt(Math.max(0, 150*150 - r*r)) * 0.5;
          temp.set(r * Math.cos(angle), h, r * Math.sin(angle));
        } else {
          const tx = (Math.random() - 0.5) * 200;
          const ty = -Math.random() * 400;
          const tz = (Math.random() - 0.5) * 200;
          temp.set(tx, ty, tz);
        }
        break;
      }
      case ShapeType.WHALE: {
        const u = t * Math.PI * 2;
        const v = Math.random() * Math.PI;
        temp.set(
          300 * Math.cos(u) * Math.sin(v),
          100 * Math.sin(u) * Math.sin(v),
          150 * Math.cos(v)
        );
        if (temp.x > 100) temp.y *= 0.2;
        break;
      }
      case ShapeType.LION: {
        const phi = Math.acos(-1 + (2 * i) / PARTICLE_COUNT);
        const theta = Math.sqrt(PARTICLE_COUNT * Math.PI) * phi;
        const radius = 180 + (Math.random() > 0.7 ? Math.random() * 150 : 0);
        temp.setFromSphericalCoords(radius, phi, theta);
        break;
      }
      case ShapeType.TREE_SPIRAL: {
        const h = Math.random() * 500 - 250;
        const r = (250 - Math.abs(h)) * 0.6;
        const a = h * 0.1;
        temp.set(r * Math.cos(a) + (Math.random()-0.5)*50, h, r * Math.sin(a) + (Math.random()-0.5)*50);
        break;
      }
      case ShapeType.CACTUS: {
        const h = Math.random() * 400 - 200;
        const r = 40 + Math.sin(h * 0.05) * 10;
        const a = Math.random() * Math.PI * 2;
        if (Math.random() > 0.9) {
          temp.set(r * Math.cos(a) + 80, h + 50, r * Math.sin(a));
        } else {
          temp.set(r * Math.cos(a), h, r * Math.sin(a));
        }
        break;
      }
      case ShapeType.SUNFLOWER: {
        const r = 250 * Math.sqrt(t);
        const a = t * Math.PI * 2 * 137.5 / 360 * PARTICLE_COUNT * 0.001;
        temp.set(r * Math.cos(a), (Math.random()-0.5)*10, r * Math.sin(a));
        break;
      }
      case ShapeType.BAMBOO: {
        const section = Math.floor(i / (PARTICLE_COUNT / 5));
        const h = (i % (PARTICLE_COUNT / 5)) / (PARTICLE_COUNT / 5) * 100 + section * 110 - 250;
        const r = 30 + (h % 110 > 100 ? 5 : 0);
        const a = Math.random() * Math.PI * 2;
        temp.set(r * Math.cos(a), h, r * Math.sin(a));
        break;
      }
      case ShapeType.DRAGON: {
        const a = t * Math.PI * 20;
        const r = 150 + Math.sin(a * 0.2) * 50;
        temp.set(r * Math.cos(a), a * 10 - 300, r * Math.sin(a));
        break;
      }
      case ShapeType.PHOENIX: {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 300;
        temp.set(r * Math.cos(a), Math.pow(r/300, 2) * 200 - 100, Math.sin(a) * r * 0.5);
        break;
      }
      case ShapeType.CAT: {
        const x = (Math.random() - 0.5) * 400;
        const y = (Math.random() - 0.5) * 400;
        const angle = Math.random() * Math.PI * 2;
        const xh = 16 * Math.pow(Math.sin(angle), 3);
        const yh = 13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle);
        temp.set(xh * 15, yh * 15, (Math.random()-0.5)*40);
        break;
      }
      case ShapeType.FISH: {
        const u = Math.random() * Math.PI * 2;
        const v = Math.random() * Math.PI;
        temp.set(200 * Math.cos(u) * Math.sin(v), 80 * Math.sin(u) * Math.sin(v), 40 * Math.cos(v));
        if (temp.x < -100) temp.y *= 2;
        break;
      }
      case ShapeType.LEAF: {
        const x = (Math.random() - 0.5) * 300;
        const y = Math.sin(x * 0.02) * 100;
        temp.set(x, y, (Math.random() - 0.5) * (150 - Math.abs(x*0.5)));
        break;
      }
      case ShapeType.LOTUS_FLOW: {
        const r = 200 * (1 + 0.3 * Math.sin(8 * t * Math.PI));
        const a = t * Math.PI * 2;
        temp.set(r * Math.cos(a), Math.pow(r / 200, 2) * 80, r * Math.sin(a));
        break;
      }
      case ShapeType.MUSHROOM: {
        if (i < PARTICLE_COUNT * 0.7) {
          const r = Math.random() * 200;
          const a = Math.random() * Math.PI * 2;
          const h = Math.sqrt(Math.max(0, 200*200 - r*r)) * 0.3 + 50;
          temp.set(r * Math.cos(a), h, r * Math.sin(a));
        } else {
          const r = 40;
          const a = Math.random() * Math.PI * 2;
          const h = Math.random() * 150 - 100;
          temp.set(r * Math.cos(a), h, r * Math.sin(a));
        }
        break;
      }
      case ShapeType.SPIDER: {
        const arm = i % 8;
        const r = Math.random() * 300;
        const a = (arm * Math.PI * 2) / 8;
        temp.set(r * Math.cos(a), (Math.random()-0.5)*20, r * Math.sin(a));
        break;
      }
      case ShapeType.BIRD: {
        const x = (Math.random() - 0.5) * 600;
        const y = Math.abs(x) * 0.3 + Math.sin(x * 0.01) * 50;
        temp.set(x, y, (Math.random()-0.5)*100);
        break;
      }
      case ShapeType.GRASS: {
        const x = (Math.random() - 0.5) * 800;
        const z = (Math.random() - 0.5) * 800;
        const h = Math.random() * 150;
        const offset = Math.sin(x * 0.01 + z * 0.01) * h * 0.5;
        temp.set(x + offset, h - 200, z);
        break;
      }
      case ShapeType.CORAL: {
        const a = Math.random() * Math.PI * 2;
        const h = Math.random() * 300;
        const r = Math.sin(h * 0.05) * 50 + 20;
        temp.set(r * Math.cos(a) + Math.sin(h*0.1)*30, h - 150, r * Math.sin(a));
        break;
      }
      case ShapeType.ROSE_3D: {
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.random() * Math.PI;
        const r = 200 * Math.sin(4 * theta);
        temp.set(r * Math.sin(theta) * Math.cos(phi), r * Math.cos(theta), r * Math.sin(theta) * Math.sin(phi));
        break;
      }
      case ShapeType.GALAXY: {
        const arm = i % 3;
        const angle = (i / PARTICLE_COUNT) * Math.PI * 20 + (arm * Math.PI * 2 / 3);
        const radius = Math.pow(Math.random(), 0.5) * 350;
        const spiral = angle + radius * 0.01;
        temp.set(Math.cos(spiral) * radius, (Math.random() - 0.5) * (400 - radius) * 0.2, Math.sin(spiral) * radius);
        break;
      }
      case ShapeType.MUSIC_FLOW: {
        const x = (t - 0.5) * 1000;
        const y = Math.sin(t * Math.PI * 6) * 100 + (Math.random() - 0.5) * 50;
        const z = Math.cos(t * Math.PI * 4) * 80 + (Math.random() - 0.5) * 50;
        temp.set(x, y, z);
        break;
      }
      case ShapeType.SCALE_JUMP: {
        const barCount = 64;
        const barIndex = i % barCount;
        const particlesPerBar = Math.floor(PARTICLE_COUNT / barCount);
        const inBarIndex = Math.floor(i / barCount);
        const x = (barIndex - barCount / 2) * 15;
        const y = (inBarIndex / particlesPerBar) * 400 - 200;
        const z = (Math.random() - 0.5) * 10;
        temp.set(x, y, z);
        break;
      }
      case ShapeType.SPHERE: {
        const phi = Math.acos(-1 + (2 * i) / PARTICLE_COUNT);
        const theta = Math.sqrt(PARTICLE_COUNT * Math.PI) * phi;
        temp.setFromSphericalCoords(200, phi, theta);
        break;
      }
      case ShapeType.CUBE: {
        const s = 300;
        temp.set((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
        break;
      }
      default:
        temp.set(0, 0, 0);
    }

    positions[i3] = temp.x;
    positions[i3 + 1] = temp.y;
    positions[i3 + 2] = temp.z;
  }

  return positions;
};