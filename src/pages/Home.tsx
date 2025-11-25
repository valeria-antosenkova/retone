import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import "./style/home.css";

const socket = io("http://localhost:3001");

const Home = () => {
  const navigate = useNavigate();
  const [room, setRoom] = useState("");
  const [user, setUser] = useState("");
  const [joined, setJoined] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const JoinRoom = () => {
    setJoined(true);
    if (!room) return;

    let finalUser = user;
    if (!finalUser) {
      finalUser = "Host";
      setUser(finalUser);
    }
    socket.emit("join-room", room, finalUser);
    navigate(`/session?user=${finalUser}&room=${room}`);
  };
  const StartSession = () => {
    let finalUser = user;
    if (!finalUser) {
      finalUser = "Host";
      setUser(finalUser);
    }
    const newRoomId = Math.random().toString(36).substring(2, 8);
    navigate(`/session?user=${finalUser}&room=${newRoomId}`);
  };
  //<div className="tester-chat"></div>

  return (
    <div className="home-container">
      <div className="menu-form">
        <h1>
          Re-<span className="word-animation">Tone</span>
        </h1>

        <div className="buttons-section">
          <button onClick={StartSession} className="emphasis">
            Open Room
          </button>
          <a onClick={() => setShowDialog(true)} data-dialog>
            Join Room
          </a>
        </div>
      </div>
      <div
        className={showDialog ? "overlay active" : "overlay"}
        id="overlay"
      ></div>
      <dialog id="joining" className={showDialog ? "active" : ""}>
        <input
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          placeholder="  Roomcode"
        />
        <input
          value={user}
          onChange={(e) => setUser(e.target.value)}
          placeholder="  Username"
        />
        <button onClick={JoinRoom}>Join Room</button>
        <a
          href="#"
          className="closeDialog"
          onClick={() => setShowDialog(false)}
        >
          x
        </a>
      </dialog>
    </div>
  );
};

export default Home;
