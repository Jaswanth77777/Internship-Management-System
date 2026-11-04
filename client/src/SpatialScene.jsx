import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

const ROLE_COLORS = {
  STUDENT: 0x00f3ff,
  FACULTY: 0x9d4edd,
  COMPANY: 0x00ff66,
  ADMIN: 0xff0055
};

export default function SpatialScene({ role = "STUDENT" }) {
  const host = useRef(null);
  const roleRef = useRef(role);
  useEffect(() => { roleRef.current = role; }, [role]);

  useEffect(() => {
    const root = host.current;
    if (!root) return undefined;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 180);
    camera.position.set(0, 3.2, 13);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    renderer.setSize(root.clientWidth, root.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    root.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0x829aff, 0.65);
    scene.add(ambient);
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(root.clientWidth, root.clientHeight), 0.72, 0.65, 0.12));
    composer.addPass(new OutputPass());
    const point = new THREE.PointLight(0x00eaff, 2.4, 28);
    point.position.set(2, 4, 4);
    scene.add(point);

    // Procedural perspective grid with animated scanline shader.
    const gridGeometry = new THREE.PlaneGeometry(100, 100, 1, 1);
    const gridMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x00dff5) } },
      vertexShader: `
        varying vec2 vUv;
        void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; }
      `,
      fragmentShader: `
        varying vec2 vUv; uniform float uTime; uniform vec3 uColor;
        void main(){
          vec2 uv=vUv*vec2(76.0,76.0);
          vec2 line=min(fract(uv),1.0-fract(uv));
          float grid=1.0-smoothstep(0.0,0.035,min(line.x,line.y));
          float horizon=smoothstep(0.02,0.78,vUv.y);
          float scan=0.5+0.5*sin((vUv.y*95.0-uTime*2.0)*6.283);
          float glow=grid*(0.12+0.13*scan)*horizon;
          gl_FragColor=vec4(uColor,glow);
        }
      `
    });
    const grid = new THREE.Mesh(gridGeometry, gridMaterial);
    grid.rotation.x = -Math.PI / 2;
    grid.position.set(0, -3.2, -8);
    scene.add(grid);

    const core = new THREE.Group();
    core.position.set(2.55, 0.55, -1.4);
    scene.add(core);
    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.05, 2),
      new THREE.MeshBasicMaterial({ color: 0x00eaff, wireframe: true, transparent: true, opacity: 0.23, blending: THREE.AdditiveBlending })
    );
    core.add(shell);
    const inner = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.35, 4),
      new THREE.MeshBasicMaterial({ color: 0x9d4edd, wireframe: true, transparent: true, opacity: 0.19, blending: THREE.AdditiveBlending })
    );
    core.add(inner);

    const rings = [];
    [2.45, 2.8, 3.15].forEach((radius, index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.012, 8, 180),
        new THREE.MeshBasicMaterial({ color: index === 1 ? 0x9d4edd : 0x00eaff, transparent: true, opacity: 0.48, blending: THREE.AdditiveBlending })
      );
      ring.rotation.set(0.7 + index * 0.48, 0.35 + index * 0.3, index * 0.45);
      core.add(ring);
      rings.push(ring);
    });

    const plasmaCount = 620;
    const plasmaPositions = new Float32Array(plasmaCount * 3);
    const plasmaColors = new Float32Array(plasmaCount * 3);
    const plasmaGeometry = new THREE.BufferGeometry();
    for (let i = 0; i < plasmaCount; i++) {
      const radius = 0.45 + Math.random() * 1.18;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      plasmaPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      plasmaPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      plasmaPositions[i * 3 + 2] = radius * Math.cos(phi);
      plasmaColors[i * 3] = 0.18 + Math.random() * 0.35;
      plasmaColors[i * 3 + 1] = 0.65 + Math.random() * 0.3;
      plasmaColors[i * 3 + 2] = 0.9 + Math.random() * 0.1;
    }
    plasmaGeometry.setAttribute("position", new THREE.BufferAttribute(plasmaPositions, 3));
    plasmaGeometry.setAttribute("color", new THREE.BufferAttribute(plasmaColors, 3));
    const plasma = new THREE.Points(plasmaGeometry, new THREE.PointsMaterial({ size: 0.035, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    core.add(plasma);

    // Floating neural data nodes and a lightweight set of nearby links.
    const nodeCount = 860;
    const nodePositions = new Float32Array(nodeCount * 3);
    for (let i = 0; i < nodeCount; i++) {
      nodePositions[i * 3] = (Math.random() - 0.5) * 28;
      nodePositions[i * 3 + 1] = (Math.random() - 0.5) * 15;
      nodePositions[i * 3 + 2] = -Math.random() * 23;
    }
    const nodesGeometry = new THREE.BufferGeometry();
    nodesGeometry.setAttribute("position", new THREE.BufferAttribute(nodePositions, 3));
    const nodes = new THREE.Points(nodesGeometry, new THREE.PointsMaterial({ color: 0x9bcfff, size: 0.025, transparent: true, opacity: 0.66, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(nodes);

    const linkVertices = [];
    for (let i = 0; i < nodeCount; i += 1) {
      for (let j = i + 1; j < Math.min(i + 7, nodeCount); j += 1) {
        const dx = nodePositions[i * 3] - nodePositions[j * 3];
        const dy = nodePositions[i * 3 + 1] - nodePositions[j * 3 + 1];
        const dz = nodePositions[i * 3 + 2] - nodePositions[j * 3 + 2];
        if (dx * dx + dy * dy + dz * dz < 1.15) {
          linkVertices.push(nodePositions[i * 3], nodePositions[i * 3 + 1], nodePositions[i * 3 + 2], nodePositions[j * 3], nodePositions[j * 3 + 1], nodePositions[j * 3 + 2]);
        }
      }
    }
    const linksGeometry = new THREE.BufferGeometry();
    linksGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linkVertices, 3));
    const links = new THREE.LineSegments(linksGeometry, new THREE.LineBasicMaterial({ color: 0x397da8, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending }));
    scene.add(links);

    // Mouse raycasting against a transparent interaction plane spawns energy ripples.
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const interactionPlane = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }));
    interactionPlane.position.z = -2;
    scene.add(interactionPlane);
    const ripples = [];
    function spawnRipple(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(interactionPlane)[0];
      if (!hit) return;
      const ripple = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.13, 64), new THREE.MeshBasicMaterial({ color: ROLE_COLORS[roleRef.current] || ROLE_COLORS.STUDENT, transparent: true, opacity: 0.78, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      ripple.position.copy(hit.point);
      ripple.position.z = -1.96;
      scene.add(ripple);
      ripples.push({ mesh: ripple, age: 0 });
      if (ripples.length > 12) {
        const old = ripples.shift();
        scene.remove(old.mesh); old.mesh.geometry.dispose(); old.mesh.material.dispose();
      }
    }
    window.addEventListener("pointerdown", spawnRipple);

    const pointerMove = (event) => {
      const rect = root.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    window.addEventListener("pointermove", pointerMove);

    let frame = 0;
    let raf = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      gridMaterial.uniforms.uTime.value = elapsed;
      grid.position.z = -8 + ((elapsed * 0.35) % 2);
      gridMaterial.uniforms.uColor.value.setHex(0x00dff5);
      const activeColor = ROLE_COLORS[roleRef.current] || ROLE_COLORS.STUDENT;
      ambient.color.setHex(activeColor);
      point.color.setHex(activeColor);
      gridMaterial.uniforms.uColor.value.setHex(activeColor);
      inner.material.color.setHex(activeColor);
      plasma.material.color.setHex(activeColor);
      shell.rotation.y = elapsed * 0.075;
      shell.rotation.x = Math.sin(elapsed * 0.12) * 0.12;
      inner.rotation.y = -elapsed * 0.11;
      plasma.rotation.y = elapsed * 0.16;
      plasma.scale.setScalar(1 + Math.sin(elapsed * 1.5) * 0.035);
      rings.forEach((ring, index) => { ring.rotation.z += 0.0007 * (index + 1); ring.rotation.x += 0.0002 * (index + 1); });
      core.rotation.y += (pointer.x * 0.13 - core.rotation.y) * 0.012;
      core.rotation.x += (-pointer.y * 0.1 - core.rotation.x) * 0.012;
      nodes.rotation.y = Math.sin(elapsed * 0.035) * 0.035;
      nodes.rotation.x = Math.cos(elapsed * 0.025) * 0.02;
      ripples.forEach((ripple) => {
        ripple.age += 0.012;
        ripple.mesh.scale.setScalar(1 + ripple.age * 10);
        ripple.mesh.material.opacity = Math.max(0, 0.78 * (1 - ripple.age));
      });
      for (let i = ripples.length - 1; i >= 0; i--) {
        if (ripples[i].age >= 1) {
          const [old] = ripples.splice(i, 1);
          scene.remove(old.mesh); old.mesh.geometry.dispose(); old.mesh.material.dispose();
        }
      }
      composer.render();
      frame += 1;
    };
    animate();

    const resize = () => {
      const width = Math.max(1, root.clientWidth);
      const height = Math.max(1, root.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);\n      composer.setSize(width, height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(root);
    resize();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerdown", spawnRipple);
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => material.dispose());
        }
      });
      composer.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === root) root.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={host} className="spatial-scene" aria-hidden="true" />;
}
