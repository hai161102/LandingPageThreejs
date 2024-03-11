import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js'
import Perlin from './utils/noise/Perlin';
import { GLTFLoader, GLTF, OrbitControls, FBXLoader } from 'three/examples/jsm/Addons.js';
import { instance, texture } from 'three/examples/jsm/nodes/Nodes.js';

const fbxLoader = new FBXLoader();
const textureLoader = new THREE.TextureLoader();
const gltfLoader: GLTFLoader = new GLTFLoader();

const lightMode = document.getElementById('light-mode');
const iconLightMode: HTMLImageElement = document.getElementById('icon-light-mode') as HTMLImageElement;

const iconLight = {
  normal: {
    dark: 'assets/textures/dark.svg',
    light: 'assets/textures/light.svg'
  },
  hover: {
    dark: 'assets/textures/dark-white.svg',
    light: 'assets/textures/light-white.svg'
  }
}



const threejsElement = document.getElementById('threejs-scene');
let deltaTime = 0;
const maxDistanceCamera = 10;
const minDistanceCamera = 8;


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
    light: new THREE.Color(0xFFFFFF),
    dark: new THREE.Color(0.05, 0.05, 0.05),
  },
  ambient: {
    light: new THREE.Color(0x404040),
    dark: new THREE.Color(0.0, 0.0, 0.01),
  },
  hemi: {
    light: new THREE.Color(0x404040),
    dark: new THREE.Color(0.0, 0.0, 0.01),
  },
  scene: {
    light: new THREE.Color(0, 0.6, 0.9),
    dark: new THREE.Color(0.0, 0.0, 0.0),
  }
}

