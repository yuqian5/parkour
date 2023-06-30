import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {PointerLockControls} from 'three/addons/controls/PointerLockControls.js';
import Stats from 'three/examples/jsm/libs/stats.module'

const floor = 0.3

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = floor;

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

document.body.appendChild(renderer.domElement);

const loader = new GLTFLoader();

const clock = new THREE.Clock();

// region game states
const states = {
    speed: 0,
    strafe: 0,
    verticalVelocity: 0,
    canJump: true,
    gravity: 3,
    keys: {
        w: false,
        a: false,
        s: false,
        d: false,
        space: false,
        shift: false
    }
}
// endregion

// region lights
const hemLight = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.75);
hemLight.position.set(0.5, 1, 0.75);
scene.add(hemLight);
const ambientLight = new THREE.AmbientLight(0xcccccc, 0.3);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0xffffff, 1, 10000);
pointLight.position.set(30, 50, 50);
scene.add(pointLight);
// endregion

// region background
scene.background = new THREE.Color(0x11c0cc);
// endregion

// region pointer lock controls
const startButton = document.getElementById('startButton');
const pausePrompt = document.getElementById('pausePrompt');
startButton.addEventListener(
    'click',
    function () {
        controls.lock()
    },
    false
)
const controls = new PointerLockControls(camera, renderer.domElement);
controls.addEventListener('lock', () => {
    pausePrompt.style.display = '';
    startButton.style.display = 'none';
});
controls.addEventListener('unlock', () => {
    pausePrompt.style.display = 'none';
    startButton.style.display = '';
});
// endregion

// region animation
let mixer, action;
// endregion

// region collision
const rayCaster = new THREE.Raycaster();
const rayLengthDown = 0.1;
const rayLengthUp = 0.04;
const rayLengthHorizontal = 0.1;
// endregion

// region resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(scene, camera);
}

window.addEventListener('resize', onWindowResize, false);
// endregion

// region debug
let debug = false;
let gameStatWindow, stats, systemStatWindow

gameStatWindow = document.getElementById('gameStatWindow');
stats = new Stats();
systemStatWindow = document.getElementById('systemStatWindow');

let debugButton = document.getElementById('debugButton');
debugButton.addEventListener('click', () => {
    debug = !debug;
    if (debug) {
        systemStatWindow.appendChild(stats.dom);
    } else {
        gameStatWindow.innerHTML = '';
        systemStatWindow.innerHTML = '';
    }
})
// endregion

function registerKeyboardControl() {
    const onKeyDown = function (event) {
        switch (event.code) {
            case 'KeyW':
                states.keys.w = true;
                break;
            case 'KeyA':
                states.keys.a = true;
                break;
            case 'KeyS':
                states.keys.s = true;
                break;
            case 'KeyD':
                states.keys.d = true;
                break;
            case 'Space':
                states.keys.space = true;
                break;
            case 'ShiftLeft':
                states.keys.shift = true;
                break;
        }
    }
    const onKeyUp = function (event) {
        switch (event.code) {
            case 'KeyW':
                states.keys.w = false;
                break;
            case 'KeyA':
                states.keys.a = false;
                break;
            case 'KeyS':
                states.keys.s = false;
                break;
            case 'KeyD':
                states.keys.d = false;
                break;
            case 'Space':
                states.keys.space = false;
                break;
            case 'ShiftLeft':
                states.keys.shift = false;
                break;
        }
    }
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
}

function updateStates(delta) {
    // calculate speed and movement
    if (controls.isLocked === true) {
        if (states.keys.w && states.canJump) {
            states.speed = Math.min(2, states.speed + 0.1);
        } else if (states.speed > 0 && states.canJump) {
            states.speed = Math.max(0, states.speed - 0.1);
        }
        if (states.keys.s && states.canJump) {
            states.speed = Math.max(-2, states.speed - 0.1);
        } else if (states.speed < 0 && states.canJump) {
            states.speed = Math.min(0, states.speed + 0.1);
        }
        if (states.keys.a && states.canJump) {
            states.strafe = Math.max(-2, states.strafe - 0.1);
        } else if (states.strafe < 0 && states.canJump) {
            states.strafe = Math.min(0, states.strafe + 0.1);
        }
        if (states.keys.d && states.canJump) {
            states.strafe = Math.min(2, states.strafe + 0.1);
        } else if (states.strafe > 0 && states.canJump) {
            states.strafe = Math.max(0, states.strafe - 0.1);
        }
        if (states.keys.space && states.canJump) {
            states.verticalVelocity = 2;
            states.speed += 0.3;
            states.canJump = false;
        } else if (states.verticalVelocity > -10) {
            states.verticalVelocity = states.verticalVelocity - states.gravity * delta;
        }
        // if (states.keys.shift) {
        //     camera.position.y -= 0.1;
        // }
    }
}

function updatePosition(delta) {
    controls.moveForward(states.speed * delta);
    controls.moveRight(states.strafe * delta);
    camera.position.y = Math.max(floor, camera.position.y + states.verticalVelocity * delta);
}

