# Noom

Zoom Clone using NodeJS, WebRTC and WebSockets.

> Nomad Coders의 [Zoom Clone Coding](https://nomadcoders.co/noom) 강의를 따라 구현한 화상 통화 웹 애플리케이션입니다.


https://github.com/user-attachments/assets/cf43ee2b-292d-42bd-8c15-c717b8594959



## 기술 스택

| 분류 | 기술 |
|------|------|
| Runtime | Node.js |
| Framework | Express |
| WebSocket | Socket.IO |
| Real-time Communication | WebRTC |
| Template Engine | Pug |
| Build Tool | Babel, Nodemon |

## 주요 기능

- 룸 이름 입력으로 화상 통화 룸 생성 및 참가
- WebRTC P2P 기반 실시간 영상·음성 통화
- 마이크 음소거 / 해제
- 카메라 켜기 / 끄기
- 카메라 기기 전환 (멀티 카메라 지원)
- DataChannel 기반 채팅

## 구조

```
src/
├── server.js          # Express + Socket.IO 서버
├── views/
│   └── home.pug       # 메인 화면 템플릿
└── public/
    └── js/
        └── app.js     # 클라이언트 WebRTC + Socket.IO 로직
```

## 동작 방식

1. 사용자가 룸 이름을 입력하면 Socket.IO로 서버에 `join_room` 이벤트를 전송
2. 서버는 같은 룸의 다른 사용자에게 `welcome` 이벤트를 전파
3. 먼저 입장한 사용자가 WebRTC Offer를 생성하고 시그널링 서버(Socket.IO)를 통해 전달
4. 상대방이 Answer를 반환하고 ICE Candidate를 교환하여 P2P 연결 수립
5. P2P 연결이 완료되면 영상·음성 스트림이 직접 전달됨

## 실행 방법

```bash
npm install
npm run dev     # 개발 서버 실행 (nodemon)
npm start       # 프로덕션 실행
```

서버 실행 후 `http://localhost:3000` 접속