let listMapModels: THREE.Object3D[] = [];

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
  THREE.ColorManagement.enabled = true;

  const scene = new THREE.Scene();
  scene.background = lightColor.scene.light;
  scene.castShadow = true;
  const camera = new THREE.PerspectiveCamera(45, view.width / view.height, 0.01, 2000);
  camera.position.set(0, 1, 10);
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  const orbitControl: OrbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControl.minDistance = minDistanceCamera;
  orbitControl.maxDistance = maxDistanceCamera;
  orbitControl.target = new THREE.Vector3(0, 0, 0);
  orbitControl.rotateSpeed = rotateSpeed;
  orbitControl.enableDamping = true;
  orbitControl.enablePan = false;
  orbitControl.maxPolarAngle = Math.PI / 2.1;
  orbitControl.minPolarAngle = Math.PI / 2.6;

  const ambientLight = new THREE.AmbientLight(lightColor.ambient.light, 5);
  scene.add(ambientLight);

  // const hemiLight = new THREE.HemisphereLight(0x404040, 0x404040, 0.6);
  // hemiLight.position.set(0, 10, 0);
  // scene.add(hemiLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight.position.set(5, 8, 0);
  directionalLight.shadow.mapSize.width = 2048  // default
  directionalLight.shadow.mapSize.height = 2048  // default
  directionalLight.shadow.camera.near = 0.1  // default
  directionalLight.shadow.camera.far = 2000  // default
  directionalLight.shadow.bias = -0.00001;
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  const spotLight = new THREE.SpotLight(0xffffff, 5, 1000, 0.4, 1, 0.5);
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

  const changeIconLightMode = () => {
    lightMode.style.backgroundColor = '#ffffff';
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
      TWEEN.removeAll();
      let currentLightColor: {
        direction: THREE.Color,
        ambient: THREE.Color,
        hemi: THREE.Color,
        scene: THREE.Color
      } = null;
      let toLightColor: {
        direction: THREE.Color,
        ambient: THREE.Color,
        hemi: THREE.Color,
        scene: THREE.Color
      } = null;
      lightMode.style.display = 'none';
      if (currentLightMode === 'light') {
        currentLightColor = {
          direction: lightColor.direction.dark.clone(),
          ambient: lightColor.ambient.dark.clone(),
          hemi: lightColor.hemi.dark.clone(),
          scene: lightColor.scene.dark.clone(),
        }
        toLightColor = {
          direction: lightColor.direction.light.clone(),
          ambient: lightColor.ambient.light.clone(),
          hemi: lightColor.hemi.light.clone(),
          scene: lightColor.scene.light.clone()
        }
      }
      else if (currentLightMode === 'dark') {
        currentLightColor = {
          direction: lightColor.direction.light.clone(),
          ambient: lightColor.ambient.light.clone(),
          hemi: lightColor.hemi.light.clone(),
          scene: lightColor.scene.light.clone(),
        }
        toLightColor = {
          direction: lightColor.direction.dark.clone(),
          ambient: lightColor.ambient.dark.clone(),
          hemi: lightColor.hemi.dark.clone(),
          scene: lightColor.scene.dark.clone(),
        }
      }
      new TWEEN.Tween(currentLightColor)
        .to(toLightColor, 1000)
        .onStart((object: {
          direction: THREE.Color,
          ambient: THREE.Color,
          hemi: THREE.Color,
          scene: THREE.Color
        }) => {
          directionalLight.castShadow = true;
        })
        .onUpdate((object: {
          direction: THREE.Color,
          ambient: THREE.Color,
          hemi: THREE.Color,
          scene: THREE.Color
        }, elapsed: number) => {
          directionalLight.color.set(object.direction);
          ambientLight.color.set(object.ambient);
          scene.background = object.scene;

        })
        .onComplete((object: {
          direction: THREE.Color,
          ambient: THREE.Color,
          hemi: THREE.Color,
          scene: THREE.Color
        }) => {
          lightMode.style.display = 'flex';
          if (targetModel) {
            spotLight.target = targetModel;
            const p = targetModel.getWorldPosition(new THREE.Vector3());
            spotLight.position.set(
              p.x,
              p.y + 2,
              p.z
            )
            if (currentLightMode === 'light') {
              spotLight.visible = false;
            }
            else {
              spotLight.visible = true;
            }
          }

        }).start();
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

lightMode.addEventListener('mouseover', () => {
  hoverLightIcon();
});

lightMode.addEventListener('mouseout', () => {
  normalLightIcon();
})

lightMode.addEventListener('touchstart', () => {
  hoverLightIcon();
});

lightMode.addEventListener('touchend', () => {
  normalLightIcon();
})

function hoverLightIcon() {
  lightMode.style.backgroundColor = '#646cff';
  const iconDirs = iconLightMode.src.split('/');
  let iconName = iconDirs.pop();
  if (iconName.toLocaleLowerCase().includes('dark')) {
    iconLightMode.src = iconLight.hover.dark;
  }
  else {
    iconLightMode.src = iconLight.hover.light;
  }
}

function normalLightIcon() {
  lightMode.style.backgroundColor = '#ffffff';
  const iconDirs = iconLightMode.src.split('/');
  let iconName = iconDirs.pop();
  if (iconName.toLocaleLowerCase().includes('dark')) {
    iconLightMode.src = iconLight.normal.dark;
  }
  else {
    iconLightMode.src = iconLight.normal.light;
  }
}

function logic(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  orbitControl?: OrbitControls,
  spotingLight?: THREE.SpotLight,
) {
  textureLoader.load('assets/textures/map_texture2.png', (texture) => {
    fbxLoader.load('assets/models/model4.fbx', (data) => {
      const map = data;
      console.log(map);
      map.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.receiveShadow = true;
          child.castShadow = true;
          child.material = new THREE.MeshPhongMaterial({
            map: texture,
            alphaMap: texture,
            depthTest: true,
            blending: THREE.NormalBlending,
            specular: 0x000000,
            side: THREE.DoubleSide
          });
        }
        if (child instanceof THREE.Mesh && child.name.toLocaleLowerCase().includes('car')) {
          targetModel = child;
          const p = targetModel.getWorldPosition(new THREE.Vector3()).multiplyScalar(maxDistanceCamera);
          camera.position.set(p.x, camera.position.y, p.y);
          
        }
      })
      modelToRotate = map;
      const distance = minDistanceCamera + (maxDistanceCamera - minDistanceCamera) / 2;
      if (camera.position.distanceTo(map.position) != distance) {
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
      if (orbitControl && targetModel) {
        const targetModelWorldPosition = targetModel.getWorldPosition(new THREE.Vector3());
        const objectDistance = new THREE.Vector2(targetModelWorldPosition.x, targetModelWorldPosition.z)
          .distanceTo(new THREE.Vector2(0, 0));

        orbitControl.addEventListener('change', (ev) => {
          const camWorldPosition = orbitControl.object.getWorldPosition(new THREE.Vector3())
          const camDistance = new THREE.Vector2(
            camWorldPosition.x,
            camWorldPosition.z
          ).distanceTo(new THREE.Vector2(0, 0));
          const nextPosition = new THREE.Vector3(
            (camWorldPosition.x / camDistance) * objectDistance,
            targetModel.position.y,
            (camWorldPosition.z / camDistance) * objectDistance
          )
          targetModel.lookAt(0, targetModel.position.y, 0);
          targetModel.rotateY(-Math.PI / 2);
          targetModel.position.x = nextPosition.x;
          targetModel.position.z = nextPosition.z;
          spotingLight && (spotingLight.target = targetModel),
            spotingLight.position.set(
              targetModel.position.x,
              targetModel.position.y + 2,
              targetModel.position.z
            )
        })
      }
    })
  })

}

function generate(parent: THREE.Object3D, model: THREE.Object3D | THREE.Object3D[]): {
  object?: THREE.Object3D,
  size?: THREE.Vector2
} {
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

function loadModels(path: string[], onDone: (objects: THREE.Object3D[]) => void) {
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
