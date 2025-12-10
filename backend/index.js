import express from "express";
import http from "http";
import { Server } from "socket.io";
import path, { dirname } from 'path'
import axios from "axios";
const app = express()
const server = http.createServer(app)


const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",

    },
})

const rooms = new Map();

io.on("connection", (socket) => {
    console.log("User Connected! Socket id :: ", socket.id)
    let currentRoom = null;
    let currentUser = null;

    socket.on("join", ({ roomId, userName }) => {
        if (currentRoom) {
            socket.leave(currentRoom)
            rooms.get(currentRoom).delete(currentUser)
            io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom)))
        }

        currentRoom = roomId;
        currentUser = userName;

        socket.join(roomId)

        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set())
        }

        rooms.get(roomId).add(userName)

        io.to(roomId).emit("userJoined", Array.from(rooms.get(currentRoom)))

        //console.log("User joined room: ",roomId)

        // rooms.set(roomId, new Set());
        // io.to(roomId).emit("userJoined", []);

    })

    socket.on("codeChange", ({ roomId, code }) => {
        socket.to(roomId).emit("codeUpdate", code)
    })

    socket.on('leaveRoom', () => {
        if (currentRoom && currentUser) {
            rooms.get(currentRoom).delete(currentUser)
            io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom)))

            socket.leave(currentRoom)
            currentRoom = null
            currentUser = null

        }
        console.log("User is Disconnected")
    })

    socket.on('typing', ({ roomId, userName }) => {
        socket.to(roomId).emit('userTyping', userName)
    })

    socket.on('languageChange', ({ roomId, language }) => {
        io.to(roomId).emit('languageUpdate', language)
    })

    socket.on("compileCode", async ({ code, roomId, language, version }) => {
        const VALID_RUNTIMES = {
        "java": "15.0.2",
        "python": "3.10.0",
        "cpp": "10.2.0",
        "javascript": "18.15.0",
        };

        // https://emkc.org/api/v2/piston/runtimes
        //  if thecode does not compile then run the above link in the brorswer and 
        // then cross check the version of each language.


        if (!version || version === "*") {
            version = VALID_RUNTIMES[language] || version;
        }

        if (rooms.has(roomId)) {
            const room = rooms.get(roomId);
            const response = await axios.post(
                "https://emkc.org/api/v2/piston/execute",
                {
                    language,
                    version,
                    files: [
                        {
                            content: code,
                        },
                    ],
                }
            );

            room.output = response.data.run.output;
            io.to(roomId).emit("codeResponse", response.data);
        }
    });


    socket.on('disconnect', () => {
        if (currentRoom && currentUser) {
            rooms.get(currentRoom).delete(currentUser)
            io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom)))
        }
        console.log("User is Disconnected")
    })


})

const __dirname = path.resolve()
app.use(express.static(path.join(__dirname, "frontend", "dist")));


app.use("/", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
})



server.listen(4500, () => {
    console.log("Server is connected at port 4500")
})

