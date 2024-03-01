import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js'
import Perlin from './utils/noise/Perlin';
import { GLTFLoader, GLTF, OrbitControls } from 'three/examples/jsm/Addons.js';

const lightMode = document.getElementById('light-mode');
const iconLightMode: HTMLImageElement = document.getElementById('icon-light-mode') as HTMLImageElement;

const threejsElement = document.getElementById('threejs-scene');
let deltaTime = 0;
const maxDistanceCamera = 8;
const minDistanceCamera = 4;

const textureLoader = new THREE.TextureLoader();
const gltfLoader: GLTFLoader = new GLTFLoader();

const tilePaths = [
  'assets/models/tilehex_earth.glb',
  'assets/models/tilehex_tree.glb',
  'assets/models/tilehex.glb',
]

let modelToRotate: THREE.Object3D = null;
let targetModel = new THREE.Object3D();
const rotateSpeed = 0.5;
const maxRotateX = Math.PI / 4 + 0.01;
const minRotateX = -0.01;

const lightColor = {
  direction: {
    light: new THREE.Color(1, 1, 1),
    dark: new THREE.Color(0.2, 0.2, 0.2),
  },
  ambient: {
    light: new THREE.Color(1, 1, 1),
    dark: new THREE.Color(0.0, 0.0, 0.1),
  },
  hemi: {
    light: new THREE.Color(1, 1, 1),
    dark: new THREE.Color(0.0, 0.0, 0.1),
  },
  scene: {
    light: new THREE.Color(0, 0.8, 1),
    dark: new THREE.Color(0.0, 0.0, 0.1),
  }
}

const loadModels = (path: string[], onDone: (objects: THREE.Object3D[]) => void) => {
  const list: THREE.Object3D[] = []
  const loadFunction = (count: number, onDoneLoad: () => void) => {
    if (count >= path.length) {
      onDoneLoad()
      return
    }
    gltfLoader.load(path[count], (gltf: GLTF) => {
      gltf.scene.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.material.roughness = 1;
        }
      })
      list.push(gltf.scene)
      loadFunction(count + 1, onDoneLoad)
    }, undefined, (err) => {
      console.error(err);
      loadFunction(count + 1, onDoneLoad)
    })
  }

  loadFunction(0, () => {
    onDone(list)
  })
}

let listMapModels: THREE.Object3D[] = [];


const generate = (parent: THREE.Object3D, model: THREE.Object3D | THREE.Object3D[]): {
  object?: THREE.Object3D,
  size?: THREE.Vector2
} => {
  const perlinNoise = new Perlin();
  perlinNoise.resetOutputRange();
  const range = { min: 0, max: 1.25 };
  perlinNoise.setOutputRange(range.min, range.max);
  parent.clear();
  const cols = 32;
  const rows = 32;
  let indexRow: number = 0;
  let indexCol: number = 0;
  const minThreshold: number = 0.4;
  const maxThreshold: number = range.max;
  const spaceTile = 0;
  const totalSize: THREE.Vector2 = new THREE.Vector2();
  const childSize = new THREE.Vector3()
  let object: THREE.Object3D;
  if (model instanceof Array) {
    object = model[0];
  }
  else {
    object = model;
  }
  object.traverse((child) => {
    if (child instanceof THREE.Mesh && child.name.includes('tile')) {
      const box = new THREE.Box3();
      child.geometry.computeBoundingBox();
      box.copy(child.geometry.boundingBox).applyMatrix4(child.matrixWorld)
      const size = box.getSize(new THREE.Vector3());
      childSize.set(size.x + spaceTile, size.y + spaceTile, size.z + spaceTile);
      totalSize.set(childSize.x * rows * 3 / 4, childSize.z * cols);
    }
  })

  const addTile = (col: number, row: number) => {
    const position = new THREE.Vector2(
      childSize.x * row * 3 / 4 - totalSize.x / 2,
      childSize.z * col + (row % 2 === 1 ? childSize.z * 0.5 : 0) - totalSize.y / 2
    );
    let noise = perlinNoise.getValue2D(position.x / 1.8, position.y / 1.8);
    if (position.length() > Math.min(totalSize.x, totalSize.y) / 2) return
    if (noise < minThreshold) {
      return
    }
    let hexTileNode: THREE.Object3D;
    if (model instanceof Array) {
      const space = (maxThreshold - minThreshold) / (model.length);
      for (let i = 0; i < model.length; i++) {
        if (noise < minThreshold + (i + 1) * space) {
          hexTileNode = model[i].clone();
          break;
        }
      }
    }
    else {
      hexTileNode = model.clone();
    }
    parent.add(hexTileNode);
    const scaleTree = Math.random() + 0.8;
    hexTileNode.traverse((child) => {
      if (child instanceof THREE.Mesh && !child.name.includes('tile')) {
        child.scale.set(
          scaleTree,
          scaleTree,
          scaleTree
        );
      }
    })
    hexTileNode.position.set(position.x, 0, position.y);
  }

  while (indexRow < rows && indexCol < cols) {
    addTile(indexRow, indexCol);
    indexRow++;
    if (indexRow >= rows) {
      indexRow = 0;
      indexCol++;
    }
  }


  return { object: parent, size: totalSize }

}


