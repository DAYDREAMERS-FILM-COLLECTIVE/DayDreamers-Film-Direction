/**
 * js/modules/three/three-core.js
 * Centralized Three.js bare-import bridge with local import map resolution.
 * Provides backward compatibility by exposing window.THREE while exporting
 * clean ES modules for modern decoupled components.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Explicitly bind to window for backward compatibility with non-module scripts
if (typeof window !== 'undefined') {
  window.THREE = THREE;
}

export { THREE, OrbitControls };
