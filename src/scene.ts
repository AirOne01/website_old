import gsap from 'gsap';
import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  type Intersection,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  WebGLRenderer,
  Vector2,
} from 'three';

import type { Book, BookMesh } from './Book';
import {
  control,
  mouseDown,
  mouseMove,
  mouseUp,
} from './controls';

const colors = [
  0x581845,
  0x900c3f,
  0xc70039,
  0xff5733,
  0xffc300,
];

let currentBig = null;

const scene = new Scene();
const camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const geometry = new BoxGeometry(0.4, 0.7, 0.1);
const material = new MeshStandardMaterial({ color: 0x00ff00 });
camera.position.z = 4;
const light1 = new AmbientLight(0xffffff, 0.2);
scene.add(light1);
const light2 = new DirectionalLight(0xffffff, 1);
light2.position.set(0, 0, 2);
scene.add(light2);

let renderer: WebGLRenderer;
const raycaster = new Raycaster();

const mouse = new Vector2();
let dragTime: number;

// for having an equal amount of books in rows of the shelf
let number = 300;
const n = 5;
const rows = [];
for (let i = 0; i < n; i += 1) {
  const a = Math.ceil(number / (n - i));
  number -= a;
  rows.push(a);
}

const books: Book[] = [];
for (let i = 0; i < rows.length; i += 1) {
  for (let j = 0; j < rows[i]; j += 1) {
    const mesh = new Mesh(geometry, material);
    mesh.translateX((j * 0.103) - ((rows[i] * 0.103) / 2));
    mesh.translateY((i * 0.72) - ((rows.length * 0.72) / 2.5));
    mesh.rotateY(Math.PI / 2);
    mesh.material.color.setHex(colors[Math.floor(Math.random() * colors.length)]);
    scene.add(mesh);

    const obj: BookMesh = mesh as unknown as BookMesh;
    obj.isBig = false;
    obj.oldPos = { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z };
    books.push({ obj, color: colors[Math.floor(Math.random() * colors.length)] });
  }
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);

function magicRaycast(e): BookMesh {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  raycaster.params.Points.threshold = 0.1;
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length === 0) return null;

  let inte: Intersection = null;
  if (intersects.length > 0) [inte] = intersects;

  intersects.forEach((el) => {
    const zPoint = Math.floor(el.point.z * 1000);
    if (el.distance > inte.distance
      && zPoint >= 200
      && zPoint <= 400
      && (el.object as BookMesh).isBig) {
      inte = el;
    }
  });

  return inte.object as BookMesh;
}

function leave() {
  if (!currentBig) return;
  if (currentBig.isBig) {
    gsap.to(currentBig.position, {
      duration: 0.25,
      x: currentBig.oldPos.x,
      y: currentBig.oldPos.y,
      z: 0,
      ease: 'sine.out',
    });
    gsap.to(currentBig.rotation, {
      duration: 0.15,
      x: 0,
      y: Math.PI / 2,
      z: 0,
      ease: 'sine.in',
    });
  }
  currentBig.isBig = false;
  currentBig = null;
}

function onMouseDown() {
  mouseDown();
  dragTime = new Date().getTime();
}

function onMouseUp(e) {
  let lateClick = false;

  if (new Date().getTime() - dragTime > 200) {
    dragTime = null;
    lateClick = true;
  }

  mouseUp();
  const obj = magicRaycast(e);

  function focus() {
    currentBig = obj;
    if (!currentBig) return; // safety
    obj.isBig = true;
    obj.oldPos = { x: obj.position.x, y: obj.position.y, z: obj.position.z };

    gsap.to(obj.position, {
      duration: 0.25,
      x: 0,
      y: 0,
      z: 2,
      ease: 'sine.out',
    });
    gsap.to(obj.rotation, {
      duration: 0.20,
      y: 0,
      ease: 'power1.in',
    });
  }

  if (currentBig) {
    if (obj === currentBig || lateClick) return;

    leave();
    focus();
  } else {
    if (lateClick) return;

    leave();
    focus();
  }
}

function onPointerMove(e) {
  mouseMove(e);

  const obj = magicRaycast(e);

  if (obj && obj.isBig) {
    control(obj);
  }

  books.forEach((el) => {
    if (el.obj === obj) return;
    if (el.obj.isBig) return;
    gsap.to(el.obj.position, {
      duration: 0.25,
      z: 0,
      ease: 'sine.out',
    });
  });

  // if hovering over a book
  if (obj && !obj.isBig) {
    gsap.to(obj.position, {
      duration: 0.25,
      z: 0.3,
      ease: 'sine.out',
    });
  }
}

function createScene(el) {
  renderer = new WebGLRenderer({ antialias: true, canvas: el });

  resize();
  animate();

  renderer.domElement.addEventListener('mousemove', onPointerMove);
  renderer.domElement.addEventListener('mousedown', onMouseDown);
  renderer.domElement.addEventListener('mouseup', onMouseUp);
}

export default createScene;