const logic = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  orbitControl?: OrbitControls,
  spotingLight?: THREE.SpotLight,
) => {
  loadModels(tilePaths, (objects: THREE.Object3D[]) => {
    listMapModels = objects;
    const map = new THREE.Object3D();
    modelToRotate = map;
    const distance = minDistanceCamera + (maxDistanceCamera - minDistanceCamera) / 2;
    if (camera.position.distanceTo(map.position) > distance) {
      const zoomCamera = new TWEEN.Tween(camera.position)
        .to(map.position, 1000).onUpdate((object: THREE.Vector3, value: number) => {
          const position = camera.position.clone().lerp(object, 0.05);
          camera.position.set(position.x, position.y, position.z);
          if (camera.position.distanceTo(map.position) <= distance) {
            zoomCamera.stop();
          }
        }).start();
    }
    scene.add(map)
    const { size } = generate(map, listMapModels)

    const sphereMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFF00,
      transparent: true,
      opacity: 1,
    })
    const sphereGeometry = new THREE.SphereGeometry(0.2, 128, 128);
    const sun = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sun.castShadow = true;
    sun.receiveShadow = true;
    targetModel.add(sun);
    sun.position.set(0, 0.2, Math.max(size.x, size.y) / 3);
    if (orbitControl) {
      const sunWorldPosition = sun.getWorldPosition(new THREE.Vector3());
      const objectDistance = new THREE.Vector2(sunWorldPosition.x, sunWorldPosition.z)
        .distanceTo(new THREE.Vector2(0, 0));

      orbitControl.addEventListener('change', (ev) => {
        const camWorldPosition = orbitControl.object.getWorldPosition(new THREE.Vector3())
        const camDistance = new THREE.Vector2(camWorldPosition.x, camWorldPosition.z)
          .distanceTo(new THREE.Vector2(0, 0));
        sun.position.x = (camWorldPosition.x / camDistance) * objectDistance;
        sun.position.z = (camWorldPosition.z / camDistance) * objectDistance;
        spotingLight && (spotingLight.target = targetModel.children[0]),
        spotingLight.position.set(
          targetModel.children[0].position.x,
          targetModel.children[0].position.y + 2,
          targetModel.children[0].position.z
        )
      })
    }

  })

}

