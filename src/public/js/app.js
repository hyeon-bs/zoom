const socket = io();

// =====================================================================
//  DOM REFERENCES
// =====================================================================
const welcome       = document.getElementById("welcome");
const call          = document.getElementById("call");
const myFace        = document.getElementById("myFace");
const muteBtn       = document.getElementById("mute");
const cameraBtn     = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const leaveBtn      = document.getElementById("leaveRoom");
const videoContainer = document.getElementById("videoContainer");
const myBadge       = document.getElementById("myBadge");
const peerBadge     = document.getElementById("peerBadge");
const peerFace = document.getElementById("peerFace");
const roomLabel     = document.getElementById("roomLabel");
const messageList   = document.querySelector(".message-list");
const msgForm       = document.getElementById("msg");
const chatInput     = msgForm.querySelector("input");

// =====================================================================
//  STATE
// =====================================================================
let myStream;
let muted       = false;
let cameraOff   = false;
let roomName;
let myPeerConnection;
let myDataChannel;
let nickname    = "You";

// =====================================================================
//  SVG ICONS
// =====================================================================
const ICONS = {
  mic: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
  micOff: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
  camera: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
  cameraOff: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06A4 4 0 1 1 7.72 11.4"/></svg>`,
};

// =====================================================================
//  CAMERA / MEDIA
// =====================================================================
async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(d => d.kind === "videoinput");
    const currentCamera = myStream.getVideoTracks()[0];
    cameras.forEach(cam => {
      const opt = document.createElement("option");
      opt.value = cam.deviceId;
      opt.innerText = cam.label;
      if (currentCamera.label === cam.label) opt.selected = true;
      camerasSelect.appendChild(opt);
    });
  } catch (e) {
    console.log(e);
  }
}

async function getMedia(deviceId) {
  const constraints = deviceId
    ? { audio: true, video: { deviceId: { exact: deviceId } } }
    : { audio: true, video: { facingMode: "user" } };

    console.log("getMedia 시작");
    console.log("constraints:", constraints);

  try {
    myStream = await navigator.mediaDevices.getUserMedia(constraints);
    
    console.log("getUserMedia 성공");
    console.log("myStream:", myStream);
    console.log("tracks:", myStream.getTracks());
    
    myFace.srcObject = myStream;
    //if (!deviceId) await getCameras();
  } catch (e) {
    console.error("카메라 오류:", e);
  }
}

// =====================================================================
//  CONTROL BAR HANDLERS
// =====================================================================
function handleMuteClick() {
  myStream.getAudioTracks().forEach(t => (t.enabled = !t.enabled));
  muted = !muted;
  muteBtn.classList.toggle("muted", muted);
  muteBtn.innerHTML = muted ? ICONS.micOff : ICONS.mic;
  muteBtn.title = muted ? "Unmute Microphone" : "Mute Microphone";
}

function handleCameraClick() {
  myStream.getVideoTracks().forEach(t => (t.enabled = !t.enabled));
  cameraOff = !cameraOff;
  cameraBtn.classList.toggle("camera-off", cameraOff);
  cameraBtn.innerHTML = cameraOff ? ICONS.cameraOff : ICONS.camera;
  cameraBtn.title = cameraOff ? "Turn Camera On" : "Turn Camera Off";
}

async function handleCameraChange() {
  await getMedia(camerasSelect.value);
  if (myPeerConnection) {
    const videoTrack = myStream.getVideoTracks()[0];
    const videoSender = myPeerConnection
      .getSenders()
      .find(s => s.track.kind === "video");
    videoSender.replaceTrack(videoTrack);
  }
}

function handleLeave() {
  if (myStream) myStream.getTracks().forEach(t => t.stop());
  if (myPeerConnection) myPeerConnection.close();
  location.reload();
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);
leaveBtn.addEventListener("click", handleLeave);

// =====================================================================
//  LAYOUT / VIEW MODE SWITCHING
// =====================================================================
const viewBtns = document.querySelectorAll(".view-btn");
const MODE_CLASS = {
  "remote-main": "mode-remote-main",
  "local-main":  "mode-local-main",
  "split":       "mode-split",
};

viewBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    viewBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    videoContainer.className = `video-container ${MODE_CLASS[mode] || "mode-remote-main"}`;
  });
});

// =====================================================================
//  MOBILE: CHAT PANEL TOGGLE
// =====================================================================
const chatSidebar = document.querySelector(".chat-sidebar");
const chatHeader  = document.querySelector(".chat-header");

function isMobile() {
  return window.innerWidth <= 768;
}

chatHeader.addEventListener("click", () => {
  if (!isMobile()) return;
  chatSidebar.classList.toggle("collapsed");
});

// 모바일 초기 상태: 채팅 패널 접힌 채로 시작
function initMobileLayout() {
  if (isMobile()) {
    chatSidebar.classList.add("collapsed");
  } else {
    chatSidebar.classList.remove("collapsed");
  }
}

window.addEventListener("resize", initMobileLayout);

// =====================================================================
//  WELCOME FORM
// =====================================================================
const welcomeForm = welcome.querySelector("form");

async function initCall() {
  console.log("1. initCall 완료");

  welcome.style.display = "none";
  call.style.display = "flex";
  await getMedia();

  console.log("2. getMedia 완료");

  makeConnection();

  console.log("3. makeConnection 완료");
}

