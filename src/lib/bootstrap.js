// Bootstrap: expose CDN-global dependencies before running original TasteVerse code.
import * as THREE from 'three';
import ForceGraph3D from '3d-force-graph';

if (typeof window !== 'undefined') {
  window.THREE = THREE;
  window.ForceGraph3D = ForceGraph3D;
}
