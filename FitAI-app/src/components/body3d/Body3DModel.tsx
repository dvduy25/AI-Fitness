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
 * Nhân vật được ghép từ các khối "capsule" xếp chồng liên tục (đầu → cổ →
 * ngực → eo → hông → đùi → bắp chân) để luôn liền mạch thành hình người,
 * mặc áo ba lỗ + quần short để che các đường nối. Camera tự động canh
 * khung theo bounding-box của mô hình nên luôn hiển thị đúng, không bị
 * lệch hay mất hình dù tỉ lệ cơ thể thay đổi.
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
        mixedContentMode="always"
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
  const shirt = gender === "male" ? "#2E3A46" : "#FF5A36";
  const shorts = "#1F2A33";
  const hair = "#2B211B";

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    html, body { margin:0; padding:0; overflow:hidden; background:transparent; touch-action:none; height:100%; }
    canvas { display:block; }
    #err { position:absolute; top:50%; left:0; right:0; transform:translateY(-50%); text-align:center;
           font-family:sans-serif; color:#A79E90; font-size:13px; padding:0 24px; display:none; }
  </style>
</head>
<body>
<div id="err">Không thể tải mô hình 3D (cần kết nối mạng). Kết quả số liệu bên dưới vẫn chính xác.</div>
<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>
<script>
(function () {
  if (typeof THREE === "undefined") {
    document.getElementById("err").style.display = "block";
    return;
  }
  try {
    runScene();
  } catch (err) {
    var el = document.getElementById("err");
    el.style.display = "block";
    el.textContent = "Lỗi dựng mô hình 3D: " + (err && err.message ? err.message : String(err));
  }

  function runScene() {
  var GENDER = "${gender}";
  var WAIST = Math.max(0, Math.min(1, ${waist}));
  var MUSCLE = Math.max(0, Math.min(1, ${muscle}));
  var SKIN = "${skin}";
  var SHIRT = "${shirt}";
  var SHORTS = "${shorts}";
  var HAIR = "${hair}";

  // ── Scene / camera / renderer ──────────────────────────────
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(28, window.innerWidth / Math.max(window.innerHeight, 1), 0.1, 100);
  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8cbb8, 1.15));
  var key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.position.set(2.5, 4, 3);
  scene.add(key);
  var rim = new THREE.DirectionalLight(0xffcaa8, 0.45);
  rim.position.set(-3, 1.5, -2.5);
  scene.add(rim);

  var skinMat = new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.6, metalness: 0.03 });
  var shirtMat = new THREE.MeshStandardMaterial({ color: SHIRT, roughness: 0.75, metalness: 0.02 });
  var shortsMat = new THREE.MeshStandardMaterial({ color: SHORTS, roughness: 0.75, metalness: 0.02 });
  var hairMat = new THREE.MeshStandardMaterial({ color: HAIR, roughness: 0.7 });
  var shoeMat = new THREE.MeshStandardMaterial({ color: 0xF4F1EA, roughness: 0.5 });

  var body = new THREE.Group();
  scene.add(body);

  function capsule(radius, length, mat, radial) {
    var geo = new THREE.CapsuleGeometry(radius, length, 6, radial || 18);
    return new THREE.Mesh(geo, mat);
  }

  // ── Tỉ lệ theo giới tính / % mỡ / mức cơ ───────────────────
  var muscleMul = 0.82 + MUSCLE * 0.4;     // 0.82 .. 1.22
  var waistMul = 0.8 + WAIST * 0.55;       // 0.8 .. 1.35
  var hipMul = 0.85 + WAIST * 0.35;

  var R = {
    head: 0.30,
    neck: 0.12,
    chest: (GENDER === "male" ? 0.36 : 0.32) * muscleMul,
    waist: (GENDER === "male" ? 0.30 : 0.29) * waistMul,
    pelvis: (GENDER === "male" ? 0.32 : 0.36) * hipMul,
    thigh: (GENDER === "male" ? 0.19 : 0.20) * (0.85 + MUSCLE * 0.3) * (0.9 + WAIST * 0.25),
    calf: 0.13 * (0.85 + MUSCLE * 0.25),
    upperArm: 0.11 * muscleMul,
    forearm: 0.09 * (0.85 + MUSCLE * 0.3),
  };

  // ── Xếp chồng liên tục theo trục dọc (không hở, không lệch) ─
  // cursor = mép dưới của khối vừa thêm; mỗi khối mới chồm lên 'overlap'
  // vào khối trước để luôn liền mạch dù bán kính thay đổi thế nào.
  var cursor = 0;
  function place(radius, length, overlapWith) {
    var totalH = length + radius * 2;
    var top = cursor + Math.min(radius, overlapWith != null ? overlapWith : radius) * 0.6;
    var centerY = top - totalH / 2;
    cursor = top - totalH;
    return centerY;
  }

  // Đầu
  var headY = place(R.head, 0.02);
  var head = new THREE.Mesh(new THREE.SphereGeometry(R.head, 24, 20), skinMat);
  head.position.y = headY;
  body.add(head);
  var hairCap = new THREE.Mesh(new THREE.SphereGeometry(R.head * 1.02, 24, 20, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
  hairCap.position.y = headY + R.head * 0.08;
  body.add(hairCap);

  // Cổ
  var neckY = place(R.neck, 0.02, R.head);
  var neck = capsule(R.neck, 0.04, skinMat, 12);
  neck.position.y = neckY;
  body.add(neck);

  // Ngực (mặc áo)
  var chestY = place(R.chest, 0.5, R.neck);
  var chest = capsule(R.chest, 0.5, shirtMat, 20);
  chest.position.y = chestY;
  body.add(chest);
  var shoulderY = chestY + 0.5 / 2 + R.chest * 0.35;

  // Eo (mặc áo)
  var waistY = place(R.waist, 0.22, R.chest);
  var waistMesh = capsule(R.waist, 0.22, shirtMat, 20);
  waistMesh.position.y = waistY;
  body.add(waistMesh);

  // Hông / mông (mặc short)
  var pelvisY = place(R.pelvis, 0.24, R.waist);
  var pelvis = capsule(R.pelvis, 0.24, shortsMat, 20);
  pelvis.position.y = pelvisY;
  body.add(pelvis);

  var pelvisBottom = pelvisY - (0.24 + R.pelvis * 2) / 2;
  var hipOffsetX = R.pelvis * 0.62;

  // ── Chân (mỗi bên có cursor dọc riêng bắt đầu từ dưới hông) ─
  [-1, 1].forEach(function (side) {
    var legCursor = pelvisBottom + R.pelvis * 0.5; // chồm nhẹ vào hông

    // Đùi (short che 1 phần trên)
    var thighH = 0.62;
    var thighTotal = thighH + R.thigh * 2;
    var thighTop = legCursor;
    var thighY = thighTop - thighTotal / 2;
    legCursor = thighTop - thighTotal + R.thigh * 0.55;

    var thigh = capsule(R.thigh, thighH, shortsMat, 16);
    thigh.position.set(side * hipOffsetX, thighY, 0);
    body.add(thigh);

    // Phần đùi lộ da (đoạn dưới short) — quả cầu nhỏ nối màu da
    var kneeCover = new THREE.Mesh(new THREE.SphereGeometry(R.thigh * 0.92, 16, 14), skinMat);
    kneeCover.position.set(side * hipOffsetX, legCursor, 0);
    body.add(kneeCover);

    // Bắp chân
    var calfH = 0.55;
    var calfTotal = calfH + R.calf * 2;
    var calfTop = legCursor + R.calf * 0.5;
    var calfY = calfTop - calfTotal / 2;
    legCursor = calfTop - calfTotal + R.calf * 0.4;

    var calf = capsule(R.calf, calfH, skinMat, 14);
    calf.position.set(side * hipOffsetX, calfY, 0);
    body.add(calf);

    // Giày
    var shoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.13, 0.36), shoeMat);
    shoe.position.set(side * hipOffsetX, legCursor - 0.02, 0.06);
    body.add(shoe);
  });

  // ── Tay (mỗi bên có cursor dọc riêng bắt đầu từ vai) ────────
  [-1, 1].forEach(function (side) {
    var shoulderX = side * (R.chest * 0.92);

    var shoulderBall = new THREE.Mesh(new THREE.SphereGeometry(R.upperArm * 1.15, 16, 14), shirtMat);
    shoulderBall.position.set(shoulderX, shoulderY - R.upperArm * 0.3, 0);
    body.add(shoulderBall);

    var armCursor = shoulderY - R.upperArm * 0.4;
    var armX = shoulderX + side * 0.04;
    var armTilt = side * 0.06;

    var upperArmH = 0.5;
    var upperArmTotal = upperArmH + R.upperArm * 2;
    var upperArmTop = armCursor;
    var upperArmY = upperArmTop - upperArmTotal / 2;
    armCursor = upperArmTop - upperArmTotal + R.upperArm * 0.5;

    var upperArm = capsule(R.upperArm, upperArmH, skinMat, 14);
    upperArm.position.set(armX, upperArmY, 0);
    upperArm.rotation.z = armTilt;
    body.add(upperArm);

    var forearmH = 0.46;
    var forearmTotal = forearmH + R.forearm * 2;
    var forearmTop = armCursor;
    var forearmY = forearmTop - forearmTotal / 2;

    var forearm = capsule(R.forearm, forearmH, skinMat, 14);
    forearm.position.set(armX + side * 0.05, forearmY, 0);
    forearm.rotation.z = armTilt * 1.4;
    body.add(forearm);

    var hand = new THREE.Mesh(new THREE.SphereGeometry(R.forearm * 1.05, 14, 12), skinMat);
    hand.position.set(armX + side * 0.09, forearmTop - forearmTotal + R.forearm * 0.4, 0);
    body.add(hand);
  });

  // ── Tự động canh khung hình theo bounding box ───────────────
  var box = new THREE.Box3().setFromObject(body);
  var size = new THREE.Vector3();
  var center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  body.position.sub(center); // đưa trọng tâm mô hình về gốc toạ độ

  var fitHeight = size.y * 1.25;
  var fov = camera.fov * (Math.PI / 180);
  var dist = (fitHeight / 2) / Math.tan(fov / 2);
  camera.position.set(0, size.y * 0.02, dist * 1.05);
  camera.lookAt(0, 0, 0);

  // Bệ tròn mờ dưới chân cho có chiều sâu
  var ring = new THREE.Mesh(
    new THREE.CircleGeometry(size.x * 0.9, 40),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.08 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -size.y / 2 - 0.02;
  scene.add(ring);

  // ── Xoay bằng chạm / kéo chuột, tự xoay khi rảnh ───────────
  var isDragging = false, lastX = 0, autoRotate = true, rotY = 0.5, idleTimer = null;

  function stopAuto() {
    autoRotate = false;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { autoRotate = true; }, 4000);
  }
  function onDown(x) { isDragging = true; stopAuto(); lastX = x; }
  function onMove(x) { if (!isDragging) return; rotY += (x - lastX) * 0.01; lastX = x; }
  function onUp() { isDragging = false; }

  renderer.domElement.addEventListener("touchstart", function (e) { onDown(e.touches[0].clientX); }, { passive: true });
  renderer.domElement.addEventListener("touchmove", function (e) { onMove(e.touches[0].clientX); }, { passive: true });
  renderer.domElement.addEventListener("touchend", onUp);
  renderer.domElement.addEventListener("mousedown", function (e) { onDown(e.clientX); });
  window.addEventListener("mousemove", function (e) { onMove(e.clientX); });
  window.addEventListener("mouseup", onUp);

  function animate() {
    requestAnimationFrame(animate);
    if (autoRotate) rotY += 0.005;
    body.rotation.y = rotY;
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener("resize", function () {
    camera.aspect = window.innerWidth / Math.max(window.innerHeight, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  } // end runScene
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