function collisionDetection(delta) {
    // cast rays in front, back, sides, up and down of the camera to check for collisions with objects
    let frontRayOrigin = camera.position.clone();
    let rightRayOrigin = camera.position.clone();
    let leftRayOrigin = camera.position.clone();
    let backRayOrigin = camera.position.clone();
    let upRayOrigin = camera.position.clone();
    let downRayOrigin = camera.position.clone();
    let frontRayDirection = controls.getDirection(new THREE.Vector3()).clone();
    let rightRayDirection = frontRayDirection.clone().cross(camera.up);
    let leftRayDirection = rightRayDirection.clone().negate();
    let backRayDirection = frontRayDirection.clone().negate();
    let upRayDirection = new THREE.Vector3(0, 1, 0);
    let downRayDirection = new THREE.Vector3(0, -1, 0);


    frontRayOrigin.add(frontRayDirection.multiplyScalar(rayLengthHorizontal));
    rightRayOrigin.add(rightRayDirection.multiplyScalar(rayLengthHorizontal));
    leftRayOrigin.add(leftRayDirection.multiplyScalar(rayLengthHorizontal));
    backRayOrigin.add(backRayDirection.multiplyScalar(rayLengthHorizontal));
    upRayOrigin.add(upRayDirection.multiplyScalar(rayLengthUp));
    downRayOrigin.add(downRayDirection.multiplyScalar(rayLengthDown));

    rayCaster.set(frontRayOrigin, frontRayDirection);
    let frontCollisions = rayCaster.intersectObjects(scene.children, true);

    rayCaster.set(rightRayOrigin, rightRayDirection);
    let rightCollisions = rayCaster.intersectObjects(scene.children, true);

    rayCaster.set(leftRayOrigin, leftRayDirection);
    let leftCollisions = rayCaster.intersectObjects(scene.children, true);

    rayCaster.set(backRayOrigin, backRayDirection);
    let backCollisions = rayCaster.intersectObjects(scene.children, true);

    rayCaster.set(upRayOrigin, upRayDirection);
    let upCollisions = rayCaster.intersectObjects(scene.children, true);

    rayCaster.set(downRayOrigin, downRayDirection);
    let downCollisions = rayCaster.intersectObjects(scene.children, true);

    let hasFrontCollisions = frontCollisions.length > 0 && frontCollisions[0].distance < rayLengthHorizontal;
    let hasRightCollisions = rightCollisions.length > 0 && rightCollisions[0].distance < rayLengthHorizontal;
    let hasLeftCollisions = leftCollisions.length > 0 && leftCollisions[0].distance < rayLengthHorizontal;
    let hasBackCollisions = backCollisions.length > 0 && backCollisions[0].distance < rayLengthHorizontal;
    let hasUpCollisions = upCollisions.length > 0 && upCollisions[0].distance < rayLengthUp;
    let hasDownCollisions = downCollisions.length > 0 && downCollisions[0].distance < rayLengthDown;

    // adjust speed and strafe based on collision results
    if (hasFrontCollisions) {
        states.speed = Math.min(-0.1, states.speed); // prevent camera from moving forward if there is a collision in front
    }
    if (hasRightCollisions && states.strafe > 0) {
        states.strafe = 0; // prevent camera from strafing right if there is a collision on the right side
    }
    if (hasLeftCollisions && states.strafe < 0) {
        states.strafe = 0; // prevent camera from strafing left if there is a collision on the left side
    }
    if (hasBackCollisions) {
        states.speed = Math.max(0.1, states.speed); // prevent camera from moving backward if there is a collision in back
    }
    if (hasUpCollisions) {
        states.verticalVelocity = Math.min(-states.gravity * delta, states.verticalVelocity); // prevent camera from moving upward if there is a collision above
    }
    if (hasDownCollisions || camera.position.y <= floor) {
        // if any key is pressed
        if (states.keys.w || states.keys.a || states.keys.s || states.keys.d) {
            states.verticalVelocity = Math.max(0.6, states.verticalVelocity);
        } else {
            states.verticalVelocity = Math.max(0, states.verticalVelocity);
        }
        states.canJump = true;
    }
}

function update(delta) {
    updateStates(delta);

    collisionDetection(delta);

    updatePosition(delta);
}

function animate() {
    requestAnimationFrame(animate);

    let delta = clock.getDelta();

    if (controls.isLocked === true) {
        // animation update
        if (mixer) {
            mixer.update(delta);
        }

        // update camera position
        update(delta);
    }

    // Apply changes to the scene
    renderer.render(scene, camera);

    if (debug) {
        gameStatWindow.innerText = `
        x: ${camera.position.x.toFixed(2)}
        y: ${camera.position.y.toFixed(2)}
        z: ${camera.position.z.toFixed(2)}
        speed: ${states.speed.toFixed(2)}
        strafe: ${states.strafe.toFixed(2)}
        verticalVelocity: ${states.verticalVelocity.toFixed(2)}
        canJump: ${states.canJump? '1' : '0'}
        `
        stats.update();
    }
}

function start() {
    registerKeyboardControl();
    animate();
}

function loadMap() {
    // Load a glTF resource
    loader.load(
        // resource URL
        'scene.gltf',
        // called when the resource is loaded
        function (gltf) {
            if (gltf.animations[0] !== undefined) {
                mixer = new THREE.AnimationMixer(gltf.scene);
                action = mixer.clipAction(gltf.animations[0]);
                action.play();
            }

            let map = gltf.scene
            scene.add(map);

            start();
        },
        // called while loading is progressing
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        // called when loading has errors
        function (error) {
            console.log('An error happened while loading the model');
        }
    );
}

loadMap();