const initView = (view: {
  view: HTMLElement,
  width: number,
  height: number,
  onResize: (
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer
  ) => void
}) => {

  let currentLightMode: 'light' | 'dark' = 'light';

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(view.width, view.height);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = THREE.CineonToneMapping;
  renderer.toneMappingExposure = 1.6;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  THREE.ColorManagement.enabled = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0, 0.8, 1);
  const camera = new THREE.PerspectiveCamera(45, view.width / view.height, 0.01, 1000);
  camera.position.set(0, 1, 10);
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  const orbitControl: OrbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControl.minDistance = minDistanceCamera;
  orbitControl.maxDistance = maxDistanceCamera;
  orbitControl.target = new THREE.Vector3(0, 0, 0);
  orbitControl.rotateSpeed = rotateSpeed;
  orbitControl.enableDamping = true;
  orbitControl.enablePan = false;
  orbitControl.maxPolarAngle = Math.PI / 2.5;
  orbitControl.minPolarAngle = Math.PI / 4;

  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  scene.add(ambientLight);

  // const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
  // hemiLight.position.set(0, 10, 0);
  // // hemiLight.shadow.bias = -0.0001;
  // scene.add(hemiLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(0, 1, 0);
  directionalLight.shadow.mapSize.width = 2048  // default
  directionalLight.shadow.mapSize.height = 2048  // default
  directionalLight.shadow.camera.near = 0.1  // default
  directionalLight.shadow.camera.far = 2000  // default
  directionalLight.shadow.bias = -0.000002;
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  const spotLight = new THREE.SpotLight(0xffffff, 5, 1000, 0.2, 1, 0.5);
  spotLight.castShadow = true;
  spotLight.shadow.mapSize.width = 2056;
  spotLight.shadow.mapSize.height = 2056;
  spotLight.shadow.camera.near = 0.1;
  spotLight.shadow.camera.far = 2000;
  spotLight.shadow.bias = -0.00005;
  spotLight.visible = false;
  scene.add(spotLight);
  spotLight.target = targetModel;
  scene.add(targetModel);

  const update = (dt: number) => {
    orbitControl.update();
    renderer.render(scene, camera);
  }

  let previousTime = Date.now();

  const animate = () => {
    const currentTime = Date.now();
    const dt = currentTime - previousTime;
    TWEEN.update();
    update(dt / 1000);
    previousTime = currentTime;
    requestAnimationFrame(animate);
  }
  animate();
  view.view.appendChild(renderer.domElement);

  window.addEventListener('resize', () => {
    view.onResize(camera, renderer);
  });

  // const touchData: {
  //   isTouch: boolean,
  //   previousPosition: THREE.Vector2,
  //   dir: "left" | "right" | "none",
  //   lastVelocity: THREE.Vector2,
  //   isTweenPlaying: boolean,
  // } = {
  //   isTouch: false,
  //   previousPosition: null,
  //   dir: "none",
  //   lastVelocity: new THREE.Vector2(),
  //   isTweenPlaying: false,
  // }


  // const touchstart = (position: THREE.Vector2) => {
  //   TWEEN.removeAll()
  //   touchData.isTweenPlaying = false;
  //   touchData.isTouch = true;
  //   touchData.previousPosition = position;
  // }
  // const touchmove = (position: THREE.Vector2) => {
  //   if (touchData.isTouch && !touchData.isTweenPlaying) {
  //     const dPosition = touchData.previousPosition.clone()
  //       .lerp(position.clone(), 0.05)
  //       .sub(touchData.previousPosition.clone());
  //     touchData.lastVelocity = dPosition;
  //     if (dPosition.x < 0) touchData.dir = "left";
  //     else if (dPosition.x > 0) touchData.dir = "right";
  //     else touchData.dir = "none";
  //     modelToRotate && (modelToRotate.rotation.y += dPosition.x * rotateSpeed * deltaTime);
  //     scene.rotation.x += dPosition.y * rotateSpeed * deltaTime

  //     touchData.previousPosition.set(position.x, position.y);
  //     // camera.rotation.x += dy * 0.001;
  //   }
  // }
  // const touchend = (position: THREE.Vector2) => {
  //   if (touchData.isTouch) {
  //     touchData.isTouch = false;
  //     touchData.isTweenPlaying = true;
  //     // TWEEN.remove(rotationTween)
  //     TWEEN.removeAll()
  //     // if (touchData.dir === 'left') {
  //     //   addAngle = -Math.PI / 6;
  //     // }
  //     // else if (touchData.dir === 'right') {
  //     //   addAngle = Math.PI / 6;
  //     // }
  //     new TWEEN.Tween(touchData.lastVelocity).to(new THREE.Vector2(0, 0), 2000)
  //       .onUpdate((object: THREE.Vector2, elapsed: number) => {
  //         // console.log(currentRotation);
  //         modelToRotate && (modelToRotate.rotation.y += object.x * rotateSpeed * deltaTime);
  //       })
  //       .onComplete((object: THREE.Vector2) => {
  //         touchData.previousPosition = null;
  //         touchData.dir = "none";
  //         touchData.lastVelocity = new THREE.Vector2();
  //         touchData.isTweenPlaying = false;
  //       })
  //       .start();

  //   }
  // }
  const changeIconLightMode = () => {
    if (currentLightMode) {
      if (currentLightMode === 'light') {
        iconLightMode.src = 'assets/textures/dark.svg';
      }
      else if (currentLightMode === 'dark') {
        iconLightMode.src = 'assets/textures/light.svg';
      }
    }
  }

  const changeLightMode = () => {
    if (currentLightMode) {
      if (currentLightMode === 'light') {
        directionalLight.color.set(lightColor.direction.light);
        directionalLight.castShadow = true;
        ambientLight.color.set(lightColor.ambient.light);
        // hemiLight.color.set(lightColor.hemi.light);
        // hemiLight.groundColor.set(lightColor.hemi.light);
        scene.background = lightColor.scene.light;
        spotLight.visible = false;
      }
      else if (currentLightMode === 'dark') {
        directionalLight.color.set(lightColor.direction.dark);
        directionalLight.castShadow = false;
        ambientLight.color.set(lightColor.ambient.dark);
        // hemiLight.color.set(lightColor.hemi.dark);
        // hemiLight.groundColor.set(lightColor.hemi.dark);
        scene.background = lightColor.scene.dark;
        spotLight.visible = true;
        spotLight.target = targetModel.children[0];
        spotLight.position.set(
          targetModel.children[0].position.x,
          targetModel.children[0].position.y + 2,
          targetModel.children[0].position.z
        )
      }
    }
  }

  lightMode.addEventListener('click', (ev: MouseEvent) => {
    currentLightMode = currentLightMode === 'light' ? 'dark' : 'light';
    changeIconLightMode();
    changeLightMode();
  })

  logic(renderer, scene, camera, orbitControl, spotLight);
}

initView(
  {
    view: threejsElement,
    width: threejsElement.clientWidth,
    height: threejsElement.clientHeight,
    onResize: (camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) => {
      camera.aspect = threejsElement.clientWidth / threejsElement.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(threejsElement.clientWidth, threejsElement.clientHeight);
    }
  }
);

