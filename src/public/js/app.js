const socket = new WebSocket('ws://${window.location.host}');

//3 event
socket.addEventListener("open", () => {
    console.log("Connected to Server ✅")
}); 

socket.addEventListener("message", (message) => {
    console.log("New message: ", message.data, "from the Server")
});

socket.addEventListener("close", () => {
    console.log("Disconnected from Server ❌");
});

setTimeout(() => {
    socket.send("hello from the browser!");
}, 10000);