async function handleWelcomeSubmit(event) {
  event.preventDefault();

  console.log("입장버튼")

  const roomInput     = document.getElementById("roomInput");
  const nicknameInput = document.getElementById("nicknameInput");

  nickname = nicknameInput.value.trim() || "You";
  roomName = roomInput.value.trim();

  myBadge.textContent = `${nickname} (You)`;

  await initCall();
  socket.emit("nickname", nickname);
  socket.emit("join_room", roomName, showRoom);

  roomInput.value = "";
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// =====================================================================
//  CHAT
// =====================================================================
function formatTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/**
 * @param {string}  text    — message text
 * @param {boolean} isOwn   — true if sent by the local user
 * @param {string|null} sender — display name; null = system message
 */
function addMessage(text, isOwn = false, sender = null) {
  const li = document.createElement("li");

  if (!sender) {
    // System event (join / leave)
    li.className = "msg-system";
    li.textContent = text;
  } else {
    li.className = `msg-item${isOwn ? " own" : ""}`;
    li.innerHTML = `
      <div class="msg-meta">
        <span class="msg-sender">${escapeHtml(sender)}</span>
        <span class="msg-time">${formatTime()}</span>
      </div>
      <div class="msg-bubble">${escapeHtml(text)}</div>
    `;
  }

  messageList.appendChild(li);
  messageList.scrollTop = messageList.scrollHeight;

  // 모바일에서 새 메시지 수신 시 채팅 패널 자동 열기
  if (isMobile() && !isOwn && chatSidebar.classList.contains("collapsed")) {
    chatSidebar.classList.remove("collapsed");
  }
}

function handleMessageSubmit(event) {
  event.preventDefault();
  const value = chatInput.value.trim();
  if (!value) return;
  socket.emit("new_message", value, roomName, () => {
    addMessage(value, true, nickname);
  });
  chatInput.value = "";
}

msgForm.addEventListener("submit", handleMessageSubmit);

function showRoom() {
  welcome.style.display = "none";
  call.style.display    = "flex";
  roomLabel.textContent = roomName;
  addMessage(`${nickname} 님이 입장하였습니다!`);
}

// =====================================================================
//  SOCKET EVENTS
// =====================================================================
socket.on("welcome", async (user, newCount) => {
  peerBadge.textContent = user;
  addMessage(`${user} 님이 입장하였습니다!`);

  // WebRTC — initiator side
  myDataChannel = myPeerConnection.createDataChannel("chat");
  myDataChannel.addEventListener("message", e => console.log(e.data));

  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  //console.log("offer 전송 시도, roomName:", roomName);
  console.log("welcome 수신:", user);
  console.log("myPeerConnection:", myPeerConnection); // null이면 여기가 문제
  socket.emit("offer", offer, roomName);
});

socket.on("bye", (left) => {
  addMessage(`${left} 님이 떠났습니다.`);
  peerFace.srcObject = null;
});

socket.on("new_message", (msg) => {
  // Server format: "nickname: message"
  const colonIdx = msg.indexOf(": ");
  if (colonIdx !== -1) {
    const senderName = msg.substring(0, colonIdx);
    const text       = msg.substring(colonIdx + 2);
    peerBadge.textContent = senderName;
    addMessage(text, false, senderName);
  } else {
    addMessage(msg);
  }
});

socket.on("room_change", (rooms) => {
  const roomList = welcome.querySelector(".room-list");
  roomList.innerHTML = "";

  if (rooms.length === 0) {
    const li = document.createElement("li");
    li.className = "room-list-empty";
    li.textContent = "No open rooms";
    roomList.appendChild(li);
    return;
  }

  rooms.forEach(r => {
    const li = document.createElement("li");
    li.textContent = r;
    li.addEventListener("click", () => {
      document.getElementById("roomInput").value = r;
      document.getElementById("nicknameInput").focus();
    });
    roomList.appendChild(li);
  });
});

// =====================================================================
//  WEBRTC SIGNALING
// =====================================================================
socket.on("offer", async (offer) => {
  console.log("offer 수신");
  myPeerConnection.addEventListener("datachannel", event => {
    myDataChannel = event.channel;
    myDataChannel.addEventListener("message", e => console.log(e.data));
  });

  await myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  await myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
});

socket.on("answer", async (answer) => {
  console.log("answer 받음")
  await myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", async (ice) => {
  console.log("ICE 받음:", ice);

  if (ice) {
    await myPeerConnection.addIceCandidate(ice);
  }
});

// =====================================================================
//  RTC CONNECTION
// =====================================================================
function makeConnection() {
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302"
      }
    ]
  });
  myPeerConnection.addEventListener("icecandidate", handleIce);
  // myPeerConnection.addEventListener("icecandidate", (event) => {
  //   if (event.candidate) {
  //       console.log("ICE candidate:", event.candidate);
  //       //handleIce(event.candidate); >> XXXX
  //       socket.emit("ice", event.candidate, roomName);
  //   }
  // });
  
  myPeerConnection.addEventListener("track", handleAddStream); 
  myStream.getTracks().forEach((track) => {
    console.log("ADD TRACK:", track.kind);
    myPeerConnection.addTrack(track, myStream)
  });                                                                                           
}

function handleIce(data) {
  if (data.candidate) {
    socket.emit("ice", data.candidate, roomName);
  }
}

function handleAddStream(event) {
  console.log("상대 track 받음");
  console.log(event.streams);

  peerFace.srcObject = event.streams[0]
  //document.getElementById("peerFace").srcObject = data.stream;
}
