// animations.js — load Mixamo FBX + retarget to VRM humanoid.
// Mirrors pixiv/three-vrm humanoidAnimation example so any FBX that uses
// mixamorig* bone naming plays on any VRM regardless of its skeleton.

(function () {
  const RIG_MAP = window.ACS_MIXAMO_RIG_MAP;

  // Retarget a loaded FBX asset's animation clip to VRM normalized bones.
  // Returns a THREE.AnimationClip ready for use with AnimationMixer(vrm.scene).
  function retargetMixamoToVRM(asset, vrm) {
    const THREE = window.THREE;
    const clip = THREE.AnimationClip.findByName(asset.animations, 'mixamo.com')
              || asset.animations[0];
    if (!clip) throw new Error('FBX has no animation tracks');

    const tracks = [];
    const restRotationInverse = new THREE.Quaternion();
    const parentRestWorldRotation = new THREE.Quaternion();
    const _qA = new THREE.Quaternion();

    const hipsNode = asset.getObjectByName('mixamorigHips');
    const motionHipsY = hipsNode ? hipsNode.position.y : 1;
    const vrmHipsY = vrm.humanoid?.normalizedRestPose?.hips?.position?.[1]
                  ?? vrm.humanoid?.getNormalizedBoneNode?.('hips')?.position?.y
                  ?? 1;
    const hipsScale = vrmHipsY / motionHipsY;

    for (const track of clip.tracks) {
      const [mixamoRigName, propertyName] = track.name.split('.');
      const vrmBoneName = RIG_MAP[mixamoRigName];
      const vrmNode = vrmBoneName && vrm.humanoid?.getNormalizedBoneNode(vrmBoneName);
      if (!vrmNode) continue;
      const vrmNodeName = vrmNode.name;
      const mixamoRigNode = asset.getObjectByName(mixamoRigName);
      if (!mixamoRigNode) continue;

      mixamoRigNode.getWorldQuaternion(restRotationInverse).invert();
      mixamoRigNode.parent.getWorldQuaternion(parentRestWorldRotation);

      if (track instanceof THREE.QuaternionKeyframeTrack) {
        const values = track.values.slice();
        for (let i = 0; i < values.length; i += 4) {
          _qA.fromArray(values, i);
          _qA.premultiply(parentRestWorldRotation).multiply(restRotationInverse);
          _qA.toArray(values, i);
        }
        const isVrm0 = vrm.meta?.metaVersion === '0';
        const adj = isVrm0 ? values.map((v, i) => i % 2 === 0 ? -v : v) : values;
        tracks.push(new THREE.QuaternionKeyframeTrack(`${vrmNodeName}.${propertyName}`, track.times, adj));
      } else if (track instanceof THREE.VectorKeyframeTrack) {
        const isVrm0 = vrm.meta?.metaVersion === '0';
        const scaled = track.values.map((v, i) => (isVrm0 && i % 3 !== 1 ? -v : v) * hipsScale);
        tracks.push(new THREE.VectorKeyframeTrack(`${vrmNodeName}.${propertyName}`, track.times, scaled));
      }
    }

    return new THREE.AnimationClip('vrmAnimation', clip.duration, tracks);
  }

  // Load an FBX from URL or ArrayBuffer (drag-drop) and retarget in one go.
  async function loadMixamoAnimationFromURL(url, vrm) {
    if (!window.FBXLoader) throw new Error('FBXLoader not loaded');
    const loader = new window.FBXLoader();
    const asset = await loader.loadAsync(url);
    return retargetMixamoToVRM(asset, vrm);
  }

  async function loadMixamoAnimationFromBuffer(buffer, vrm) {
    if (!window.FBXLoader) throw new Error('FBXLoader not loaded');
    const loader = new window.FBXLoader();
    const asset = loader.parse(buffer, ''); // FBXLoader.parse is synchronous
    return retargetMixamoToVRM(asset, vrm);
  }

  window.ACS_retargetMixamo = retargetMixamoToVRM;
  window.ACS_loadAnimationFromURL = loadMixamoAnimationFromURL;
  window.ACS_loadAnimationFromBuffer = loadMixamoAnimationFromBuffer;
})();
