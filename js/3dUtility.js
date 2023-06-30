import * as THREE from 'three';

export class ThreeDimensionUtility {
    static getNewCameraPosition(camera, distance) {
        let lookAtVector = new THREE.Vector3(0,0, -1);
        lookAtVector.applyQuaternion(camera.quaternion);

        let direction = new THREE.Vector3(
            lookAtVector.x - camera.position.x,
            lookAtVector.y - camera.position.y,
            lookAtVector.z - camera.position.z
        );

        let normalizedDirection = direction.normalize();

        normalizedDirection.multiply(new THREE.Vector3(distance, distance, distance));

        return new THREE.Vector3(
            camera.position.x + normalizedDirection.x,
            camera.position.y + normalizedDirection.y,
            camera.position.z + normalizedDirection.z
        );
    }
}