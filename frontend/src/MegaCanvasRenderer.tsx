import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Stage, Sprite, useApp, useTick } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { PALETTE } from './MegaCanvasApp';

const hexToRGBA = (hexHex: any) => [
  (hexHex >>> 24) & 0xff,
  (hexHex >>> 16) & 0xff,
  (hexHex >>> 8) & 0xff,
  hexHex & 0xff,
];

// Viewport component to wrap the Sprite for Google Maps style Pan/Zoom
const ViewportComponent = ({ children, width, height }) => {
  const app = useApp();
  const viewportRef = useRef(null);

  useEffect(() => {
    const viewport = new Viewport({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      worldWidth: width,
      worldHeight: height,
      events: app.renderer.events,
    });

    viewport
      .drag()
      .pinch()
      .wheel()
      .decelerate()
      .clamp({ direction: 'all' })
      .clampZoom({ minWidth: 100, maxWidth: width * 2 });

    app.stage.addChild(viewport);
    viewportRef.current = viewport;

    return () => {
      app.stage.removeChild(viewport);
      viewport.destroy();
    };
  }, [app, width, height]);

  // Expose viewport instance to children via context or direct assignment
  return viewportRef.current ? <>{children}</> : null; // In real app, mount children onto Viewport instance
};


interface MegaCanvasRendererProps {
  initialPixels: Uint8Array;
  onPixelClick: (x: number, y: number, color: number) => void;
  selectedColor: number;
}

export const MegaCanvasRenderer = React.forwardRef<any, MegaCanvasRendererProps>(({ initialPixels, onPixelClick, selectedColor }, ref) => {
  const canvasSize = 1024;
  const bufferRef = useRef(new Uint8Array(canvasSize * canvasSize * 4));
  const [texture, setTexture] = useState(null);

  // Initialize buffer and texture based on initialPixels
  useEffect(() => {
    const buffer = bufferRef.current;
    for (let i = 0; i < canvasSize * canvasSize; i++) {
      const colorIdx = initialPixels[i] || 0;
      const [r, g, b, a] = hexToRGBA(PALETTE[colorIdx]);
      buffer[i * 4] = r;
      buffer[i * 4 + 1] = g;
      buffer[i * 4 + 2] = b;
      buffer[i * 4 + 3] = a;
    }

    const baseTex = new PIXI.BaseTexture(new PIXI.BufferResource(buffer, {
      width: canvasSize,
      height: canvasSize,
    }));

    baseTex.scaleMode = PIXI.SCALE_MODES.NEAREST;
    setTexture(new PIXI.Texture(baseTex));

    return () => baseTex.destroy();
  }, [initialPixels]);

  const updatePixelLocal = (x, y, colorIdx) => {
    const idx = y * canvasSize + x;
    const [r, g, b, a] = hexToRGBA(PALETTE[colorIdx]);
    const buffer = bufferRef.current;

    buffer[idx * 4] = r;
    buffer[idx * 4 + 1] = g;
    buffer[idx * 4 + 2] = b;
    buffer[idx * 4 + 3] = a;

    if (texture) {
      texture.baseTexture.update();
    }
  };

  // Expose to parent
  React.useImperativeHandle(ref, () => ({
    updatePixel: (x, y, color) => {
      updatePixelLocal(x, y, color);
    },
    clearCanvas: () => {
      const buffer = bufferRef.current;
      for (let i = 0; i < canvasSize * canvasSize; i++) {
        const [r, g, b, a] = hexToRGBA(PALETTE[0]); // Black
        buffer[i * 4] = r;
        buffer[i * 4 + 1] = g;
        buffer[i * 4 + 2] = b;
        buffer[i * 4 + 3] = a;
      }
      if (texture) {
        texture.baseTexture.update();
      }
    }
  }));

  // Handle click on canvas
  const handlePointerDown = (e) => {
    const { x, y } = e.data.getLocalPosition(e.currentTarget);
    const gridX = Math.floor(x);
    const gridY = Math.floor(y);

    if (gridX >= 0 && gridX < canvasSize && gridY >= 0 && gridY < canvasSize) {
      onPixelClick(gridX, gridY, selectedColor);
    }
  };

  if (!texture) return null;

  return (
    <Stage
      width={window.innerWidth}
      height={window.innerHeight}
      options={{ backgroundColor: 0x050505, antialias: false }}
    >
      <ViewportComponent width={canvasSize} height={canvasSize}>
        <Sprite
          texture={texture}
          interactive={true}
          pointerdown={handlePointerDown}
          width={canvasSize}
          height={canvasSize}
          x={0}
          y={0}
        />
      </ViewportComponent>
    </Stage>
  );
});
