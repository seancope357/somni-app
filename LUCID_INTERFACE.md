# Lucid Interface - Futuristic Landing Page

A cutting-edge, WebGL-powered landing page for **DREAMONEIR** that redefines web navigation by replacing vertical scrolling with depth-based Z-axis movement. Users feel like they're flying through a digital consciousness rather than scrolling down a page.

## 🎨 Design Philosophy

### The Lucid Interface Concept
- **Z-Axis Navigation**: Scroll to move *forward* through 3D space, not down a page
- **Cyberpunk Luxury**: Ethereal, high-tech aesthetic with glassmorphism
- **Sentient Interaction**: Custom cursor that feels alive and responsive
- **Decoding Reality**: Typography that "decodes" itself with matrix-style effects

### Color Palette
- **Void Black**: `#050505` - Deep background
- **Neon Cyan**: `#00F0FF` - Primary accent
- **Electric Indigo**: `#7000FF` - Secondary accent
- **Off-White**: `#E0E0E0` - Text with variable opacity

## 🏗️ Architecture

### Component Structure

```
src/
├── components/lucid-interface/
│   ├── StarfieldScene.tsx       # WebGL 3D background
│   ├── DecodingText.tsx         # Matrix-style text animation
│   ├── SentientCursor.tsx       # Custom cursor with trail
│   ├── HUDOverlay.tsx           # Glassmorphic UI layer
│   └── index.ts                 # Barrel exports
├── hooks/
│   └── use-smooth-scroll.ts     # Smooth scroll-to-Z mapping
└── app/
    └── lucid/
        └── page.tsx             # Main landing page
```

### Core Technologies
- **React Three Fiber** (@react-three/fiber) - React renderer for Three.js
- **Drei** (@react-three/drei) - Useful helpers for R3F
- **Framer Motion** - DOM animation library
- **Three.js** - WebGL 3D graphics library
- **Next.js 14+** - React framework with App Router
- **Tailwind CSS** - Utility-first styling

## 🚀 Key Features

### 1. **StarfieldScene Component**
3D WebGL scene with multiple layers:

- **Particle Field** (5,000 particles)
  - Instanced rendering for performance
  - Dynamic color based on distance
  - Smooth Z-axis animation tied to scroll

- **Geometric Shards** (50 instances)
  - Wireframe boxes rotating in 3D space
  - Adds visual complexity and depth

- **Grid Lines**
  - Cyberpunk-style grid for spatial reference
  - Moves with scroll to enhance depth perception

```tsx
<StarfieldScene scrollProgress={scrollProgress} />
```

**Performance**: Uses `InstancedMesh` to render thousands of objects in a single draw call.

### 2. **DecodingText Component**
Matrix-style character cycling effect:

```tsx
<DecodingText
  text="DREAMONEIR"
  delay={1500}
  speed={60}
/>
```

**Features**:
- Each character cycles through random glyphs before settling
- Configurable delay and speed
- Preserves spaces for readability
- Optional continuous glitch variant (`GlitchText`)

### 3. **SentientCursor Component**
Custom cursor that replaces default:

- **Smooth trailing**: Uses Framer Motion springs for organic movement
- **Interactive states**: Expands with crosshair on hover over buttons/links
- **Blend modes**: Uses `mix-blend-difference` for contrast
- **Glow effects**: Pulsing aura with box-shadow

```tsx
<SentientCursor />
```

**Note**: Automatically hides default cursor and restores it on unmount.

### 4. **HUDOverlay Component**
Heads-Up Display style UI:

- **Corner Readouts**: System status indicators in all four corners
- **Hero Content**: Centered main message with decoding animations
- **Glassmorphism Button**: Frosted glass effect with chromatic aberration on hover
- **Scanline Effect**: Subtle animated overlay for CRT monitor aesthetic
- **Vignette**: Radial gradient for depth

### 5. **Scroll-to-Z Mapping Hook**
Custom hook that maps scroll position to 3D camera movement:

```tsx
const scrollProgress = useSmoothScroll();
```

**Implementation**:
- Calculates scroll percentage (0-1)
- Smoothly interpolates (lerp) for fluid motion
- Updates at 60fps via `requestAnimationFrame`

## 📦 Installation

The dependencies are already installed. If starting fresh:

```bash
npm install three @react-three/fiber @react-three/drei framer-motion
```

## 🎮 Usage

### Accessing the Landing Page

Navigate to `/lucid` in your browser:

```
http://localhost:3000/lucid
```

### Integrating into Existing App

To use as the main landing page, update `src/app/page.tsx`:

