import React, { useMemo, useRef } from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { color } from "@/theme/tokens";

interface Props {
  gender: "male" | "female";
  /** 0 = eo rất gọn, 1 = eo rất to (suy ra từ %mỡ cơ thể) */
  waist: number;
  /** 0 = ít cơ, 1 = cơ bắp vạm vỡ */
  muscle: number;
  height?: number;
}

/**
 * Mô hình 3D minh hoạ vóc dáng cơ thể, dựng bằng Three.js bên trong WebView.
 * Hình dạng (độ to vòng eo, độ dày vai/tay/chân) được suy ra từ % mỡ cơ thể
 * (công thức Navy Method) và mức cơ bắp ước lượng — CHỈ mang tính minh hoạ
 * trực quan, không phải bản quét cơ thể chính xác.
 */
export function Body3DModel({ gender, waist, muscle, height = 320 }: Props) {
  const webviewRef = useRef<WebView>(null);

  const html = useMemo(() => buildHtml({ gender, waist, muscle }), [gender, waist, muscle]);

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        ref={webviewRef}
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator color={color.primary} />
          </View>
        )}
      />
    </View>
  );
}

function buildHtml({ gender, waist, muscle }: { gender: "male" | "female"; waist: number; muscle: number }) {
  const skin = gender === "male" ? "#E8B48C" : "#F0C4A8";
  const accent = "#FF5A36";

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    html, body { margin:0; padding:0; overflow:hidden; background:transparent; touch-action:none; }
    canvas { display:block; }
  </style>
</head>
<body>
<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>
<script>
(function () {
  var WAIST = ${waist};
  var MUSCLE = ${muscle};
  var GENDER = "${gender}";
  var SKIN = "${skin}";
  var ACCENT = "${accent}";

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.1, 6.4);

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);

  var hemi = new THREE.HemisphereLight(0xffffff, 0xe7dcc9, 1.05);
  scene.add(hemi);
  var key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(2, 3, 4);
  scene.add(key);
  var rim = new THREE.DirectionalLight(0xffb08a, 0.4);
  rim.position.set(-3, 1, -2);
  scene.add(rim);

  var group = new THREE.Group();
  scene.add(group);

  var skinMat = new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.55, metalness: 0.05 });
  var shortsMat = new THREE.MeshStandardMaterial({ color: 0x1F6F54, roughness: 0.6 });

  // Tỉ lệ cơ bản theo giới tính
  var shoulderW = (GENDER === "male" ? 1.0 : 0.86) * (0.82 + MUSCLE * 0.32);
  var waistW = (GENDER === "male" ? 0.72 : 0.7) * (0.72 + WAIST * 0.62);
  var hipW = (GENDER === "male" ? 0.78 : 0.9) * (0.8 + WAIST * 0.4);
  var limbThickness = 0.7 + MUSCLE * 0.55;

  function capsule(radiusTop, radiusBottom, height, mat, segments) {
    segments = segments || 20;
    var geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1, false);
    var mesh = new THREE.Mesh(geo, mat);
    return mesh;
  }

  // Đầu
  var head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 24), skinMat);
  head.position.y = 2.55;
  group.add(head);

  // Cổ
  var neck = capsule(0.16, 0.19, 0.22, skinMat);
  neck.position.y = 2.18;
  group.add(neck);

  // Thân trên (vai -> eo), dùng lathe để tạo hình thon dần
  var torsoPoints = [];
  torsoPoints.push(new THREE.Vector2(shoulderW * 0.62, 2.05));
  torsoPoints.push(new THREE.Vector2(shoulderW * 0.66, 1.85));
  torsoPoints.push(new THREE.Vector2(shoulderW * 0.58, 1.5));
  torsoPoints.push(new THREE.Vector2(waistW * 0.5, 1.15));
  torsoPoints.push(new THREE.Vector2(waistW * 0.52, 0.95));
  torsoPoints.push(new THREE.Vector2(hipW * 0.56, 0.7));
  torsoPoints.push(new THREE.Vector2(hipW * 0.5, 0.5));
  var torsoGeo = new THREE.LatheGeometry(torsoPoints, 32);
  var torso = new THREE.Mesh(torsoGeo, skinMat);
  group.add(torso);

  // "Quần shorts" che phần hông dưới cho tự nhiên
  var shorts = capsule(hipW * 0.52, hipW * 0.46, 0.42, shortsMat, 28);
  shorts.position.y = 0.42;
  group.add(shorts);

  // Vai (2 quả cầu nhỏ tạo điểm nối vai-tay)
  [-1, 1].forEach(function (side) {
    var shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.19 * (0.85 + MUSCLE * 0.3), 16, 16), skinMat);
    shoulder.position.set(side * shoulderW * 0.62, 2.0, 0);
    group.add(shoulder);

    // Cánh tay trên
    var upperArm = capsule(0.11 * limbThickness, 0.1 * limbThickness, 0.75, skinMat, 14);
    upperArm.position.set(side * shoulderW * 0.72, 1.55, 0);
    upperArm.rotation.z = side * 0.12;
    group.add(upperArm);

    // Cẳng tay
    var forearm = capsule(0.095 * limbThickness, 0.08 * limbThickness, 0.7, skinMat, 14);
    forearm.position.set(side * shoulderW * 0.8, 0.95, 0);
    forearm.rotation.z = side * 0.08;
    group.add(forearm);

    // Đùi
    var thigh = capsule(0.2 * limbThickness, 0.16 * limbThickness, 0.95, skinMat, 16);
    thigh.position.set(side * hipW * 0.28, -0.28, 0);
    group.add(thigh);

    // Bắp chân
    var calf = capsule(0.15 * limbThickness, 0.1 * limbThickness, 0.85, skinMat, 16);
    calf.position.set(side * hipW * 0.28, -1.15, 0);
    group.add(calf);

    // Bàn chân
    var foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.4), skinMat);
    foot.position.set(side * hipW * 0.28, -1.62, 0.1);
    group.add(foot);
  });

  group.position.y = -0.3;
  group.scale.set(1.05, 1.05, 1.05);

  // Vòng sáng nhẹ dưới chân cho có chiều sâu
  var ringGeo = new THREE.RingGeometry(0.9, 1.35, 40);
  var ringMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
  var ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -1.95;
  scene.add(ring);

  // ── Tương tác xoay bằng ngón tay / chuột ──
  var isDragging = false;
  var lastX = 0;
  var autoRotate = true;
  var rotY = 0.4;

  function onDown(x) { isDragging = true; autoRotate = false; lastX = x; }
  function onMove(x) {
    if (!isDragging) return;
    var dx = x - lastX;
    rotY += dx * 0.01;
    lastX = x;
  }
  function onUp() { isDragging = false; }

  renderer.domElement.addEventListener('touchstart', function (e) { onDown(e.touches[0].clientX); }, { passive: true });
  renderer.domElement.addEventListener('touchmove', function (e) { onMove(e.touches[0].clientX); }, { passive: true });
  renderer.domElement.addEventListener('touchend', onUp);
  renderer.domElement.addEventListener('mousedown', function (e) { onDown(e.clientX); });
  window.addEventListener('mousemove', function (e) { onMove(e.clientX); });
  window.addEventListener('mouseup', onUp);

  function animate() {
    requestAnimationFrame(animate);
    if (autoRotate) rotY += 0.004;
    group.rotation.y = rotY;
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
</script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  wrap: { width: "100%", borderRadius: 20, overflow: "hidden", backgroundColor: "transparent" },
  webview: { flex: 1, backgroundColor: "transparent" },
  loading: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
});
