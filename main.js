import * as THREE from 'three';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// import Stats from './three/examples/jsm/libs/stats.module'

import { water_VS, water_FS, ground_VS, ground_FS } from './shaders.js'

/////////////////////////
//     Setup Scene     //
/////////////////////////

//--   Base Init   --//

const scene = new THREE.Scene();
const color = 0xFFFFFF;
const intensity = 1;
const light = new THREE.AmbientLight(color, intensity);
scene.add(light);

var time = 0;
const clock = new THREE.Clock();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;
camera.position.y = 2.5;

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

//-- Setup Dev Utils --//

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1, 0);

// const stats = new Stats();
// document.body.appendChild(stats.dom); // remove stats for live demo

window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    animate();
}

/////////////////////////
//        Scene        //
/////////////////////////

function loadIntoScene(loadedInfo, dont_animate) {
    const model = loadedInfo.scene.children[0];
    scene.add(model);

    if (loadedInfo.animations.length == 0 || dont_animate) {
        console.log('no animations to load');
        return;
    }
    const clip = loadedInfo.animations[0];
    const mixer = new THREE.AnimationMixer(model);
    const action = mixer.clipAction(clip);
    action.play();

    return mixer;
}

//--     Skybox      --//

var loader = new THREE.CubeTextureLoader();
var urlPrefix = 'images/';
var skymap = new THREE.CubeTextureLoader().load([
  urlPrefix + 'px.jpg', urlPrefix + 'nx.jpg',
  urlPrefix + 'py.jpg', urlPrefix + 'ny.jpg',
  urlPrefix + 'pz.jpg', urlPrefix + 'nz.jpg'
] );
scene.background = skymap;

//--       Water      --//

const waterGeometry = new THREE.PlaneGeometry(3, 3, 100, 100);
const waterMaterial = new THREE.ShaderMaterial({
    uniforms: {
        u_dimensions: {
            type: 'v2',
            value: new THREE.Vector2(3,3)
        },
        u_time: {
            type: 'f',
            value: time
        }
    },
    vertexShader: water_VS(),
    fragmentShader: water_FS()
});
waterMaterial.transparent = true;
waterMaterial.blending = THREE.NormalBlending;
const water = new THREE.Mesh(waterGeometry, waterMaterial);
water.rotation.x = -Math.PI / 2.0;
water.scale.x *= 5;
water.scale.y *= 5;
scene.add(water);

//--     Ground      --//

const groundGeometry = new THREE.PlaneGeometry(3, 3, 100, 100);
const groundMaterial = new THREE.ShaderMaterial({
    uniforms: {
        u_dimensions: {
            type: 'v2',
            value: new THREE.Vector2(3,3)
        },
        u_time: {
            type: 'f',
            value: time
        }
    },
    vertexShader: ground_VS(),
    fragmentShader: ground_FS()
});
groundMaterial.transparent = false;
groundMaterial.blending = THREE.NormalBlending;
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2.0;
ground.scale.x *= 5;
ground.scale.y *= 5;
scene.add(ground);

//////////////////////////////
// LOAD THE MISC GLTF ITEMS //
//////////////////////////////

const gltfLoader = new GLTFLoader();
const path = 'assets/';

//--     Luxo Ball    --//

const luxo = await gltfLoader.loadAsync(path+'pixar_luxo_ball.glb');
luxo.scene.children[0].scale.set(0.25,0.25,0.25);
luxo.scene.children[0].position.x = -2.9;
luxo.scene.children[0].position.y = 0.25;
luxo.scene.children[0].position.z = 0.15;
loadIntoScene(luxo);

//--     Pool      --//

const pool = await gltfLoader.loadAsync(path+'just_a_pool.glb');
pool.scene.children[0].scale.set(.025,.025,.008);
pool.scene.children[0].rotateY(Math.PI);
loadIntoScene(pool);

/////////////////////////
// LOAD THE DUCK ITEMS //
/////////////////////////

var ducks = [
    await gltfLoader.loadAsync(path+'lowpoly_duck_animated.glb'),
    await gltfLoader.loadAsync(path+'duck_animation.glb'),
    await gltfLoader.loadAsync(path+'Rubber_Duck.glb')
];

//--     Low Poly      --//

ducks[0].scene.children[0].scale.set(1,1,1);
ducks[0].scene.children[0].position.x = -3.5;
ducks[0].scene.children[0].position.y = 0;
ducks[0].scene.children[0].position.z = 0.5;
ducks[0].scene.children[0].rotateZ(3*Math.PI/2.0);
ducks[0].scene.children[0].rotateY(3.2*Math.PI/2.0);
ducks[0].scene.children[0].rotateX(-1.2);
ducks[0].scene.children[0].castShadow = true;

//--     Realistic Duck     --//

ducks[1].scene.children[0].scale.set(.6,.6,.6);
ducks[1].scene.children[0].position.x = -0.8;
ducks[1].scene.children[0].position.y = 0;
ducks[1].scene.children[0].position.z = -1.1;
ducks[1].scene.children[0].castShadow = true;

//--     Rubber Duck      --//

ducks[2].scene.children[0].scale.set(.002,.002, .002);
ducks[2].scene.children[0].position.x = 2.5;
ducks[2].scene.children[0].position.y = 0.7;
ducks[2].scene.children[0].castShadow = true;

var mixers = [
    loadIntoScene(ducks[0], true),
    loadIntoScene(ducks[1]),
    loadIntoScene(ducks[2]),
];

let shaderMaterials = [
    waterMaterial,
    groundMaterial
];

/////////////////////////
//     Render Loop     //
/////////////////////////

function animate() {
    controls.update();

    // tick
    var delta = clock.getDelta();
    time += delta;

    // update the animations
    for (const mixer of mixers) {
        if (mixer == undefined) { continue; }
        mixer.update(delta);
    }

    // update the shaders
    for (const shader of shaderMaterials) {
        shader.uniforms.u_time.value = time;
    }
    
    renderer.render(scene, camera);
    // stats.update();
    requestAnimationFrame(animate);
}
animate();