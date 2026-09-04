# Noom

Zoom Clone using NodeJS, WebRTC and WebSockets.

> Nomad Coders의 [Zoom Clone Coding](https://nomadcoders.co/noom) 강의를 따라 구현한 화상 통화 웹 애플리케이션입니다.

<img width="1688" height="1057" alt="Noom_v2" src="https://github.com/user-attachments/assets/1c2e2b25-b04a-4345-ae1a-dd3f9fd2eaee" />



## v2 주요 변경 사항

기존 WebRTC 화상 통화 기능을 기반으로 사용자 경험과 네트워크 연결 환경을 개선했습니다.

- 닉네임 입력 기능 추가
- 열린 룸 목록 실시간 표시
- 채팅 + 영상통화 UI 통합
- 영상 보기 모드 추가
  - 상대방 영상 중심
  - 내 영상 중심
  - 50:50 분할
- TURN 서버 연동
- 서로 다른 네트워크 환경에서의 WebRTC 연결 지원
- `.env`를 이용한 TURN 서버 정보 관리
- Docker 실행 환경 구성
- Railway 클라우드 배포 지원


## 기술 스택

| 분류 | 기술 |
|------|------|
| Runtime | Node.js |
| Framework | Express |
| WebSocket | Socket.IO |
| Real-time Communication | WebRTC |
| Template Engine | Pug |
| Build Tool | Babel, Nodemon |
| Deployment | Docker, Railway |

## 주요 기능

- 룸 이름 + 닉네임 입력으로 화상 통화 룸 생성 및 참가
- 현재 열려 있는 룸 목록 실시간 표시
- WebRTC P2P 기반 실시간 영상·음성 통화
- TURN 서버 연동으로 서로 다른 네트워크 환경에서도 연결 지원
- 마이크 음소거 / 해제
- 카메라 켜기 / 끄기
- 카메라 기기 전환 (멀티 카메라 지원)
- 영상 보기 모드 전환
  - 상대방 영상 중심
  - 내 영상 중심
  - 50:50 분할
- Socket.IO 기반 실시간 채팅

## 프로젝트 구조

```text
src/
├── server.js              # Express + Socket.IO 서버 (TURN 환경변수 전달 포함)
├── views/
│   └── home.pug           # 입장 화면 + 화상 통화·채팅 화면 템플릿
└── public/
    ├── css/
    │   └── style.css      # 전체 스타일
    └── js/
        └── app.js         # 클라이언트 WebRTC + Socket.IO + 채팅 로직
```

## 동작 방식

1. 사용자가 룸 이름과 닉네임을 입력하면 Socket.IO로 `join_room` 이벤트를 전송합니다.
2. 서버는 같은 룸의 다른 사용자에게 `welcome` 이벤트를 전파하고, 전체 사용자에게 열린 룸 목록을 갱신합니다.
3. 먼저 입장한 사용자가 WebRTC `Offer`를 생성하고 Socket.IO 시그널링 서버를 통해 상대방에게 전달합니다.
4. 상대방은 `Offer`를 받아 `Answer`를 생성하고 다시 시그널링 서버를 통해 전달합니다.
5. 양쪽 브라우저는 `ICE Candidate`를 교환하여 서로 연결 가능한 네트워크 경로를 탐색합니다.
6. 직접 P2P 연결이 가능한 경우 브라우저 간 WebRTC 연결을 수립합니다.
7. 서로 다른 네트워크 환경에서 직접 연결이 어려운 경우 TURN 서버를 통해 미디어를 릴레이합니다.
8. WebRTC 연결이 완료되면 영상과 음성 스트림이 상대방에게 전달됩니다.
9. Socket.IO를 통해 실시간 채팅 메시지를 주고받습니다.
10. 룸 입장 및 퇴장 시 Socket.IO를 통해 룸 상태와 열린 룸 목록을 실시간으로 동기화합니다.

### WebRTC 연결 구조

```text
┌─────────────────┐
│   사용자 A        │
│  Browser        │
└────────┬────────┘
         │
         │ Socket.IO
         │ Offer / Answer
         │ ICE Candidate
         ↓
┌──────────────────┐
│ Signaling Server │
│ Node.js +        │
│ Socket.IO        │
└────────┬─────────┘
         │
         │ Signaling
         ↓
┌─────────────────┐
│   사용자 B        │
│  Browser        │
└─────────────────┘

        WebRTC
   ┌───────────────┐
   │               │
   ▼               ▼
사용자 A ◀──────▶ 사용자 B
        P2P 연결
```
        
### TURN 서버를 사용하는 경우
```text
사용자 A Browser
       │
       │ WebRTC
       │
       ├────────────── 직접 P2P 연결 ────────────────┐
       │                                           │
       │                                           ▼
       │                                      사용자 B
       │
       └──── 직접 연결 실패
                    │
                    ▼
              TURN Server
                    │
                    ▼
                사용자 B
```

### 영상 및 채팅 데이터 흐름
```text
카메라 / 마이크
       │
       ▼
getUserMedia()
       │
       ▼
MediaStream
       │
       ▼
RTCPeerConnection
       │
       ├── Video Track ────────▶ 상대방 영상
       │
       ├── Audio Track ────────▶ 상대방 음성
       │
       └── DataChannel ────────▶ 실시간 채팅
       │
       └── Audio Track ────────▶ 상대방 음성

 ※ 채팅은 위 미디어 스트림과 별도로 Socket.IO 시그널링 채널을 통해 전송됩니다.
```

## TURN 서버 설정

TURN 서버를 사용하려면 프로젝트 루트에 `.env` 파일을 생성하고 다음 환경변수를 설정합니다.

```env
TURN_URL=turn:your-turn-server:3478
TURN_USERNAME=your-username
TURN_CREDENTIAL=your-credential
```

환경변수는 ```server.js```에서 ```dotenv```를 통해 불러온 후 Pug 템플릿에 전달합니다

```text
.env
 ↓
server.js
 ↓
home.pug
 ↓
window.turnConfig
 ↓
app.js
 ↓
RTCPeerConnection
 ↓
iceServers
```

TURN 서버가 설정되어 있지 않은 경우에도(`window.turnConfig`가 빈 값이어도) `RTCPeerConnection`은 정상적으로 생성되며 STUN 서버만으로 연결을 시도합니다. 다만 서로 다른 네트워크(NAT) 환경에서는 직접 연결이 실패할 수 있어 TURN 서버 설정을 권장합니다.


## 실행 방법

### 로컬 실행

```bash
npm install
npm run dev
```

또는 프로덕션 환경에서는:
```bash
npm start
```

서버 실행 후 `http://localhost:3000` 접속

### Docker 실행

Docker 이미지를 생성합니다.

```bash
docker build -t noom .
```

```.env``` 파일의 환경변수를 포함하여 컨테이너를 실행합니다.
```bash
docker run -p 3000:3000 --env-file .env noom
```

서버 실행 후 `http://localhost:3000` 접속

## 배포

Railway는 저장소에 포함된 `Dockerfile`을 자동으로 감지해 빌드/배포합니다. Railway CLI를 사용한다면 다음과 같이 배포할 수 있습니다.

```bash
railway login
railway link
railway up
```

Railway 프로젝트의 환경변수에 다음 값을 등록합니다.

```text
TURN_URL
TURN_USERNAME
TURN_CREDENTIAL
```

배포가 완료되면 Railway에서 제공하는 도메인을 통해 애플리케이션에 접속할 수 있습니다.

## 버전 이력

| 버전 | 내용 |
|------|------|
| v2.0 | 닉네임 입력 및 열린 룸 목록 · 채팅 UI 통합 · TURN 서버 연동 · 영상 보기 모드 전환 · .env 설정 · Docker · Railway 배포 |
| v1.0 | 룸 기반 화상 통화 · WebRTC P2P · Offer/Answer/ICE 시그널링 · Socket.IO 서버 · 마이크/카메라 제어 및 기기 전환 · Socket.IO 채팅 |
