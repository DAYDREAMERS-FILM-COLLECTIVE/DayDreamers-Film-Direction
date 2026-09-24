/**
 * js/modules/three/inversion-lens.js
 * High-performance WebGL Fluid Ink-Marbling Inversion Lens for Daydreamers Cinema.
 * Simplex + 3-layer Curl Noise GLSL Shader with interactive cursor tracking,
 * smooth GSAP expansion/contraction, and on-demand GPU rendering.
 */

import * as THREE from 'three';

// Vertex Shader: standard quad transform with interpolated UVs
const vertexShader = `
  varying vec2 v_uv;
  void main() {
    v_uv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment Shader: Fluid ink-marbling curl noise lens with negative inversion
const fragmentShader = `
  precision highp float;

  uniform sampler2D u_texture;
  uniform vec2 u_mouse;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform float u_radius;
  uniform float u_speed;
  uniform float u_imageAspect;
  uniform float u_turbulenceIntensity;
  uniform vec3 u_effectColor1;
  uniform vec3 u_effectColor2;
  uniform float u_isViewport;

  varying vec2 v_uv;

  // 3D hash for spatial randomness
  vec3 hash33(vec3 p) {
    p = fract(p * vec3(443.8975, 397.2973, 491.1871));
    p += vec3(dot(p.zxy, p.yxz + vec3(19.27)));
    return fract(vec3(p.x * p.y, p.z * p.x, p.y * p.z));
  }

  // Simplex noise for organic fluid patterns
  float simplex_noise(vec3 p) {
    const float K1 = 0.333333333;
    const float K2 = 0.166666667;
    
    vec3 i = floor(p + (p.x + p.y + p.z) * K1);
    vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
    
    vec3 e = step(vec3(0.0), d0 - d0.yzx);
    vec3 i1 = e * (1.0 - e.zxy);
    vec3 i2 = 1.0 - e.zxy * (1.0 - e);
    
    vec3 d1 = d0 - (i1 - vec3(K2));
    vec3 d2 = d0 - (i2 - vec3(K2 * 2.0));
    vec3 d3 = d0 - vec3(1.0 - 3.0 * K2);
    
    vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
    vec4 n = h * h * h * h * vec4(
      dot(d0, hash33(i) * 2.0 - 1.0),
      dot(d1, hash33(i + i1) * 2.0 - 1.0),
      dot(d2, hash33(i + i2) * 2.0 - 1.0),
      dot(d3, hash33(i + vec3(1.0)) * 2.0 - 1.0)
    );
    
    return 0.5 + 0.5 * 31.0 * dot(n, vec4(1.0));
  }

  // Multi-octave curl noise vector field for fluid eddies
  vec2 curl(vec2 p, float time) {
    const float eps = 0.002;
    float n1 = simplex_noise(vec3(p.x, p.y + eps, time));
    float n2 = simplex_noise(vec3(p.x, p.y - eps, time));
    float n3 = simplex_noise(vec3(p.x + eps, p.y, time));
    float n4 = simplex_noise(vec3(p.x - eps, p.y, time));
    return vec2((n2 - n1) / (2.0 * eps), (n4 - n3) / (2.0 * eps));
  }

  // Organic ink-marbling displacement function
  float inkMarbling(vec2 p, float time, float intensity) {
    float result = 0.0;
    
    // Large fluid eddies
    vec2 flow = curl(p * 1.4, time * 0.1) * intensity * 2.0;
    vec2 p1 = p + flow * 0.3;
    result += simplex_noise(vec3(p1 * 2.0, time * 0.15)) * 0.5;
    
    // Swirls and medium texture
    vec2 flow2 = curl(p * 2.8 + vec2(sin(time * 0.2), cos(time * 0.15)), time * 0.2) * intensity;
    vec2 p2 = p + flow2 * 0.2;
    result += simplex_noise(vec3(p2 * 4.0, time * 0.25)) * 0.3;
    
    // Fine ripples
    vec2 flow3 = curl(p * 5.6 + vec2(cos(time * 0.3), sin(time * 0.25)), time * 0.3) * intensity * 0.5;
    vec2 p3 = p + flow3 * 0.1;
    result += simplex_noise(vec3(p3 * 8.0, time * 0.4)) * 0.2;
    
    // Organic swirl around center
    float dist = length(p - vec2(0.5));
    float angle = atan(p.y - 0.5, p.x - 0.5);
    float spiral = sin(dist * 12.0 - angle * 2.0 + time * 0.3) * 0.5 + 0.5;
    
    result = mix(result, spiral, 0.25);
    return result * 0.5 + 0.5;
  }

  void main() {
    vec2 uv = v_uv;
    float screenAspect = u_resolution.x / max(u_resolution.y, 1.0);

    // Standard object-fit cover UV mapping
    vec2 st = uv - 0.5;
    if (screenAspect > u_imageAspect) {
      st.y *= u_imageAspect / screenAspect;
    } else {
      st.x *= screenAspect / u_imageAspect;
    }
    vec2 texCoord = clamp(st + 0.5, 0.0, 1.0);
    vec4 tex = texture2D(u_texture, texCoord);
    vec3 originalColor = tex.rgb;

    // Aspect-ratio-corrected coordinate space for circular lens
    vec2 correctedUV = uv;
    correctedUV.x *= screenAspect;
    vec2 correctedMouse = u_mouse;
    correctedMouse.x *= screenAspect;

    float dist = distance(correctedUV, correctedMouse);
    
    // Calculate ink marbling edge boundary
    float marble = inkMarbling(uv * 2.0 + u_time * u_speed * 0.1, u_time, u_turbulenceIntensity * 2.0);
    float jaggedDist = dist + (marble - 0.5) * u_turbulenceIntensity * 1.8;
    
    // Anti-aliased organic mask boundary
    float edgeWidth = 0.02;
    float mask = 0.0;
    if (u_radius > 0.001) {
      mask = 1.0 - smoothstep(u_radius - edgeWidth, u_radius + edgeWidth, jaggedDist);
    }

    // High-contrast film negative inversion
    float gray = dot(originalColor, vec3(0.299, 0.587, 0.114));
    vec3 invertedBase = vec3(1.0 - gray);

    // Cinema Duotone Infusion: Rosé Gold (#C89BB2) highlights & Midnight Plum (#1A0B17) shadows
    vec3 duotone = mix(u_effectColor2, u_effectColor1, 1.0 - gray);
    
    // Blend inverted monochrome with warm rosé tint
    vec3 effectColor = mix(invertedBase, duotone, 0.5);

    // Luminous hairline perimeter contour along the marbling edge
    float perimeter = smoothstep(0.0, 0.25, mask) * (1.0 - smoothstep(0.0, 0.55, mask));
    effectColor += u_effectColor1 * perimeter * 0.6;

    // Output color based on viewport vs container mode
    if (u_isViewport > 0.5) {
      float alpha = clamp(mask * 0.76 + perimeter * 0.88, 0.0, 0.96);
      gl_FragColor = vec4(effectColor, alpha);
    } else {
      vec3 finalColor = mix(originalColor, effectColor, mask);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  }
`;

/**
 * Generate a high-resolution cinematic fallback gradient texture
 */
function createFallbackTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 880;
  const ctx = canvas.getContext('2d');

  // Vibrant cinematic gradient (deep plum to fiery terracotta/amber to gold)
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, '#1A0B17');
  grad.addColorStop(0.35, '#5A1F3E');
  grad.addColorStop(0.7, '#A83A4A');
  grad.addColorStop(1, '#E28C54');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Light beam cone
  ctx.save();
  const beam = ctx.createRadialGradient(canvas.width * 0.5, canvas.height * 0.35, 10, canvas.width * 0.5, canvas.height * 0.45, 240);
  beam.addColorStop(0, 'rgba(255, 245, 220, 0.45)');
  beam.addColorStop(0.5, 'rgba(200, 155, 178, 0.2)');
  beam.addColorStop(1, 'rgba(26, 11, 23, 0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.arc(canvas.width * 0.5, canvas.height * 0.4, 220, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Archival monogram
  ctx.fillStyle = '#F2E9ED';
  ctx.font = 'italic 900 180px "Playfair Display", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('D', canvas.width * 0.5, canvas.height * 0.4);

  // Typography header & footer
  ctx.fillStyle = '#F2E9ED';
  ctx.font = 'bold 24px "Inter", sans-serif';
  ctx.letterSpacing = '6px';
  ctx.fillText('DAYDREAMERS', canvas.width * 0.5, 90);

  ctx.fillStyle = 'rgba(242, 233, 237, 0.85)';
  ctx.font = '16px monospace';
  ctx.fillText('NITRATE 35MM ARCHIVE', canvas.width * 0.5, canvas.height - 80);

  // Sprocket holes along left and right borders
  ctx.fillStyle = 'rgba(26, 11, 23, 0.6)';
  for (let y = 40; y < canvas.height - 40; y += 42) {
    ctx.fillRect(14, y, 16, 24);
    ctx.fillRect(canvas.width - 30, y, 16, 24);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

export class InversionLens {
  /**
   * @param {HTMLElement} container - DOM element to mount the WebGL lens onto
   * @param {Object} options - Custom configuration options
   */
  constructor(container, options = {}) {
    if (!container) {
      throw new Error('[InversionLens] Valid DOM container required');
    }

    this.container = container;
    this.options = Object.assign({
      mode: 'container', // 'container' | 'viewport'
      maskRadius: options.mode === 'viewport' ? 0.24 : 0.36,
      maskSpeed: 0.75,
      animationSpeed: 1.0,
      appearDuration: 0.45,
      disappearDuration: 0.35,
      turbulenceIntensity: 0.22,
      effectColor1: [200 / 255, 155 / 255, 178 / 255], // Rosé Gold (#C89BB2)
      effectColor2: [26 / 255, 11 / 255, 23 / 255],    // Midnight Plum (#1A0B17)
      onPointerUpdate: null
    }, options);

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.uniforms = null;
    this.mesh = null;
    this.canvas = null;

    this.isInView = false;
    this.isPointerInside = false;
    this.isRendering = false;
    this.targetMouse = new THREE.Vector2(0.5, 0.5);
    this.lerpedMouse = new THREE.Vector2(0.5, 0.5);
    this.radiusTween = null;
    this.lastTime = performance.now();
    this.animFrameId = null;

    this.textureLoader = new THREE.TextureLoader();
    this.textureLoader.setCrossOrigin('anonymous');
    this.currentTexture = null;

    this.resizeObserver = null;
    this.intersectionObserver = null;

    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerEnter = this._onPointerEnter.bind(this);
    this._onPointerLeave = this._onPointerLeave.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
    this._renderLoop = this._renderLoop.bind(this);

    this.init();
  }

  init() {
    const isViewport = this.options.mode === 'viewport';
    const width = isViewport ? (window.innerWidth || 800) : Math.max(this.container.clientWidth, 100);
    const height = isViewport ? (window.innerHeight || 600) : Math.max(this.container.clientHeight, 100);

    // 1. Camera & Scene
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();

    // 2. Initial texture
    let initialTexture = null;
    let imageAspect = 27 / 40;

    if (!isViewport) {
      const imgEl = this.container.querySelector('img');
      if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
        initialTexture = new THREE.Texture(imgEl);
        initialTexture.needsUpdate = true;
        initialTexture.minFilter = THREE.LinearFilter;
        initialTexture.magFilter = THREE.LinearFilter;
        initialTexture.generateMipmaps = false;
        imageAspect = imgEl.naturalWidth / imgEl.naturalHeight;
      } else if (imgEl && imgEl.src && !imgEl.src.endsWith('.html')) {
        initialTexture = this.textureLoader.load(
          imgEl.src,
          (tex) => {
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.generateMipmaps = false;
            if (tex.image && tex.image.width && tex.image.height) {
              this.uniforms.u_imageAspect.value = tex.image.width / tex.image.height;
            }
            this.requestRender();
          },
          undefined,
          () => {
            this.currentTexture = createFallbackTexture();
            this.uniforms.u_texture.value = this.currentTexture;
            this.requestRender();
          }
        );
      } else {
        initialTexture = createFallbackTexture();
      }
    } else {
      initialTexture = createFallbackTexture();
      imageAspect = width / height;
    }
    this.currentTexture = initialTexture;

    // 3. Shader Uniforms
    this.uniforms = {
      u_texture: { value: initialTexture },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_radius: { value: isViewport ? this.options.maskRadius : 0.0 },
      u_speed: { value: this.options.maskSpeed },
      u_imageAspect: { value: imageAspect },
      u_turbulenceIntensity: { value: this.options.turbulenceIntensity },
      u_effectColor1: { value: new THREE.Color(...this.options.effectColor1) },
      u_effectColor2: { value: new THREE.Color(...this.options.effectColor2) },
      u_isViewport: { value: isViewport ? 1.0 : 0.0 }
    };

    // 4. Geometry & Material
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      transparent: true
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);

    // 5. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
      alpha: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    
    this.canvas = this.renderer.domElement;
    this.canvas.className = isViewport ? 'inversion-lens-canvas viewport-lens-canvas' : 'inversion-lens-canvas';
    this.canvas.style.position = isViewport ? 'fixed' : 'absolute';
    this.canvas.style.inset = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.zIndex = isViewport ? '998' : '2';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.borderRadius = '0';

    if (!isViewport) {
      this.container.style.position = 'relative';
    }
    this.container.appendChild(this.canvas);

    // 6. Setup Listeners
    this._setupEventListeners();

    // 7. Initial Single Paint
    try {
      this.renderer.render(this.scene, this.camera);
    } catch (err) {
      console.warn('[InversionLens] Initial render failed, reverting canvas:', err);
      if (this.canvas && this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
      throw err;
    }
  }

  _setupEventListeners() {
    if (this.options.mode === 'viewport') {
      window.addEventListener('mousemove', this._onPointerMove, { passive: true });
      window.addEventListener('touchstart', this._onTouchStart, { passive: true });
      window.addEventListener('touchmove', this._onTouchMove, { passive: true });
      window.addEventListener('touchend', this._onTouchEnd, { passive: true });
      window.addEventListener('resize', () => this._handleResize(), { passive: true });
      return;
    }

    this.container.addEventListener('mouseenter', this._onPointerEnter, { passive: true });
    this.container.addEventListener('mousemove', this._onPointerMove, { passive: true });
    this.container.addEventListener('mouseleave', this._onPointerLeave, { passive: true });

    this.container.addEventListener('touchstart', this._onTouchStart, { passive: true });
    this.container.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this.container.addEventListener('touchend', this._onTouchEnd, { passive: true });

    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        this.isInView = entry.isIntersecting;
        if (!this.isInView) {
          this.stopLoop();
          if (this.radiusTween) {
            this.radiusTween.kill();
          }
          if (this.uniforms) {
            this.uniforms.u_radius.value = 0.0;
          }
        }
      });
    }, { threshold: 0.05 });
    this.intersectionObserver.observe(this.container);

    let resizeTimer = null;
    this.resizeObserver = new ResizeObserver(() => {
      if (resizeTimer) return;
      resizeTimer = setTimeout(() => {
        this._handleResize();
        resizeTimer = null;
      }, 150);
    });
    this.resizeObserver.observe(this.container);
  }

  activate() {
    if (this.canvas) this.canvas.style.display = 'block';
    if (this.uniforms) this.uniforms.u_radius.value = this.options.maskRadius;
    this.isPointerInside = true;
    this.startLoop();
    this.requestRender();
  }

  deactivate() {
    this.stopLoop();
    this.isPointerInside = false;
    if (this.uniforms) this.uniforms.u_radius.value = 0.0;
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
    if (this.canvas) this.canvas.style.display = 'none';
  }

  _handleResize() {
    if (!this.container || !this.renderer || !this.uniforms) return;
    const isViewport = this.options.mode === 'viewport';
    const width = isViewport ? (window.innerWidth || 800) : this.container.clientWidth;
    const height = isViewport ? (window.innerHeight || 600) : this.container.clientHeight;
    if (width > 0 && height > 0) {
      this.renderer.setSize(width, height);
      this.uniforms.u_resolution.value.set(width, height);
      this.renderer.render(this.scene, this.camera);
    }
  }

  _updatePointerCoords(clientX, clientY) {
    if (this.options.mode === 'viewport') {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      const x = clientX / w;
      const y = 1.0 - (clientY / h);
      this.targetMouse.set(
        Math.max(0.0, Math.min(1.0, x)),
        Math.max(0.0, Math.min(1.0, y))
      );
      if (typeof this.options.onPointerUpdate === 'function') {
        const radiusPx = this.options.maskRadius * Math.min(w, h);
        this.options.onPointerUpdate(clientX, clientY, radiusPx);
      }
      return;
    }

    const rect = this.container.getBoundingClientRect();
    const w = rect.width || 1;
    const h = rect.height || 1;
    const x = (clientX - rect.left) / w;
    const y = 1.0 - ((clientY - rect.top) / h);

    this.targetMouse.set(
      Math.max(0.0, Math.min(1.0, x)),
      Math.max(0.0, Math.min(1.0, y))
    );
  }

  _onPointerEnter(e) {
    this.isPointerInside = true;
    this._updatePointerCoords(e.clientX, e.clientY);
    this.lerpedMouse.copy(this.targetMouse);

    if (this.radiusTween) this.radiusTween.kill();

    if (typeof window.gsap !== 'undefined') {
      this.radiusTween = window.gsap.to(this.uniforms.u_radius, {
        value: this.options.maskRadius,
        duration: this.options.appearDuration,
        ease: 'power2.out'
      });
    } else {
      this.uniforms.u_radius.value = this.options.maskRadius;
    }

    this.startLoop();
  }

  _onPointerMove(e) {
    this._updatePointerCoords(e.clientX, e.clientY);
    if (!this.isRendering) {
      this.startLoop();
    }
  }

  _onPointerLeave() {
    this.isPointerInside = false;

    if (this.radiusTween) this.radiusTween.kill();

    if (typeof window.gsap !== 'undefined') {
      this.radiusTween = window.gsap.to(this.uniforms.u_radius, {
        value: 0.0,
        duration: this.options.disappearDuration,
        ease: 'power2.in',
        onComplete: () => {
          if (!this.isPointerInside) {
            this.stopLoop();
            this.renderer.render(this.scene, this.camera);
          }
        }
      });
    } else {
      this.uniforms.u_radius.value = 0.0;
      this.stopLoop();
      this.renderer.render(this.scene, this.camera);
    }
  }

  _onTouchStart(e) {
    if (e.touches && e.touches.length > 0) {
      this._onPointerEnter(e.touches[0]);
    }
  }

  _onTouchMove(e) {
    if (e.touches && e.touches.length > 0) {
      this._onPointerMove(e.touches[0]);
    }
  }

  _onTouchEnd() {
    this._onPointerLeave();
  }

  startLoop() {
    if (this.isRendering) return;
    this.isRendering = true;
    this.lastTime = performance.now();
    this.animFrameId = requestAnimationFrame(this._renderLoop);
  }

  stopLoop() {
    this.isRendering = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  _renderLoop(timestamp) {
    if (!this.isRendering) return;

    const delta = (timestamp - this.lastTime) * 0.001;
    this.lastTime = timestamp;

    this.lerpedMouse.lerp(this.targetMouse, 0.14);
    this.uniforms.u_mouse.value.copy(this.lerpedMouse);
    this.uniforms.u_time.value += delta * this.options.animationSpeed;

    this.renderer.render(this.scene, this.camera);

    if (!this.isPointerInside && this.uniforms.u_radius.value <= 0.0005) {
      this.uniforms.u_radius.value = 0.0;
      this.renderer.render(this.scene, this.camera);
      this.stopLoop();
      return;
    }

    this.animFrameId = requestAnimationFrame(this._renderLoop);
  }

  requestRender() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Dynamically update the poster artwork
   * @param {string} url - New image URL
   */
  setTexture(url) {
    if (!url) {
      const fallback = createFallbackTexture();
      this.uniforms.u_texture.value = fallback;
      this.uniforms.u_imageAspect.value = 3 / 4.4;
      this.requestRender();
      return;
    }

    this.textureLoader.load(
      url,
      (texture) => {
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;

        if (texture.image && texture.image.width && texture.image.height) {
          this.uniforms.u_imageAspect.value = texture.image.width / texture.image.height;
        }

        this.uniforms.u_texture.value = texture;
        this.currentTexture = texture;
        this.requestRender();
      },
      undefined,
      (err) => {
        console.warn('[InversionLens] Fallback active for texture:', err);
        const fallback = createFallbackTexture();
        this.uniforms.u_texture.value = fallback;
        this.uniforms.u_imageAspect.value = 27 / 40;
        this.requestRender();
      }
    );
  }

  /**
   * Cleanup and free WebGL resources
   */
  destroy() {
    this.stopLoop();

    if (this.radiusTween) {
      this.radiusTween.kill();
    }

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.options.mode === 'viewport') {
      window.removeEventListener('mousemove', this._onPointerMove);
      window.removeEventListener('touchstart', this._onTouchStart);
      window.removeEventListener('touchmove', this._onTouchMove);
      window.removeEventListener('touchend', this._onTouchEnd);
    } else if (this.container) {
      this.container.removeEventListener('mouseenter', this._onPointerEnter);
      this.container.removeEventListener('mousemove', this._onPointerMove);
      this.container.removeEventListener('mouseleave', this._onPointerLeave);
      this.container.removeEventListener('touchstart', this._onTouchStart);
      this.container.removeEventListener('touchmove', this._onTouchMove);
      this.container.removeEventListener('touchend', this._onTouchEnd);
    }

    if (this.mesh) {
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) this.mesh.material.dispose();
      this.scene.remove(this.mesh);
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.canvas && this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.uniforms = null;
  }
}