```tsx
import LucidLandingPage from './lucid/page';

export default function Home() {
  return <LucidLandingPage />;
}
```

Or create a redirect:

```tsx
// src/app/page.tsx
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/lucid');
}
```

## 🎨 Customization

### Adjusting Particle Count

In `StarfieldScene.tsx`:

```tsx
<ParticleField count={5000} scrollProgress={scrollProgress} />
```

Change `count` for more/fewer particles. **Note**: Higher counts may impact performance on low-end devices.

### Changing Colors

Update hex values in components:

```tsx
// Cyan accent
color="#00F0FF"

// Indigo accent
color="#7000FF"
```

Or use Tailwind classes:
```tsx
className="text-cyan-400"
```

### Modifying Scroll Depth

In `src/app/lucid/page.tsx`, adjust section heights:

```tsx
<div className="h-screen" /> // Change height for more/less scroll distance
```

### Decoding Speed

```tsx
<DecodingText
  text="YOUR TEXT"
  speed={40}  // Lower = faster cycling
  delay={100} // Delay before starting (ms)
/>
```

## 🔧 Performance Optimization

### 1. **Instanced Rendering**
All particles and shards use `InstancedMesh` for GPU-efficient rendering.

### 2. **Conditional Rendering**
Components only render when mounted (client-side):

```tsx
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

if (!mounted) return <LoadingState />;
```

### 3. **Canvas Settings**
Optimized WebGL context:

```tsx
<Canvas
  gl={{
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  }}
/>
```

### 4. **Smooth Scroll Throttling**
Uses `requestAnimationFrame` for 60fps updates without overwhelming the browser.

## 📱 Responsive Design

All components are responsive:

- **Typography**: Uses `text-6xl md:text-8xl lg:text-9xl` for scaling
- **Spacing**: Adjusts padding/margin with `px-6 md:px-12`
- **Cursor**: Automatically disabled on touch devices
- **HUD Elements**: Font sizes scale down on mobile

### Mobile Considerations

The custom cursor is hidden on touch devices (default cursor shown). Consider adding:

```tsx
const isTouchDevice = 'ontouchstart' in window;
{!isTouchDevice && <SentientCursor />}
```

## 🎭 Animation Timeline

1. **0ms**: Page loads
2. **100ms**: "INITIALIZING..." text starts decoding
3. **500ms**: Top-left system status fades in
4. **600ms**: Top-right neural link info appears
5. **700ms**: Bottom corners fade in
6. **1500ms**: Main "DREAMONEIR" logo starts decoding
7. **2500ms**: Tagline fades in
8. **3000ms**: CTA button appears
9. **4000ms**: Scroll indicator pulses

## 🐛 Troubleshooting

### "Canvas is not defined" Error
Ensure components are client-side only:

```tsx
'use client';
```

### Performance Issues
1. Reduce particle count
2. Lower canvas resolution: `dpr={[1, 1.5]}` instead of `[1, 2]`
3. Disable antialiasing: `antialias: false`

### Cursor Not Appearing
Check z-index hierarchy. Cursor should be `z-[9999]`.

### Scroll Not Smooth
Ensure `useSmoothScroll` hook is properly implemented and returning values.

## 🎯 Future Enhancements

Potential additions:

1. **Audio Reactivity**: Particles respond to music
2. **Mouse Parallax**: 3D scene tilts based on cursor position
3. **Shader Effects**: Custom GLSL shaders for advanced visuals
4. **Loading Progress**: Show asset loading percentage
5. **WebXR Support**: VR/AR mode for immersive experience
6. **Dynamic Theming**: User-selectable color schemes

## 📄 File Reference

### Component Props

```typescript
// StarfieldScene
interface StarfieldSceneProps {
  scrollProgress: number; // 0-1
}

// DecodingText
interface DecodingTextProps {
  text: string;
  className?: string;
  delay?: number;  // ms
  speed?: number;  // ms per cycle
}

// HUDOverlay
interface HUDOverlayProps {
  onEnter?: () => void; // CTA button callback
}

// SentientCursor (no props)
```

## 🌟 Credits

**Design Concept**: "The Lucid Interface" - Cyberpunk-Luxury aesthetic
**Inspired by**: Blade Runner 2049, Ghost in the Shell, Apple Vision Pro UI
**Built for**: DREAMONEIR - AI-Powered Dream Interpretation

---

## 🚀 Quick Start

```bash
# Start development server
npm run dev

# Visit the lucid interface
open http://localhost:3000/lucid

# Build for production
npm run build
```

**Enjoy navigating through the depths of digital consciousness!** 🌌
